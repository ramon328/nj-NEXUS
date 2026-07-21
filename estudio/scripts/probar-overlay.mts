// Prueba visual de la capa de gráficos Remotion SIN tocar el motor de video:
// arma un plan con 2 títulos animados (caja + neón, animaciones distintas),
// subtítulos karaoke con palabras, sticker con pop y barra de progreso; lo
// traduce con planAOverlayProps, renderiza el .mov con alpha (renderOverlayPro)
// y lo compone sobre un fondo de color para extraer fotogramas en t=1 y t=4
// y revisarlos a ojo.
//
// Uso:  npx tsx scripts/probar-overlay.mts

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { resolveFfmpeg, resolveFfprobe } from "../lib/ffmpeg";
import { planAOverlayProps, renderOverlayPro } from "../lib/overlay";
import type { ExecutableEditPlan } from "../lib/types";

const OUT_DIR = "/tmp/probar-overlay";
const OVERLAY = path.join(OUT_DIR, "overlay.mov");
const COMPUESTO = path.join(OUT_DIR, "compuesto.mp4");
const DURACION = 8;

function run(bin: string, args: string[], label: string) {
  const r = spawnSync(bin, args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`[${label}] FALLÓ (code ${r.status})`);
    console.error(r.stderr?.split("\n").slice(-25).join("\n"));
    throw new Error(`${label} falló`);
  }
  return r.stdout;
}

async function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ffmpeg = resolveFfmpeg();
  const ffprobe = resolveFfprobe();

  // Plan mínimo que ejercita TODA la capa (los campos de video no se usan).
  const plan: ExecutableEditPlan = {
    resumen: "Prueba visual del overlay",
    formato: "vertical_9_16",
    audio_original: true,
    filtro: "ninguno",
    transicion: { tipo: "ninguna", duracion: 0 },
    musica: { archivo: null, volumen: 0, volumen_original: 1 },
    overlay_pro: true,
    barra_progreso: true,
    subtitulos_estilo: "karaoke",
    subtitulos: [
      {
        texto: "así se hace un reel profesional",
        desde: 0.5,
        hasta: 3.5,
        palabras: [
          { palabra: "así", desde: 0.5, hasta: 0.9 },
          { palabra: "se", desde: 0.9, hasta: 1.4 },
          { palabra: "hace", desde: 1.4, hasta: 1.9 },
          { palabra: "un", desde: 1.9, hasta: 2.4 },
          { palabra: "reel", desde: 2.4, hasta: 3.0 },
          { palabra: "profesional", desde: 3.0, hasta: 3.5 },
        ],
      },
      {
        texto: "con gráficos animados de verdad",
        desde: 3.5,
        hasta: 7.5,
        palabras: [
          { palabra: "con", desde: 3.5, hasta: 3.9 },
          { palabra: "gráficos", desde: 3.9, hasta: 4.5 },
          { palabra: "animados", desde: 4.5, hasta: 5.4 },
          { palabra: "de", desde: 5.4, hasta: 6.0 },
          { palabra: "verdad", desde: 6.0, hasta: 7.5 },
        ],
      },
    ],
    segmentos: [{ desde: 0, hasta: DURACION, velocidad: 1 }],
    textos: [
      {
        texto: "3 TRUCOS DE MARKETING",
        // Empieza a 0.9 s: el fotograma t=1 lo captura EN PLENA entrada
        // (deslizándose hacia arriba, semitransparente) y t=4 asentado.
        desde: 0.9,
        hasta: 7.6,
        posicion: "arriba",
        estilo: "caja",
        fuente: "impacto.ttf",
        color: "amarillo",
        animacion: "deslizar-arriba",
      },
      {
        texto: "SÍGUEME PARA MÁS",
        desde: 0.6,
        hasta: 7.6,
        posicion: "centro",
        estilo: "neon",
        fuente: "urbana-display.ttf",
        color: "celeste",
        animacion: "fundido",
      },
    ],
    stickers: [
      {
        archivo: "fuego.png",
        desde: 0.3,
        hasta: 7.6,
        posicion: "abajo-derecha",
        escala: 0.16,
        animacion: "pop",
      },
    ],
  };

  console.log("1) planAOverlayProps + renderOverlayPro →", OVERLAY);
  const t0 = Date.now();
  const props = planAOverlayProps(plan, 1, DURACION);
  await renderOverlayPro(props, DURACION, OVERLAY);
  console.log(`   overlay renderizado en ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // Validar el alpha del .mov (prores 4444 → yuva444p10le).
  const probeOut = run(
    ffprobe,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=codec_name,pix_fmt,width,height",
      "-of",
      "default=noprint_wrappers=1",
      OVERLAY,
    ],
    "ffprobe-overlay"
  );
  console.log("2) Stream del overlay:\n" + probeOut.trim().replace(/^/gm, "   "));
  if (!/pix_fmt=yuva/.test(probeOut)) {
    throw new Error("El overlay NO tiene canal alpha (pix_fmt sin 'a')");
  }

  // Componer sobre un fondo de color liso para ver los gráficos.
  console.log("3) Componiendo sobre fondo de color →", COMPUESTO);
  run(
    ffmpeg,
    [
      "-f",
      "lavfi",
      "-i",
      `color=c=0x203040:size=1080x1920:rate=30:duration=${DURACION}`,
      "-i",
      OVERLAY,
      "-filter_complex",
      "[0:v][1:v]overlay=0:0:format=auto[v]",
      "-map",
      "[v]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-y",
      COMPUESTO,
    ],
    "componer"
  );

  // Fotogramas: t=1 (título ENTRANDO, "se" en amarillo, barra ~12%) y
  // t=4 (título asentado, "gráficos" en amarillo, barra ~50%).
  for (const t of [1, 4]) {
    const dest = path.join(OUT_DIR, `frame-${t}.png`);
    run(
      ffmpeg,
      ["-ss", String(t), "-i", COMPUESTO, "-frames:v", "1", "-y", dest],
      `frame-${t}`
    );
    console.log("   fotograma:", dest);
  }
  console.log("LISTO");
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
