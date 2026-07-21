import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { openai } from '../_shared/openai-client.ts';
import { supabase } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      brand,
      model,
      category,
      client_id,
      limit = 100,
      similarity_threshold = 0.7,
      target_audience = { buyers: true, sellers: false },
    } = await req.json();

    console.log(`Brand: ${brand}, Model: ${model}, Category: ${category}`);
    console.log(`Client ID: ${client_id}`);
    console.log(`Target audience:`, target_audience);

    // Validate required parameters
    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!brand || !model) {
      return new Response(
        JSON.stringify({ error: 'brand and model are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (
      !target_audience ||
      (!target_audience.buyers && !target_audience.sellers)
    ) {
      return new Response(
        JSON.stringify({
          error:
            'At least one target audience (buyers or sellers) must be selected',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get category description if category is provided
    let categoryDescription = '';
    if (category) {
      const { data: categoryData, error: catError } = await supabase
        .from('categories')
        .select('description')
        .eq('name', category)
        .single();

      if (!catError && categoryData) {
        categoryDescription = categoryData.description || '';
      }
    }

    // Create structured text for embedding with category description (same format as batch function)
    const brand_clean = brand?.trim() || 'sin marca';
    const model_clean = model?.trim() || 'sin modelo';
    const vehicleText = `Modelo: ${model_clean}. ${categoryDescription} Marca: ${brand_clean}. `;

    console.log(`Generating embedding for: "${vehicleText}"`);
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: vehicleText,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Use the unified RPC function to get similar customers
    const { data: similarCustomers, error: rpcError } = await supabase.rpc(
      'find_similar_customers',
      {
        query_embedding: queryEmbedding,
        p_client_id: client_id,
        p_similarity_threshold: similarity_threshold,
        p_max_results: limit,
        p_include_buyers: target_audience.buyers,
        p_include_sellers: target_audience.sellers,
      }
    );

    if (rpcError) {
      console.error('Error in embedding search:', rpcError);
      throw new Error(`Embedding search failed: ${rpcError.message}`);
    }

    const allResults = similarCustomers || [];
    console.log(`Total results found: ${allResults.length}`);

    // Get customer details
    if (allResults.length > 0) {
      const customerIds = [
        ...new Set(allResults.map((r: any) => r.customer_id)),
      ];
      console.log(
        `Fetching details for ${customerIds.length} unique customers...`
      );

      const { data: customersDetails, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, full_name, email, rut')
        .in('id', customerIds);

      if (customerError) {
        console.error('Error fetching customer details:', customerError);
        throw new Error(
          `Failed to fetch customer details: ${customerError.message}`
        );
      }

      // Combine transaction data with customer details
      const enrichedResults = allResults
        .map((result: any) => {
          const customerDetail = customersDetails?.find(
            (c: any) => c.id === result.customer_id
          );

          if (!customerDetail || !customerDetail.email) {
            return null;
          }

          return {
            id: result.customer_id,

            full_name:
              customerDetail.full_name ||
              `${customerDetail.first_name} ${customerDetail.last_name}`,
            email: customerDetail.email,
            rut: customerDetail.rut || 'RUT no disponible',
            similarity: result.similarity,
            transaction_type: result.transaction_type,
            last_purchase: {
              brand: result.brand,
              model: result.model,
              year: result.year,
              price: result.price,
              category: result.category,
            },
          };
        })
        .filter(Boolean);

      return new Response(
        JSON.stringify({
          customers: enrichedResults,
          total_results: enrichedResults.length,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        customers: [],
        total_results: 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in find-similar-customers:', error);
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
