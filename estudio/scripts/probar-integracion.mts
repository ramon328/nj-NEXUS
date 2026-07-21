// Prueba de integración COMPLETA del motor + capa Remotion (sin IA):
//   1) genera un video sintético de 10 s con audio,
//   2) arma un plan completo (overlay_pro, barra de progreso, 2 segmentos con
//      transición, música de public/musica, 2 textos, subtítulos karaoke con
//      palabras y 1 sticker) y lo renderiza con renderEditPlan,
//   3) valida 1080x1920 + audio y extrae 2 fotogramas para revisión visual,
//   4) FALLBACK: renombra remotion/index.ts para romper la capa PRO y vuelve a
//      renderizar — debe completar por la rama clásica (drawtext/ass) con un
//      warn — y restaura el archivo.
//
// Uso:  npx tsx scripts/probar-integracion.mts

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { probeVideo, renderEditPlan, resolveFfmpeg } from "../lib/ffmpeg";
import type { ExecutableEditPlan } from "../lib/types";

const OUT_DIR = "/tmp/probar-integracion";
const INPUT = path.join(OUT_DIR, "sintetico.mp4");
const SALIDA_PRO = path.join(OUT_DIR, "final-pro.mp4");
const SALIDA_FALLBACK = path.join(OUT_DIR, "final-fallback.mp4");
const ENTRADA_REMOTION = path.join(process.cwd(), "remotion", "index.ts");
const ENTRADA_ROTA = `${ENTRADA_REMOTION}.roto`;

