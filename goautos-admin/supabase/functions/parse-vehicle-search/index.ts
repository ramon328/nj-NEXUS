import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts';
import { reportError } from '../_shared/error-reporter.ts';

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedFilters {
  brand?: string;
  model?: string;
  category?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMin?: number;
  mileageMax?: number;
  fuelType?: string;
  transmission?: string;
  color?: string;
  condition?: string;
  features?: string[];
  searchTerms?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, availableFilters } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ filters: {}, searchTerms: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Si el query es muy corto, no usar IA
    if (query.trim().length < 3) {
      return new Response(
        JSON.stringify({ filters: {}, searchTerms: [query.trim()] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Eres un parser de búsquedas de vehículos. Tu trabajo es extraer filtros estructurados de consultas en lenguaje natural.

REGLAS IMPORTANTES:
1. SOLO extrae información que esté EXPLÍCITAMENTE mencionada en la consulta
2. NO inventes ni asumas información que no está en la consulta
3. Para marcas/modelos, usa coincidencia flexible (ej: "alfa" → "Alfa Romeo", "bmw" → "BMW")
4. KILOMETRAJE - MUY IMPORTANTE:
   - Formato chileno con punto: "30.000km" = 30000
   - Sin punto: "10km" = 10 (NO multiplicar, es literal)
   - "50km" = 50, "100km" = 100, "1000km" = 1000
   - SOLO multiplicar por 1000 si dice "mil": "30 mil km" = 30000
5. Precios en millones chilenos: "15 millones" = 15000000, "bajo 20 palos" = max 20000000
6. "con menos de X km" = mileageMax: X (usar el número exacto)
7. "más de X km" = mileageMin: X
8. "barato/económico" = priceMax: 15000000
9. "nuevo/reciente" = yearMin: año actual - 3
10. Categorías válidas: SUV, Sedan, Hatchback, Pickup, Van, Coupe, Wagon
11. Transmisión: "automático/automática" o "manual/mecánico"
12. Combustible: "bencina/gasolina", "diesel/petrolero", "híbrido", "eléctrico"

MARCAS CONOCIDAS (usar nombres exactos):
${availableFilters?.brands?.map((b: any) => b.name).join(', ') || 'Toyota, Honda, Nissan, Mazda, Hyundai, Kia, Chevrolet, Ford, Volkswagen, Audi, BMW, Mercedes-Benz, Jeep, Suzuki, Mitsubishi, Subaru, Alfa Romeo, Peugeot, MG, BYD, Chery, Haval, JAC'}

CATEGORÍAS DISPONIBLES:
${availableFilters?.categories?.map((c: any) => c.name).join(', ') || 'SUV, Sedan, Hatchback, Pickup, Van, Coupe, Wagon'}

RESPONDE SOLO CON UN JSON VÁLIDO con esta estructura:
{
  "brand": "nombre exacto de marca o null",
  "model": "nombre de modelo o null",
  "category": "categoría o null",
  "yearMin": número o null,
  "yearMax": número o null,
  "priceMin": número o null,
  "priceMax": número o null,
  "mileageMin": número o null,
  "mileageMax": número o null,
  "fuelType": "tipo combustible o null",
  "transmission": "Automático" o "Manual" o null,
  "color": "color o null",
  "features": ["característica1", ...] o [],
  "searchTerms": ["términos para búsqueda de texto libre"]
}

Ejemplos:
- "alfa romeo con menos de 30.000km" → {"brand": "Alfa Romeo", "mileageMax": 30000, "searchTerms": []}
- "alfa romeo con menos de 10km" → {"brand": "Alfa Romeo", "mileageMax": 10, "searchTerms": []}
- "auto con menos de 50km" → {"mileageMax": 50, "searchTerms": []}
- "suv toyota bajo 20 millones" → {"brand": "Toyota", "category": "SUV", "priceMax": 20000000, "searchTerms": []}
- "camioneta automática 2020 o más nuevo" → {"category": "SUV", "transmission": "Automático", "yearMin": 2020, "searchTerms": ["camioneta"]}
- "bmw serie 3" → {"brand": "BMW", "searchTerms": ["serie 3"]}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Consulta de búsqueda: "${query}"` }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';

    let parsedFilters: ParsedFilters;
    try {
      parsedFilters = JSON.parse(content);
    } catch {
      parsedFilters = { searchTerms: [query] };
    }

    // Limpiar valores null
    const cleanedFilters: ParsedFilters = {};
    for (const [key, value] of Object.entries(parsedFilters)) {
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value) && value.length === 0) continue;
        (cleanedFilters as any)[key] = value;
      }
    }

    console.log(`🔍 Query: "${query}" → Filters:`, JSON.stringify(cleanedFilters));

    return new Response(
      JSON.stringify({
        filters: cleanedFilters,
        originalQuery: query
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing search:', error);
    await reportError({ functionName: 'parse-vehicle-search', error });
    return new Response(
      JSON.stringify({
        filters: {},
        searchTerms: [],
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
