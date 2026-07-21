import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { reportError } from '../_shared/error-reporter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Syncs internal sales (vehicles_sales) into customers_transactions
 * so Marketing IA can find similar customers based on real dealership data.
 *
 * Syncs ALL sales regardless of status (pending, approved, rejected) —
 * any sale record means a customer showed interest in that type of vehicle.
 *
 * Each synced sale gets code = 'sale-{vehicles_sales.id}' to prevent duplicates.
 * After sync, call generate-embeddings-batch to create vector embeddings.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { client_id } = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Syncing internal sales for client ${client_id}`);

    // 1. Get vehicle IDs belonging to this client
    const { data: clientVehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('client_id', client_id);

    if (vehiclesError) {
      console.error('Error fetching client vehicles:', vehiclesError);
      throw vehiclesError;
    }

    if (!clientVehicles || clientVehicles.length === 0) {
      console.log('No vehicles found for client');
      return new Response(
        JSON.stringify({ success: true, synced: 0, skipped: 0, message: 'No vehicles found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vehicleIds = clientVehicles.map((v) => v.id);
    console.log(`Found ${vehicleIds.length} vehicles for client ${client_id}`);

    // 2. Get ALL sales for these vehicles (any status)
    const { data: sales, error: salesError } = await supabase
      .from('vehicles_sales')
      .select(`
        id,
        sale_price,
        customer_id,
        vehicle_id,
        vehicle:vehicles!vehicles_sales_vehicle_id_fkey (
          year,
          brand:brands ( name ),
          model:models ( name ),
          category:categories ( name )
        )
      `)
      .in('vehicle_id', vehicleIds);

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      throw salesError;
    }

    if (!sales || sales.length === 0) {
      console.log('No sales found');
      return new Response(
        JSON.stringify({ success: true, synced: 0, skipped: 0, message: 'No sales to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${sales.length} sales for client ${client_id}`);

    // 3. Check which sales are already synced
    const saleCodes = sales.map((s) => `sale-${s.id}`);
    const { data: existing, error: existingError } = await supabase
      .from('customers_transactions')
      .select('code')
      .in('code', saleCodes);

    if (existingError) {
      console.error('Error checking existing transactions:', existingError);
      throw existingError;
    }

    const existingCodes = new Set((existing || []).map((e) => e.code));

    // 4. Build new transactions to insert
    const newTransactions = sales
      .filter((s) => !existingCodes.has(`sale-${s.id}`))
      .map((s) => ({
        code: `sale-${s.id}`,
        buyer_id: s.customer_id,
        seller_id: null,
        client_id: client_id,
        brand: s.vehicle?.brand?.name || 'Desconocida',
        model: s.vehicle?.model?.name || 'Desconocido',
        year: s.vehicle?.year || new Date().getFullYear(),
        price: s.sale_price || 0,
        category: s.vehicle?.category?.name || null,
      }));

    if (newTransactions.length === 0) {
      console.log('All sales already synced');
      return new Response(
        JSON.stringify({
          success: true,
          synced: 0,
          skipped: existingCodes.size,
          message: 'All sales already synced',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Insert in batches of 50
    let totalSynced = 0;
    let totalFailed = 0;
    const errors: string[] = [];
    const BATCH_SIZE = 50;

    for (let i = 0; i < newTransactions.length; i += BATCH_SIZE) {
      const batch = newTransactions.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('customers_transactions')
        .insert(batch);

      if (insertError) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        console.error(`Error inserting batch ${batchNum}:`, insertError);
        totalFailed += batch.length;
        errors.push(`Batch ${batchNum}: ${insertError.message}`);
        continue;
      }

      totalSynced += batch.length;
    }

    console.log(`Synced ${totalSynced} sales, ${totalFailed} failed`);

    const hasErrors = totalFailed > 0;

    return new Response(
      JSON.stringify({
        success: !hasErrors,
        synced: totalSynced,
        failed: totalFailed,
        skipped: existingCodes.size,
        total_sales: sales.length,
        ...(hasErrors && { errors }),
      }),
      {
        status: hasErrors && totalSynced === 0 ? 500 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error syncing sales:', error);
    await reportError({ functionName: 'sync-sales-to-marketing', error });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
