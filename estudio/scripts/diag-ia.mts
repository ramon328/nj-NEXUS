// Diagnóstico: replica la llamada a Claude de generateExecutablePlan sobre el
// video real y muestra stop_reason, usage y los tipos de bloque de la respuesta.
process.loadEnvFile(".env.local");

import fs from "fs";
import os from "os";
import path from "path";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, CLAUDE_MODEL } from "../lib/anthropic";
import { getSupabaseServer } from "../lib/supabase";
import { downloadDriveFile, extractFrames, probeVideo } from "../lib/ffmpeg";

const VIDEO_ID = "d32bc320-f9be-45db-90c5-b546a0747c7b";

async function main() {
  const supabase = getSupabaseServer();
  const { data: video } = await supabase
    .from("videos")
    .select("*")
    .eq("id", VIDEO_ID)
    .single();
  if (!video) throw new Error("sin video");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "diag-"));
  const ruta = path.join(dir, "original.mp4");
  await downloadDriveFile(video.drive_file_id, ruta);
  const probe = await probeVideo(ruta);
  console.log("probe:", probe);
  const frames = await extractFrames(ruta, path.join(dir, "frames"), 10, probe.durationSeconds);
  console.log("frames:", frames.length);

  const bloques: Anthropic.ContentBlockParam[] = [];
  for (const frame of frames) {
    bloques.push({ type: "text", text: `Fotograma ${frame.timestamp.toFixed(1)}` });
    bloques.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: fs.readFileSync(frame.filePath).toString("base64"),
      },
    });
  }
  bloques.push({
    type: "text",
    text: "Devuelve un JSON simple {\"ok\": true, \"resumen\": \"...\"} describiendo lo que ves.",
  });

  const client = getAnthropic();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["ok", "resumen"],
          properties: {
            ok: { type: "boolean" },
            resumen: { type: "string" },
          },
        },
      },
    },
    messages: [{ role: "user", content: bloques }],
  });

  console.log("MODEL:", response.model);
  console.log("STOP_REASON:", response.stop_reason);
  console.log("USAGE:", JSON.stringify(response.usage));
  console.log("CONTENT BLOCK TYPES:", response.content.map((b) => b.type).join(", "));
  for (const b of response.content) {
    if (b.type === "text") console.log("TEXT:", b.text.slice(0, 300));
    if (b.type === "thinking") console.log("THINKING len:", (b as { thinking: string }).thinking?.length ?? "(vacío)");
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error("ERROR DIAG:", e);
  process.exit(1);
});
