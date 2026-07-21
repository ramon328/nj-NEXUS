import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function testAvailability() {
  try {
    const { data, error } = await supabase.rpc('fn_compute_availability', {
      p_client_id: 1,
      p_dealership_id: 34,
      p_date: '2025-10-27',
      p_timezone: 'America/Santiago',
    });

    if (error) throw error;
    console.log('🟢 Disponibilidad:', data);
    return data;
  } catch (err) {
    console.error('❌ Error en disponibilidad:', err);
  }
}
