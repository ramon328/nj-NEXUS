// Script tsx de humo del motor de edición.
// Genera un video sintético (testsrc + sine, 10 s, 1280x720 horizontal para
// ejercitar reencuadre/rotación al pasar a 9:16), arma un plan que ejercita
// zoom / rotación / reencuadre / subtítulos karaoke y lo renderiza con
// renderEditPlan. Luego extrae fotogramas de comparación.
//
// Uso:  node_modules/.bin/tsx scripts/humo-motor.mts

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  resolveFfmpeg,
  resolveFfprobe,
  probeVideo,
  renderEditPlan,
} from "../lib/ffmpeg";
import type { ExecutableEditPlan } from "../lib/types";

const OUT_DIR = "/tmp/humo-motor";
const INPUT = path.join(OUT_DIR, "sintetico.mp4");
const OUTPUT = "/tmp/pro2.mp4";
const FRAMES_DIR = path.join(OUT_DIR, "frames");

function run(bin: string, args: string[], label: string) {
  const r = spawnSync(bin, args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`[${label}] FALLÓ (code ${r.status})`);
    console.error(r.stderr?.split("\n").slice(-25).join("\n"));
    throw new Error(`${label} falló`);
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });

  const ffmpeg = resolveFfmpeg();
  const ffprobe = resolveFfprobe();
  console.log("FFMPEG resuelto:", ffmpeg);
  console.log("FFPROBE resuelto:", ffprobe);

  // 1) Video sintético 10 s, HORIZONTAL 1280x720 (para que el reencuadre a 9:16
  //    tenga margen horizontal real), con audio sine. testsrc2 tiene detalle
  //    (números/gradientes) que hace visible el zoom y la rotación.
  run(
    ffmpeg,
    [
      "-f",
      "lavfi",
      "-i",
      "testsrc2=size=1280x720:rate=30:duration=10",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:sample_rate=48000:duration=10",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-shortest",
      "-y",
      INPUT,
    ],
    "generar-sintetico"
  );
  console.log("Video sintético generado en", INPUT);

  const probe = await probeVideo(INPUT);
  console.log("Probe entrada:", probe);

  // 2) Plan que ejercita lo nuevo.
  //    seg 0 (0-3.5s): zoom "acercar" (Ken Burns push-in)
  //    seg 1 (3.5-6.5s): rotacion 90 + reencuadre "izquierda"
  //    seg 2 (6.5-10s): zoom "paneo-derecha"
  //    subtitulos_estilo "karaoke" con 2 cues; el primero con 3 palabras.
  const plan: ExecutableEditPlan = {
    resumen: "Prueba de humo motor pro",
    formato: "vertical_9_16",
    audio_original: true,
    filtro: "ninguno",
    transicion: { tipo: "ninguna", duracion: 0 },
    musica: { archivo: null, volumen: 0, volumen_original: 1 },
    subtitulos_estilo: "karaoke",
    subtitulos: [
      {
        texto: "hola mundo pro",
        desde: 0.3,
        hasta: 3.0,
        palabras: [
          { palabra: "hola", desde: 0.3, hasta: 1.2 },
          { palabra: "mundo", desde: 1.2, hasta: 2.1 },
          { palabra: "pro", desde: 2.1, hasta: 3.0 },
        ],
      },
      {
        texto: "segundo subtitulo aqui",
        desde: 4.0,
        hasta: 6.0,
        palabras: [
          { palabra: "segundo", desde: 4.0, hasta: 4.7 },
          { palabra: "subtitulo", desde: 4.7, hasta: 5.4 },
          { palabra: "aqui", desde: 5.4, hasta: 6.0 },
        ],
      },
    ],
    segmentos: [
      { desde: 0, hasta: 3.5, velocidad: 1, zoom: "acercar" },
      {
        desde: 3.5,
        hasta: 6.5,
        velocidad: 1,
        rotacion: 90,
        reencuadre: "izquierda",
      },
      { desde: 6.5, hasta: 10, velocidad: 1, zoom: "paneo-derecha" },
    ],
    textos: [],
    stickers: [],
  };

  console.log("Renderizando plan a", OUTPUT, "...");
  await renderEditPlan(INPUT, plan, OUTPUT, probe, OUT_DIR);
  console.log("Render completado.");

  // 3) Validar salida: 1080x1920, con audio, duración ~10s.
  const probeOut = await probeVideo(OUTPUT);
  console.log("Probe salida:", probeOut);
  const dimsOk = probeOut.width === 1080 && probeOut.height === 1920;
  console.log(
    `VALIDACIÓN dimensiones 1080x1920: ${dimsOk ? "OK" : "FALLO"} (${probeOut.width}x${probeOut.height})`
  );
  console.log(
    `VALIDACIÓN audio presente: ${probeOut.hasAudio ? "OK" : "FALLO"}`
  );
  console.log(
    `VALIDACIÓN duración ~10s: ${probeOut.durationSeconds.toFixed(2)}s`
  );

  // 4) Extraer fotogramas de comparación.
  // Segmento 0 va de 0 a 3.5 en el video final (sin transición, velocidad 1).
  // ZOOM: inicio del seg 0 (t=0.3) vs final del seg 0 (t=3.3).
  extraerFrame(ffmpeg, OUTPUT, 0.3, path.join(FRAMES_DIR, "zoom-inicio.jpg"));
  extraerFrame(ffmpeg, OUTPUT, 3.3, path.join(FRAMES_DIR, "zoom-final.jpg"));

  // KARAOKE: primer cue va de 0.3 a 3.0. Palabra 1 "hola" (0.3-1.2), palabra 3
  // "pro" (2.1-3.0). Tomamos t=0.7 (sobre "hola") y t=2.6 (sobre "pro").
  extraerFrame(ffmpeg, OUTPUT, 0.7, path.join(FRAMES_DIR, "karaoke-palabra1.jpg"));
  extraerFrame(ffmpeg, OUTPUT, 2.6, path.join(FRAMES_DIR, "karaoke-palabra3.jpg"));

  // ROTACIÓN: segmento 1 va de 3.5 a 6.5 en el final. Tomamos t=5.0 (centro).
  extraerFrame(ffmpeg, OUTPUT, 5.0, path.join(FRAMES_DIR, "rotacion-seg1.jpg"));

  // Referencia: un frame del seg 2 (paneo-derecha) al inicio y al final.
  extraerFrame(ffmpeg, OUTPUT, 6.8, path.join(FRAMES_DIR, "paneo-inicio.jpg"));
  extraerFrame(ffmpeg, OUTPUT, 9.5, path.join(FRAMES_DIR, "paneo-final.jpg"));

  console.log("Fotogramas extraídos en", FRAMES_DIR);
  console.log("LISTOS:", fs.readdirSync(FRAMES_DIR).join(", "));
}

// Extrae un fotograma a resolución completa (sin reescalar) en el timestamp t.
function extraerFrame(ffmpeg: string, video: string, t: number, dest: string) {
  const r = spawnSync(
    ffmpeg,
    [
      "-ss",
      t.toFixed(2),
      "-i",
      video,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      "-y",
      dest,
    ],
    { encoding: "utf8" }
  );
  if (r.status !== 0 || !fs.existsSync(dest)) {
    console.error(`Extracción de frame en t=${t} FALLÓ`);
    console.error(r.stderr?.split("\n").slice(-15).join("\n"));
  } else {
    console.log(`  frame t=${t}s -> ${dest}`);
  }
}

main().catch((e) => {
  console.error("ERROR EN HUMO:", e);
  process.exit(1);
});
