process.loadEnvFile(".env.local");
import { getSupabaseServer } from "../lib/supabase";

async function main() {
  const supabase = getSupabaseServer();
  const { error: e1 } = await supabase.from("projects").select("id").limit(1);
  const { error: e2 } = await supabase.from("project_assets").select("id").limit(1);
  if (e1 || e2) {
    console.log("TABLAS_NO_EXISTEN");
    console.log("projects:", e1?.message ?? "ok");
    console.log("project_assets:", e2?.message ?? "ok");
  } else {
    console.log("TABLAS_OK");
  }
}
main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
