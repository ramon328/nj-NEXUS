process.loadEnvFile(".env.local");
import { getSupabaseServer } from "../lib/supabase";
async function main() {
  const s = getSupabaseServer();
  const { data: v, error } = await s.from("videos").select("id,name,drive_file_id,status").limit(10);
  console.log("videos:", JSON.stringify(v, null, 1), error?.message ?? "");
  const { data: e } = await s.from("edits").select("id,video_id,project_id,status").limit(10);
  console.log("edits:", JSON.stringify(e, null, 1));
}
main();
