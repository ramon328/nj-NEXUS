import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { openai } from '../_shared/openai-client.ts';
import { supabase } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface Vehicle {
  brand: string;
  model: string;
  year?: number;
}

interface CategorizedVehicle extends Vehicle {
  category: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { vehicles, client_id } = await req.json();

    if (!vehicles || !Array.isArray(vehicles) || vehicles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'vehicles array is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `Categorizing ${vehicles.length} vehicles for client ${client_id}`
    );

    // Obtener categorías disponibles de la base de datos
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('name')
      .order('name');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
    }

    const availableCategories: string[] =
      categories
        ?.map((c: any) => c.name)
        .filter((name: string) => Boolean(name)) || [];

    if (availableCategories.length === 0) {
      throw new Error('No categories found in database');
    }

    console.log(`Available categories: ${availableCategories.join(', ')}`);

    // Procesar vehículos en batches para evitar límites de tokens
    const BATCH_SIZE = 50;
    const batches: Vehicle[][] = [];
    for (let i = 0; i < vehicles.length; i += BATCH_SIZE) {
      batches.push(vehicles.slice(i, i + BATCH_SIZE));
    }

    const categorizedVehicles: CategorizedVehicle[] = [];

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(
        `Processing batch ${batchIndex + 1}/${batches.length} with ${
          batch.length
        } vehicles`
      );

      // Crear prompt para GPT
      const vehiclesList = batch
        .map(
          (v: Vehicle, idx: number) =>
            `${idx + 1}. ${v.brand} ${v.model}${v.year ? ` (${v.year})` : ''}`
        )
        .join('\n');

      const prompt = `Eres un experto en clasificación de vehículos chileno. Clasifica cada vehículo usando ÚNICAMENTE las categorías exactas de nuestra base de datos.

CATEGORÍAS DISPONIBLES (usa exactamente estos nombres, son los únicos válidos):
${availableCategories.map((cat: string) => `"${cat}"`).join(', ')}

VEHÍCULOS A CATEGORIZAR:
${vehiclesList}

REGLAS ESTRICTAS:
1. SOLO puedes usar las categorías listadas arriba
2. Si un vehículo es "convertible", clasifícalo como "coupe"
3. Si un vehículo es "cabriolet", clasifícalo como "coupe"
4. Si no estás seguro, usa la categoría más cercana de la lista
5. NUNCA inventes categorías nuevas
6. Responde SOLO en JSON, sin explicaciones

EJEMPLOS DE MAPEO ESPECIAL:
- BMW Z4 Convertible → "coupe"
- Mercedes SLK Cabriolet → "coupe"
- Jeep Wrangler → "suv"
- Toyota Hilux → "pickup"

Responde en JSON:
{
  "categorizations": [
    {"vehicle_index": 1, "category": "categoria_exacta"},
    {"vehicle_index": 2, "category": "categoria_exacta"}
  ]
}`;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4.1-nano',
          messages: [
            {
              role: 'system',
              content: `Eres un clasificador de vehículos experto. SOLO puedes usar estas categorías: ${availableCategories.join(
                ', '
              )}. Responde únicamente en JSON válido.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.0, // Temperatura 0 para respuestas más consistentes
          max_tokens: 2000,
        });

        const responseContent = response.choices[0]?.message?.content?.trim();

        if (!responseContent) {
          throw new Error('Empty response from GPT');
        }

        console.log(
          `GPT Response for batch ${batchIndex + 1}:`,
          responseContent
        );

        // Parsear respuesta JSON
        let gptResult: any;
        try {
          gptResult = JSON.parse(responseContent);
        } catch (parseError) {
          console.error(
            'Failed to parse GPT response as JSON:',
            responseContent
          );
          throw new Error('Invalid JSON response from GPT');
        }

        if (
          !gptResult.categorizations ||
          !Array.isArray(gptResult.categorizations)
        ) {
          throw new Error('Invalid response structure from GPT');
        }

        // Función para encontrar la categoría más similar (fallback)
        const findBestCategoryMatch = (invalidCategory: string): string => {
          const lowerCategory = invalidCategory.toLowerCase();

          // Mapeo manual para casos comunes
          const categoryMappings: { [key: string]: string } = {
            convertible: 'coupe',
            cabriolet: 'coupe',
            cabrio: 'coupe',
            roadster: 'coupe',
            crossover: 'suv',
            cuv: 'suv',
            mpv: 'suv',
            minivan: 'suv',
            van: 'suv',
            commercial: 'pickup',
            truck: 'pickup',
            sport: 'coupe',
            luxury: 'sedan',
            compact: 'hatchback',
            subcompact: 'hatchback',
          };

          // Buscar en mapeo manual primero
          for (const [key, value] of Object.entries(categoryMappings)) {
            if (lowerCategory.includes(key)) {
              const matchedCategory = availableCategories.find(
                (cat) => cat.toLowerCase() === value.toLowerCase()
              );
              if (matchedCategory) return matchedCategory;
            }
          }

          // Si no encuentra, buscar similitud parcial
          for (const availableCategory of availableCategories) {
            if (
              availableCategory.toLowerCase().includes(lowerCategory) ||
              lowerCategory.includes(availableCategory.toLowerCase())
            ) {
              return availableCategory;
            }
          }

          // Último recurso: primera categoría disponible
          return availableCategories[0];
        };

        // Procesar resultados del batch con validación estricta
        for (const categorization of gptResult.categorizations) {
          const vehicleIndex = categorization.vehicle_index - 1;

          if (vehicleIndex < 0 || vehicleIndex >= batch.length) {
            console.warn(
              `Invalid vehicle index ${categorization.vehicle_index} in batch ${
                batchIndex + 1
              }`
            );
            continue;
          }

          const vehicle = batch[vehicleIndex];
          let finalCategory = categorization.category;

          // Validación estricta: SIEMPRE usar una categoría válida
          if (!availableCategories.includes(finalCategory)) {
            console.error(
              `Category "${finalCategory}" not found in available categories. Using smart fallback.`
            );
            finalCategory = findBestCategoryMatch(finalCategory);
            console.log(
              `Mapped "${categorization.category}" → "${finalCategory}"`
            );
          }

          categorizedVehicles.push({
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            category: finalCategory,
          });
        }

        // Verificar que todos los vehículos del batch fueron procesados
        const processedCount = gptResult.categorizations.length;
        const expectedCount = batch.length;

        if (processedCount < expectedCount) {
          console.warn(
            `Missing categorizations: expected ${expectedCount}, got ${processedCount}. Adding fallbacks.`
          );

          // Agregar vehículos faltantes con categoría por defecto
          const processedIndices = gptResult.categorizations.map(
            (c: any) => c.vehicle_index - 1
          );
          for (let i = 0; i < batch.length; i++) {
            if (!processedIndices.includes(i)) {
              categorizedVehicles.push({
                brand: batch[i].brand,
                model: batch[i].model,
                year: batch[i].year,
                category: availableCategories[0], // Primera categoría como fallback
              });
            }
          }
        }

        // Pequeña pausa entre batches para evitar rate limits
        if (batchIndex < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (batchError) {
        console.error(`Error processing batch ${batchIndex + 1}:`, batchError);

        // Si falla un batch, agregar vehículos con categoría por defecto
        for (const vehicle of batch) {
          categorizedVehicles.push({
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            category: availableCategories[0], // Primera categoría como fallback
          });
        }
      }
    }

    console.log(
      `✅ Categorization completed. ${categorizedVehicles.length} vehicles categorized`
    );

    return new Response(
      JSON.stringify({
        success: true,
        categorized_vehicles: categorizedVehicles,
        total_processed: categorizedVehicles.length,
        available_categories: availableCategories,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in categorize-vehicles:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
