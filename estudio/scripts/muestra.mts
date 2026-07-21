process.loadEnvFile(".env.local");
import { getSupabaseServer } from "../lib/supabase";
import { runEditJob } from "../lib/editor";
const sb = getSupabaseServer();
const { data } = await sb.from("edits").insert({
  video_id: "d32bc320-f9be-45db-90c5-b546a0747c7b",
  instruccion: "editá como editor profesional: gancho fuerte al inicio, cortes al ritmo del habla, movimiento de cámara, subtítulos karaoke, corrige las tomas de lado, música con energía y filtro cinematográfico, ~15s",
  status: "procesando",
}).select().single();
console.log("edit:", data!.id);
await runEditJob(data!.id);
const { data: fin } = await sb.from("edits").select("status,output_url,plan").eq("id", data!.id).single();
console.log("STATUS:", fin!.status);
console.log("URL:", fin!.output_url);
const p:any = fin!.plan;
if (p) console.log("segmentos:", p.segmentos.length, "| rotaciones:", p.segmentos.map((s:any)=>s.rotacion??0).join(","), "| zoom:", p.segmentos.map((s:any)=>s.zoom??"-").join(","), "| subs:", p.subtitulos_estilo, (p.subtitulos?.length||0)+" cues");
