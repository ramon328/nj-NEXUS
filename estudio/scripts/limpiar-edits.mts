// Limpia edits colgados de intentos previos (status 'procesando' o 'error')
// del video real. NO toca el video ni edits 'completado'.
process.loadEnvFile(".env.local");
import { getSupabaseServer } from "../lib/supabase";

const VIDEO_ID = "d32bc320-f9be-45db-90c5-b546a0747c7b";

async function main() {
  const supabase = getSupabaseServer();
  const { data: antes } = await supabase
    .from("edits")
    .select("id, status")
    .eq("video_id", VIDEO_ID)
    .in("status", ["procesando", "error"]);
  console.log("A borrar:", JSON.stringify(antes));

  const { error } = await supabase
    .from("edits")
    .delete()
    .eq("video_id", VIDEO_ID)
    .in("status", ["procesando", "error"]);
  if (error) throw new Error(error.message);

  const { data: quedan } = await supabase
    .from("edits")
    .select("id, status")
    .order("created_at", { ascending: false });
  console.log("EDITS restantes:", JSON.stringify(quedan));
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
