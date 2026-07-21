import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { openai } from '../_shared/openai-client.ts';
import { supabase } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Get full client info (name, contact, seo, domain, location)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, contact, seo, domain, location, currency')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get dealerships (sucursales) for location data
    const { data: dealerships } = await supabase
      .from('dealerships')
      .select('name, address, city, state')
      .eq('client_id', client_id);

    const locations = (dealerships || [])
      .map(d => [d.city, d.state, d.address].filter(Boolean).join(', '))
      .filter(Boolean);

    // 3. Get vehicle inventory summary
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select(`
        brand:brand_id(name),
        model:model_id(name),
        year,
        price,
        condition:condition_id(name),
        fuel_type:fuel_type_id(name),
        transmission,
        category:category_id(name)
      `)
      .eq('client_id', client_id)
      .eq('show_in_stock', true)
      .limit(300);

    // Aggregate vehicle data
    const brandCounts: Record<string, number> = {};
    const modelCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const fuelTypes = new Set<string>();
    const transmissions = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = 0;
    const totalVehicles = vehicles?.length || 0;
    const years = new Set<number>();
    const conditions = new Set<string>();

    for (const v of vehicles || []) {
      const brandName = (v.brand as any)?.name;
      const modelName = (v.model as any)?.name;
      const condName = (v.condition as any)?.name;
      const fuelName = (v.fuel_type as any)?.name;
      const catName = (v.category as any)?.name;
      if (brandName) brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
      if (modelName) modelCounts[modelName] = (modelCounts[modelName] || 0) + 1;
      if (catName) categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
      if (fuelName) fuelTypes.add(fuelName);
      if (v.transmission) transmissions.add(v.transmission);
      if (v.price) {
        minPrice = Math.min(minPrice, v.price);
        maxPrice = Math.max(maxPrice, v.price);
      }
      if (v.year) years.add(v.year);
      if (condName) conditions.add(condName);
    }

    const topBrands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => `${name} (${count})`);

    const topModels = Object.entries(modelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => `${name} (${count})`);

    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => `${name} (${count})`);

    const yearRange = years.size > 0
      ? `${Math.min(...years)} - ${Math.max(...years)}`
      : 'N/A';

    const priceRange = minPrice < Infinity
      ? `$${minPrice.toLocaleString('es-CL')} - $${maxPrice.toLocaleString('es-CL')} CLP`
      : 'N/A';

    // 4. Build context for GPT
    const contact = (client as any).contact || {};
    const currency = (client as any).currency || 'CLP';
    const country = currency === 'CLP' ? 'Chile' : currency === 'USD' ? 'Estados Unidos' : 'Latinoamérica';

    // Extract city from dealerships or address
    const cities = (dealerships || [])
      .map(d => d.city || d.state)
      .filter(Boolean);
    const uniqueCities = [...new Set(cities)];

    // Top 3 brands only (names, no counts)
    const top3Brands = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    // Try to extract city from address if no dealerships
    let mainCity = uniqueCities[0] || '';
    if (!mainCity && contact.address) {
      // Try to get city-like info from address string
      const addressParts = (contact.address as string).split(',').map((s: string) => s.trim());
      if (addressParts.length >= 2) mainCity = addressParts[addressParts.length - 2] || '';
    }

    const businessContext = `
Nombre: ${client.name}
Web: ${(client as any).domain || 'sin dominio'}
Dirección: ${contact.address || 'no especificada'}
Ciudad: ${mainCity || 'no especificada'}
Sucursales: ${uniqueCities.length > 1 ? uniqueCities.join(', ') : 'una sede'}
País: ${country}
Multimarca: sí
Vende: ${[...conditions].join(' y ').toLowerCase() || 'usados'}
`.trim();

    // 5. Call GPT-4o for quality
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `Eres un SEO strategist senior. Generas meta tags para automotoras que REALMENTE posicionan en Google.

CONTEXTO: Esto se usa en <title>, <meta description> y <meta keywords> del sitio web de una automotora.

═══ TITLE (50-60 chars) ═══
Nombre del negocio + propuesta central + ciudad.
✅ "Salazar Automotora | Autos Usados con Garantía en Temuco"
✅ "Kavak Chile | Compra y Vende tu Auto Seminuevo"
✅ "Rossi Autos – Tu Automotora de Confianza en Santiago"
❌ NUNCA listes marcas en el título
❌ NUNCA pongas "Descubre", "Bienvenido", "Los Mejores" — es relleno

═══ DESCRIPTION (140-155 chars) ═══
Este es el texto que aparece en Google debajo del título. Es tu ÚNICO chance de convencer al usuario de hacer click. Escríbelo como copywriter, no como robot.

FÓRMULA: [Beneficio concreto] + [Por qué nosotros] + [Acción clara]

✅ "Autos usados seleccionados con garantía mecánica y financiamiento directo. Más de 10 años en Temuco. Agenda tu visita hoy."
✅ "Tu próximo auto está en Rossi. Financiamiento al instante, garantía incluida y los mejores precios de Santiago. Cotiza ahora."
✅ "Compra tu auto usado con confianza. Financiamiento flexible, garantía real y atención personalizada en Viña del Mar."

❌ PROHIBIDO: "Descubre", "Contáctanos", "Explora", "Conoce" — son verbos vacíos que nadie clickea
❌ PROHIBIDO: Listar marcas ("Marcas como Toyota, Hyundai y Suzuki") — es spam, no es lo que la gente busca
❌ PROHIBIDO: Mencionar cantidades de stock — cambian cada día
❌ PROHIBIDO: Frases genéricas sin información real ("La mejor automotora", "Gran variedad")

La description debe sonar como un negocio real, confiable, que lleva años. NO como un template.

═══ KEYWORDS (10-12 frases) ═══
Cada keyword = algo que un comprador REAL escribe en Google.

Incluir:
- "[nombre negocio]"
- "automotora en [ciudad]" / "autos usados [ciudad]"
- "comprar auto usado", "venta de autos usados"
- "financiamiento automotriz", "crédito automotor"
- "auto seminuevo", "autos con garantía"
- 1-2 long-tail: "donde comprar auto usado en [ciudad]"
- Si hay marcas fuertes, máximo 1-2: "[marca] usado"

❌ NUNCA: keywords de una sola palabra ("autos", "vehículos", "Chile")
❌ NUNCA: keywords que nadie busca ("ALFA ROMEO HYUNDAI ACURA")

═══ FORMATO ═══
Solo JSON:
{"title":"...","description":"...","keywords":["...","..."]}`
        },
        {
          role: 'user',
          content: businessContext
        }
      ],
    });

    const responseText = completion.choices[0]?.message?.content || '';

    // Parse JSON response
    let seoResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      seoResult = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('[generate-seo] Failed to parse GPT response:', responseText);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', raw: responseText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        seo: {
          title: seoResult.title || '',
          description: seoResult.description || '',
          keywords: Array.isArray(seoResult.keywords) ? seoResult.keywords : [],
        },
        context: {
          totalVehicles,
          topBrands: topBrands.slice(0, 5),
          priceRange,
          locations: locations.slice(0, 3),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[generate-seo] Error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