function run(bin: string, args: string[], label: string) {
  const r = spawnSync(bin, args, { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(`[${label}] FALLÓ (code ${r.status})`);
    console.error(r.stderr?.split("\n").slice(-25).join("\n"));
    throw new Error(`${label} falló`);
  }
}

function extraerFrame(ffmpeg: string, video: string, t: number, dest: string) {
  run(
    ffmpeg,
    ["-ss", t.toFixed(2), "-i", video, "-frames:v", "1", "-q:v", "2", "-y", dest],
    `frame-${t}`
  );
  console.log(`   fotograma t=${t}s → ${dest}`);
}

async function validar(salida: string, etiqueta: string) {
  const p = await probeVideo(salida);
  const dimsOk = p.width === 1080 && p.height === 1920;
  console.log(
    `   [${etiqueta}] dimensiones 1080x1920: ${dimsOk ? "OK" : "FALLO"} (${p.width}x${p.height})` +
      ` | audio: ${p.hasAudio ? "OK" : "FALLO"} | duración: ${p.durationSeconds.toFixed(2)}s`
  );
  if (!dimsOk || !p.hasAudio) throw new Error(`${etiqueta}: validación de salida falló`);
}

// Plan completo: 2 segmentos (fade 0.5 s), música, 2 textos, karaoke, sticker,
// barra de progreso. Línea "ingenua" de 10 s → final ≈ 9.5 s (factor 0.95).
const plan: ExecutableEditPlan = {
  resumen: "Integración completa PRO",
  formato: "vertical_9_16",
  audio_original: true,
  filtro: "vibrante",
  transicion: { tipo: "fade", duracion: 0.5 },
  musica: { archivo: "chill-relajado.mp3", volumen: 0.35, volumen_original: 0.6 },
  overlay_pro: true,
  barra_progreso: true,
  subtitulos_estilo: "karaoke",
  subtitulos: [
    {
      texto: "esto es una prueba completa",
      desde: 0.8,
      hasta: 3.2,
      palabras: [
        { palabra: "esto", desde: 0.8, hasta: 1.3 },
        { palabra: "es", desde: 1.3, hasta: 1.7 },
        { palabra: "una", desde: 1.7, hasta: 2.2 },
        { palabra: "prueba", desde: 2.2, hasta: 2.7 },
        { palabra: "completa", desde: 2.7, hasta: 3.2 },
      ],
    },
    {
      texto: "del motor con gráficos remotion",
      desde: 3.5,
      hasta: 6.2,
      palabras: [
        { palabra: "del", desde: 3.5, hasta: 4.0 },
        { palabra: "motor", desde: 4.0, hasta: 4.6 },
        { palabra: "con", desde: 4.6, hasta: 5.0 },
        { palabra: "gráficos", desde: 5.0, hasta: 5.6 },
        { palabra: "remotion", desde: 5.6, hasta: 6.2 },
      ],
    },
    {
      texto: "y transición entre segmentos",
      desde: 6.6,
      hasta: 9.4,
      palabras: [
        { palabra: "y", desde: 6.6, hasta: 7.0 },
        { palabra: "transición", desde: 7.0, hasta: 7.8 },
        { palabra: "entre", desde: 7.8, hasta: 8.4 },
        { palabra: "segmentos", desde: 8.4, hasta: 9.4 },
      ],
    },
  ],
  segmentos: [
    { desde: 0, hasta: 5, velocidad: 1, zoom: "acercar" },
    { desde: 5, hasta: 10, velocidad: 1, reencuadre: "centro" },
  ],
  textos: [
    {
      texto: "OFERTA FLASH HOY",
      desde: 0.5,
      hasta: 4.5,
      posicion: "arriba",
      estilo: "caja",
      fuente: "impacto.ttf",
      color: "amarillo",
      animacion: "deslizar-arriba",
    },
    {
      texto: "SÍGUEME PARA MÁS",
      desde: 5.5,
      hasta: 9.5,
      posicion: "centro",
      estilo: "neon",
      fuente: null,
      color: "celeste",
      animacion: "fundido",
    },
  ],
  stickers: [
    {
      archivo: "accion-guarda-amarillo.png",
      desde: 1.0,
      hasta: 9.0,
      posicion: "abajo-izquierda",
      escala: 0.2,
      animacion: "pop",
    },
  ],
};

async function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ffmpeg = resolveFfmpeg();

  // 1) Video sintético horizontal (ejercita el recorte a 9:16) con audio.
  run(
    ffmpeg,
    [
      "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=10",
      "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=10",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
      "-y", INPUT,
    ],
    "generar-sintetico"
  );
  const probe = await probeVideo(INPUT);
  console.log("1) Sintético listo:", INPUT, `${probe.width}x${probe.height}`);

  // 2) Render PRO completo.
  console.log("2) renderEditPlan (rama PRO Remotion) →", SALIDA_PRO);
  const t0 = Date.now();
  await renderEditPlan(INPUT, plan, SALIDA_PRO, probe, OUT_DIR);
  console.log(`   render PRO en ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await validar(SALIDA_PRO, "PRO");
  extraerFrame(ffmpeg, SALIDA_PRO, 1.5, path.join(OUT_DIR, "pro-1.5.jpg"));
  extraerFrame(ffmpeg, SALIDA_PRO, 7.0, path.join(OUT_DIR, "pro-7.0.jpg"));

  // 3) FALLBACK: romper la capa Remotion y verificar que el render completa
  //    igual por la rama clásica.
  console.log("3) FALLBACK: renombrando remotion/index.ts …");
  fs.renameSync(ENTRADA_REMOTION, ENTRADA_ROTA);
  try {
    const t1 = Date.now();
    await renderEditPlan(INPUT, plan, SALIDA_FALLBACK, probe, OUT_DIR);
    console.log(`   render FALLBACK en ${((Date.now() - t1) / 1000).toFixed(1)}s`);
    await validar(SALIDA_FALLBACK, "FALLBACK");
    extraerFrame(ffmpeg, SALIDA_FALLBACK, 1.5, path.join(OUT_DIR, "fallback-1.5.jpg"));
  } finally {
    fs.renameSync(ENTRADA_ROTA, ENTRADA_REMOTION);
    console.log("   remotion/index.ts restaurado");
  }

  console.log("LISTO");
}

main().catch((e) => {
  // Restauración defensiva por si el fallo ocurrió con el archivo renombrado.
  if (fs.existsSync(ENTRADA_ROTA) && !fs.existsSync(ENTRADA_REMOTION)) {
    fs.renameSync(ENTRADA_ROTA, ENTRADA_REMOTION);
  }
  console.error("ERROR:", e);
  process.exit(1);
});
