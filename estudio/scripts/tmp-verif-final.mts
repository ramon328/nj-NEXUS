process.loadEnvFile(".env.local");
import { getSupabaseServer } from "../lib/supabase";
async function main() {
  const s = getSupabaseServer();
  const { data: v } = await s.from("videos").select("id,name").eq("drive_file_id", "1FEZ4HYgPC1fmUZ6wNngfoGR40d_qDhWG");
  const { count: ne } = await s.from("edits").select("id", { count: "exact", head: true }).not("video_id", "is", null);
  const { count: np } = await s.from("projects").select("id", { count: "exact", head: true });
  console.log("video real:", JSON.stringify(v));
  console.log("edits de videos (intactos):", ne, "| proyectos restantes:", np);
}
main();
