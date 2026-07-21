import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { openai } from '../_shared/openai-client.ts';
import { supabase } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transaction_id, brand, model, year, price } = await req.json();

    if (!transaction_id || !brand || !model || !year || !price) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create descriptive text for the vehicle
    const vehicleText = `${brand} ${model} año ${year} precio ${price}`;

    console.log(`Generating embedding for: ${vehicleText}`);

    // Generate embedding using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: vehicleText,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Update the transaction with the generated embedding
    const { error: updateError } = await supabase
      .from('customers_transactions')
      .update({ vehicle_embedding: embedding })
      .eq('id', transaction_id);

    if (updateError) {
      console.error('Error updating embedding:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update embedding' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `Successfully generated embedding for transaction ${transaction_id}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id,
        vehicle_text: vehicleText,
        embedding_length: embedding.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-vehicle-embedding:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
