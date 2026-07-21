// Aislar el efecto Ken Burns "acercar" con una fuente ESTÁTICA (smptebars),
// para que cualquier cambio de encuadre entre el primer y el último fotograma
// del segmento sea atribuible SOLO al zoom (no a la animación de la fuente).

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { resolveFfmpeg, probeVideo, renderEditPlan } from "../lib/ffmpeg";
import type { ExecutableEditPlan } from "../lib/types";

const OUT_DIR = "/tmp/humo-zoom";
const INPUT = path.join(OUT_DIR, "estatico.mp4");
const OUTPUT = path.join(OUT_DIR, "zoom.mp4");
const FRAMES = path.join(OUT_DIR, "frames");

function run(bin: string, args: string[], label: string) {
  const r = spawnSync(bin, args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`[${label}] code ${r.status}`, r.stderr?.split("\n").slice(-20).join("\n"));
    throw new Error(`${label} falló`);
  }
}

async function main() {
  fs.mkdirSync(FRAMES, { recursive: true });
  const ffmpeg = resolveFfmpeg();

  // Fuente ESTÁTICA horizontal: smptebars fijo (no cambia con el tiempo).
  run(
    ffmpeg,
    [
      "-f", "lavfi", "-i", "smptebars=size=1280x720:rate=30:duration=6",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=6",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", "-y", INPUT,
    ],
    "estatico"
  );

  const probe = await probeVideo(INPUT);
  console.log("Probe:", probe);

  // Un solo segmento con zoom "acercar" (push-in). Sin subtítulos ni nada más.
  const plan: ExecutableEditPlan = {
    resumen: "zoom aislado",
    formato: "vertical_9_16",
    audio_original: false,
    filtro: "ninguno",
    transicion: { tipo: "ninguna", duracion: 0 },
    musica: { archivo: null, volumen: 0, volumen_original: 0 },
    segmentos: [{ desde: 0, hasta: 6, velocidad: 1, zoom: "acercar" }],
    textos: [],
    stickers: [],
  };

  await renderEditPlan(INPUT, plan, OUTPUT, probe, OUT_DIR);
  const po = await probeVideo(OUTPUT);
  console.log("Salida:", po);

  // Inicio (t=0.1) vs final (t=5.8). Con fuente estática, cualquier diferencia
  // de encuadre es puro zoom.
  for (const [t, name] of [[0.1, "inicio"], [5.8, "final"]] as [number, string][]) {
    const dest = path.join(FRAMES, `zoom-${name}.jpg`);
    run(ffmpeg, ["-ss", String(t), "-i", OUTPUT, "-frames:v", "1", "-q:v", "2", "-y", dest], `frame-${name}`);
    console.log(`frame ${name} (t=${t}) -> ${dest}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
