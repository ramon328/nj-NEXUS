import { createClient } from "@supabase/supabase-js";

// Cliente Supabase del proyecto Forja, usado SOLO para validar el `forja_token`
// que llega desde el portal Forja (SSO). La anon key es pública; sin una sesión
// válida no da acceso a datos (lo protege RLS en Forja).
export const forjaSupabase = createClient(
  "https://ydcpsihovvaefyobnhws.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkY3BzaWhvdnZhZWZ5b2JuaHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNjgyODYsImV4cCI6MjA5NTk0NDI4Nn0.EvJ3WHdXRvFxOYtcL-TknodEdDR86vvURQNUi26H7q8",
  { auth: { persistSession: false, autoRefreshToken: false } }
);
