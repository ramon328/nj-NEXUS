// Inspección previa: verifica el video real y lista edits existentes.
process.loadEnvFile(".env.local");
import { getSupabaseServer } from "../lib/supabase";

const VIDEO_ID = "d32bc320-f9be-45db-90c5-b546a0747c7b";

async function main() {
  const supabase = getSupabaseServer();

  const { data: video, error: vErr } = await supabase
    .from("videos")
    .select("id, name, drive_file_id, status, duration_seconds")
    .eq("id", VIDEO_ID)
    .single();
  console.log("VIDEO REAL:", vErr ? `ERROR ${vErr.message}` : JSON.stringify(video));

  const { data: edits, error: eErr } = await supabase
    .from("edits")
    .select("id, video_id, status, instruccion, output_url, error, created_at")
    .order("created_at", { ascending: false });
  if (eErr) {
    console.log("EDITS ERROR:", eErr.message);
  } else {
    console.log(`EDITS (${edits?.length ?? 0}):`);
    for (const e of edits ?? []) {
      console.log(
        `  ${e.id} | ${e.status} | video=${e.video_id} | ${e.created_at} | instr=${(e.instruccion ?? "").slice(0, 40)} | err=${e.error ?? ""}`
      );
    }
  }
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
