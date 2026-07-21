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
    const { client_id, batch_size = 50 } = await req.json();

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const BATCH_SIZE = Math.min(batch_size, 100);
    let totalProcessed = 0;
    let batchCount = 0;

    console.log(`Starting batch embedding generation for client ${client_id}`);

    while (true) {
      // 1. Obtener las transacciones
      const { data: transactions, error: fetchError } = await supabase
        .from('customers_transactions')
        .select('id, brand, model, category')
        .eq('client_id', client_id)
        .is('vehicle_embedding', null)
        .limit(BATCH_SIZE);

      if (fetchError) {
        console.error('Error fetching transactions:', fetchError);
        throw fetchError;
      }

      if (!transactions || transactions.length === 0) {
        console.log('No more transactions to process');
        break;
      }

      // 2. Obtener todas las descripciones de categorías de una vez
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('name, description');

      if (catError) {
        console.error('Error fetching categories:', catError);
        throw catError;
      }

      // 3. Mapeo rápido para buscar descripción por nombre de categoría
      const categoryMap = new Map(
        (categories || []).map((c) => [c.name.toLowerCase(), c.description])
      );

      // 4. Armar textos para embeddings
      const texts = transactions.map((t) => {
        const brand = t.brand?.trim() || 'sin marca';
        const model = t.model?.trim() || 'sin modelo';
        const category = t.category?.trim().toLowerCase() || '';
        const categoryDesc = categoryMap.get(category) || '';
        return `Modelo: ${model}. ${categoryDesc} Marca: ${brand}. `;
      });

      // 5. Generar embeddings
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });

      // 6. Guardar resultados en la tabla
      const updates = [];
      for (let i = 0; i < transactions.length; i++) {
        updates.push(
          supabase
            .from('customers_transactions')
            .update({ vehicle_embedding: embeddingResponse.data[i].embedding })
            .eq('id', transactions[i].id)
        );
      }

      await Promise.all(updates);
      totalProcessed += transactions.length;
      batchCount++;

      console.log(
        `Batch ${batchCount} completed. Total processed: ${totalProcessed}`
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `✅ Embedding generation completed. Total processed: ${totalProcessed}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        batches: batchCount,
        client_id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in batch embedding generation:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
