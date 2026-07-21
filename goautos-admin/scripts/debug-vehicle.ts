import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const vehicleId = Number(process.argv[2] || 3654);

async function main() {
  console.log(`Inspeccionando vehículo ${vehicleId}\n`);

  const [sale, purchase, consignment, extras, closeDeal] = await Promise.all([
    supabase.from('vehicles_sales').select('*').eq('vehicle_id', vehicleId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('vehicles_purchases').select('*').eq('vehicle_id', vehicleId).maybeSingle(),
    supabase.from('vehicles_consignments').select('*').eq('vehicle_id', vehicleId).maybeSingle(),
    supabase.from('vehicles_extras').select('*').eq('vehicle_id', vehicleId),
    supabase.from('vehicles_documents').select('*, vehicles_close_deal(*)').eq('vehicle_id', vehicleId).eq('type', 'close_deal').maybeSingle(),
  ]);

  console.log('SALE:', JSON.stringify(sale.data, null, 2));
  console.log('\nPURCHASE:', JSON.stringify(purchase.data, null, 2));
  console.log('\nCONSIGNMENT:', JSON.stringify(consignment.data, null, 2));
  console.log('\nEXTRAS:', JSON.stringify(extras.data, null, 2));
  console.log('\nCLOSE_DEAL:', JSON.stringify(closeDeal.data, null, 2));
}

main();
