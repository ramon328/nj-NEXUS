import { createClient } from '@supabase/supabase-js';
// @ts-ignore -- 'ws' no expone tipos bajo moduleResolution "bundler" + Node 24 (Render).
// El transporte se castea a any abajo, así que no perdemos tipado real.
import ws from 'ws';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  realtime: { transport: ws as any },
});
