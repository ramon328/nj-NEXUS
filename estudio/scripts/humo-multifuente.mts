// Script tsx de humo del render MULTI-FUENTE (sin DB, sin IA).
// Genera dos clips sintéticos distintos (testsrc y smptebars, 6 s c/u, con
// audio sine distinto) y una foto sintética (PNG 1280x720 en gradiente), arma
// un ExecutableEditPlan con 3 segmentos multi-fuente (clip1 → foto con Ken
// Burns → clip2 acelerado) + transición fade 0.4 + música + un texto, y llama
// renderEditPlan(null, plan, "/tmp/multi.mp4", null, "/tmp", rutasAssets).
//
// Uso:  npx tsx scripts/humo-multifuente.mts

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  resolveFfmpeg,
  probeVideo,
  renderEditPlan,
  type AssetRender,
} from "../lib/ffmpeg";
import type { ExecutableEditPlan } from "../lib/types";

const OUT_DIR = "/tmp/humo-multifuente";
const CLIP1 = path.join(OUT_DIR, "clip1-testsrc.mp4");
const CLIP2 = path.join(OUT_DIR, "clip2-smptebars.mp4");
const FOTO1 = path.join(OUT_DIR, "foto1-gradiente.png");
const OUTPUT = "/tmp/multi.mp4";
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
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
  const ffmpeg = resolveFfmpeg();

  // ---- Fuentes sintéticas ----
  // clip1: testsrc (patrón móvil con contador) + sine 440 Hz, 6 s.
  run(
    ffmpeg,
    [
      "-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30:duration=6",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=6",
      "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest", "-y", CLIP1,
    ],
    "clip1"
  );
  // clip2: smptebars (barras de color fijas) + sine 880 Hz, 6 s.
  run(
    ffmpeg,
    [
      "-f", "lavfi", "-i", "smptebars=size=1280x720:rate=30:duration=6",
      "-f", "lavfi", "-i", "sine=frequency=880:duration=6",
      "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-shortest", "-y", CLIP2,
    ],
    "clip2"
  );
  // foto1: un frame PNG 1280x720 con gradiente + cuadrícula blanca (la
  // cuadrícula hace visible el Ken Burns: las celdas se agrandan al acercar).
  run(
    ffmpeg,
    [
      "-f", "lavfi", "-i", "gradients=size=1280x720:c0=orange:c1=purple:x0=0:y0=0:x1=1280:y1=720",
      "-vf", "drawgrid=w=160:h=90:t=5:color=white@0.85",
      "-frames:v", "1", "-y", FOTO1,
    ],
    "foto1"
  );
  for (const f of [CLIP1, CLIP2, FOTO1]) {
    if (!fs.existsSync(f)) throw new Error(`No se generó ${f}`);
  }
  console.log("[fuentes] clip1 (testsrc), clip2 (smptebars) y foto1 (gradiente) listos");

  // ---- Plan multi-fuente ----
  const plan: ExecutableEditPlan = {
    resumen: "Humo multi-fuente: clip1 + foto Ken Burns + clip2 acelerado",
    formato: "vertical_9_16",
    audio_original: true,
    filtro: "ninguno",
    transicion: { tipo: "fade", duracion: 0.4 },
    musica: {
      archivo: "chill-relajado.mp3",
      volumen: 0.5,
      volumen_original: 0.6,
    },
    segmentos: [
      { desde: 1, hasta: 3.5, velocidad: 1, asset_id: "clip1" },
      { desde: 0, hasta: 2.5, velocidad: 1, asset_id: "foto1", zoom: "acercar" },
      { desde: 2, hasta: 5, velocidad: 1.25, asset_id: "clip2" },
    ],
    textos: [
      {
        texto: "PRUEBA MULTI-FUENTE",
        desde: 0.5,
        hasta: 3,
        posicion: "arriba",
        estilo: "caja",
        fuente: "impacto.ttf",
        color: "amarillo",
      },
    ],
    stickers: [],
  };

  const rutasAssets: Record<string, AssetRender> = {
    clip1: { ruta: CLIP1, tipo: "video" },
    foto1: { ruta: FOTO1, tipo: "foto" },
    clip2: { ruta: CLIP2, tipo: "video" },
  };

  // Duración esperada: 2.5 + 2.5 + (3/1.25=2.4) − 2 transiciones de 0.4 = 6.6 s.
  const durEsperada = 2.5 + 2.5 + 3 / 1.25 - 2 * 0.4;

  console.log("[render] renderEditPlan(null, plan, /tmp/multi.mp4, null, /tmp, rutasAssets)...");
  const t0 = Date.now();
  await renderEditPlan(null, plan, OUTPUT, null, "/tmp", rutasAssets);
  console.log(`[render] terminado en ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  // ---- Validación ----
  if (!fs.existsSync(OUTPUT)) throw new Error("No existe /tmp/multi.mp4");
  const probe = await probeVideo(OUTPUT);
  console.log(
    `[probe] ${probe.width}x${probe.height} | dur=${probe.durationSeconds.toFixed(2)}s ` +
      `(esperada ${durEsperada.toFixed(2)}s) | audio=${probe.hasAudio}`
  );
  const errores: string[] = [];
  if (probe.width !== 1080 || probe.height !== 1920) {
    errores.push(`resolución ${probe.width}x${probe.height} != 1080x1920`);
  }
  if (!probe.hasAudio) errores.push("sin pista de audio");
  if (Math.abs(probe.durationSeconds - durEsperada) > 1.5) {
    errores.push(
      `duración ${probe.durationSeconds.toFixed(2)}s fuera de ±1.5s de ${durEsperada.toFixed(2)}s`
    );
  }
  if (errores.length) throw new Error("Validación falló: " + errores.join("; "));

  // ---- Fotogramas de verificación ----
  // Línea de tiempo final: seg1 [0, 2.5], seg2 (foto) [2.1, 4.6], seg3 [4.2, 6.6]
  // (offsets xfade: 2.1 y 4.2). Zonas "puras" sin solape:
  //   seg1: t=1.0 | seg2: t=3.3 | seg3: t=5.6
  // Ken Burns de la foto: inicio (t=2.55, recién terminado el fade) vs fin
  // (t=4.15, justo antes del siguiente fade) — el encuadre debe diferir.
  const capturas: [string, number][] = [
    ["frame-1-seg1-testsrc.jpg", 1.0],
    ["frame-2-seg2-foto.jpg", 3.3],
    ["frame-3-seg3-smptebars.jpg", 5.6],
    ["frame-foto-inicio.jpg", 2.55],
    ["frame-foto-fin.jpg", 4.15],
  ];
  for (const [nombre, ts] of capturas) {
    run(
      ffmpeg,
      [
        "-ss", ts.toFixed(2), "-i", OUTPUT, "-frames:v", "1",
        "-vf", "scale=480:-2", "-q:v", "4", "-y",
        path.join(FRAMES_DIR, nombre),
      ],
      `frame@${ts}`
    );
  }
  console.log(`[frames] extraídos en ${FRAMES_DIR}:`);
  for (const [nombre, ts] of capturas) {
    console.log(`  - ${path.join(FRAMES_DIR, nombre)} (t=${ts}s)`);
  }
  console.log("HUMO MULTI-FUENTE OK");
}

main().catch((e) => {
  console.error("HUMO MULTI-FUENTE FALLÓ:", (e as Error).message);
  process.exit(1);
});
