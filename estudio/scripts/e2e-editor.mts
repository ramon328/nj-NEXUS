// Prueba end-to-end del motor de edición con IA sobre el VIDEO REAL.
// 1. Inserta un edit real en 'procesando' con instrucción de editor profesional.
// 2. Ejecuta runEditJob (await) — descarga de Drive, transcribe, IA, render, subida.
// 3. Imprime el PLAN completo y verifica que la IA usó las herramientas nuevas.
// 4. Descarga el output_url, extrae 3 fotogramas y corre volumedetect.
process.loadEnvFile(".env.local");

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { getSupabaseServer } from "../lib/supabase";
import { runEditJob } from "../lib/editor";
import { resolveFfmpeg } from "../lib/ffmpeg";
import type { EditJob, ExecutableEditPlan } from "../lib/types";

const VIDEO_ID = "d32bc320-f9be-45db-90c5-b546a0747c7b";
const OUT_DIR = "/tmp/e2e-editor";
const INSTRUCCION =
  "editá esto como un editor profesional: cortes al ritmo del habla, gancho fuerte al inicio, movimiento de cámara (zoom/paneo), subtítulos karaoke, corrige cualquier toma que se vea de lado, música con energía y filtro cinematográfico, ~15s";

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const supabase = getSupabaseServer();

  // 1. Insertar edit real en 'procesando'.
  const { data: insertado, error: insErr } = await supabase
    .from("edits")
    .insert({ video_id: VIDEO_ID, instruccion: INSTRUCCION, status: "procesando" })
    .select("*")
    .single();
  if (insErr || !insertado) {
    throw new Error(`No se pudo insertar el edit: ${insErr?.message}`);
  }
  const editId = (insertado as EditJob).id;
  console.log("EDIT INSERTADO:", editId);

  // 2. Ejecutar el trabajo completo.
  console.log("Ejecutando runEditJob...");
  const t0 = Date.now();
  await runEditJob(editId);
  console.log(`runEditJob terminó en ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // 3. Leer la fila final.
  const { data: finalData, error: finErr } = await supabase
    .from("edits")
    .select("*")
    .eq("id", editId)
    .single();
  if (finErr || !finalData) {
    throw new Error(`No se pudo leer el edit final: ${finErr?.message}`);
  }
  const edit = finalData as EditJob;
  console.log("STATUS FINAL:", edit.status);
  if (edit.status !== "completado") {
    console.log("ERROR DEL EDIT:", edit.error);
    throw new Error(`El edit no se completó: ${edit.error}`);
  }
  console.log("OUTPUT_URL:", edit.output_url);

  const plan = edit.plan as ExecutableEditPlan;
  if (!plan) throw new Error("El edit completado no tiene plan");

  // 4. Imprimir el PLAN.
  console.log("\n========== PLAN ==========");
  console.log("resumen:", plan.resumen);
  console.log("formato:", plan.formato, "| audio_original:", plan.audio_original);
  console.log("filtro:", plan.filtro);
  console.log("transicion:", JSON.stringify(plan.transicion));
  console.log("musica:", JSON.stringify(plan.musica));
  console.log("whoosh_en_transiciones:", plan.whoosh_en_transiciones);
  console.log("efectos_sonido:", JSON.stringify(plan.efectos_sonido ?? []));

  console.log(`\nSEGMENTOS (${plan.segmentos.length}):`);
  plan.segmentos.forEach((s, i) => {
    console.log(
      `  [${i}] ${s.desde.toFixed(2)}-${s.hasta.toFixed(2)}s vel=${s.velocidad} zoom=${s.zoom ?? "ninguno"} reencuadre=${s.reencuadre ?? "centro"} rotacion=${s.rotacion ?? 0}`
    );
  });

  console.log(`\nSUBTITULOS_ESTILO: ${plan.subtitulos_estilo ?? "(sin definir)"}`);
  const cues = plan.subtitulos ?? [];
  console.log(`CUES: ${cues.length}`);
  if (cues.length) {
    const c0 = cues[0];
    console.log(
      `  primer cue: "${c0.texto}" [${c0.desde.toFixed(2)}-${c0.hasta.toFixed(2)}] palabras=${c0.palabras?.length ?? 0}`
    );
    if (c0.palabras?.length) {
      console.log(
        "    palabras[0..2]:",
        c0.palabras
          .slice(0, 3)
          .map((p) => `${p.palabra}[${p.desde.toFixed(2)}-${p.hasta.toFixed(2)}]`)
          .join(" ")
      );
    }
  }

  console.log(`\nTEXTOS (${plan.textos.length}):`);
  plan.textos.forEach((t, i) =>
    console.log(
      `  [${i}] "${t.texto}" ${t.desde.toFixed(1)}-${t.hasta.toFixed(1)}s pos=${t.posicion} estilo=${t.estilo} fuente=${t.fuente} color=${t.color} anim=${t.animacion ?? "fundido"}`
    )
  );

  console.log(`\nSTICKERS (${plan.stickers.length}):`);
  plan.stickers.forEach((s, i) =>
    console.log(
      `  [${i}] ${s.archivo} ${s.desde.toFixed(1)}-${s.hasta.toFixed(1)}s pos=${s.posicion} escala=${s.escala} anim=${s.animacion ?? "fundido"}`
    )
  );

  // 5. Verificar herramientas nuevas.
  const zoomsUsados = plan.segmentos.filter(
    (s) => s.zoom && s.zoom !== "ninguno"
  );
  const rotacionesUsadas = plan.segmentos.filter(
    (s) => typeof s.rotacion === "number" && s.rotacion > 0
  );
  const reencuadresLaterales = plan.segmentos.filter(
    (s) => s.reencuadre && s.reencuadre !== "centro"
  );
  const karaokeConPalabras =
    plan.subtitulos_estilo === "karaoke" &&
    cues.some((c) => c.palabras && c.palabras.length > 0);

  console.log("\n========== VERIFICACIÓN HERRAMIENTAS NUEVAS ==========");
  console.log(
    `zoom != ninguno: ${zoomsUsados.length > 0 ? "SÍ" : "NO"} (${zoomsUsados.map((s) => s.zoom).join(", ")})`
  );
  console.log(
    `karaoke con palabras: ${karaokeConPalabras ? "SÍ" : "NO"} (estilo=${plan.subtitulos_estilo})`
  );
  console.log(
    `rotacion en tomas de lado: ${rotacionesUsadas.length > 0 ? "SÍ" : "NO"} (${rotacionesUsadas.map((s) => s.rotacion).join(", ")})`
  );
  console.log(
    `reencuadre lateral: ${reencuadresLaterales.length > 0 ? "SÍ" : "NO"} (${reencuadresLaterales.map((s) => s.reencuadre).join(", ")})`
  );

  // Criterio de "usó herramientas nuevas": al menos zoom o karaoke.
  const usoNuevas = zoomsUsados.length > 0 || karaokeConPalabras;
  console.log(`\nUSÓ HERRAMIENTAS NUEVAS (zoom||karaoke): ${usoNuevas ? "SÍ" : "NO"}`);

  // Escribir un resumen máquina-legible para que el orquestador lo lea.
  fs.writeFileSync(
    path.join(OUT_DIR, "resultado.json"),
    JSON.stringify(
      {
        editId,
        status: edit.status,
        output_url: edit.output_url,
        zoomsUsados: zoomsUsados.map((s) => s.zoom),
        rotacionesUsadas: rotacionesUsadas.map((s) => s.rotacion),
        reencuadresLaterales: reencuadresLaterales.map((s) => s.reencuadre),
        subtitulos_estilo: plan.subtitulos_estilo,
        karaokeConPalabras,
        nSegmentos: plan.segmentos.length,
        nCues: cues.length,
        usoNuevas,
      },
      null,
      2
    )
  );

  if (!usoNuevas) {
    console.log(
      "\n*** LA IA NO USÓ HERRAMIENTAS NUEVAS: hay que reforzar el prompt en lib/editor.ts ***"
    );
    // No seguimos con fotogramas: primero corregir.
    return;
  }

  // 6. Descargar el output y extraer 3 fotogramas + volumedetect.
  const ffmpeg = resolveFfmpeg();
  const rutaSalida = path.join(OUT_DIR, `${editId}.mp4`);
  console.log("\nDescargando output_url...");
  const resp = await fetch(edit.output_url as string);
  if (!resp.ok) throw new Error(`Descarga output falló: HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(rutaSalida, buf);
  console.log(`Descargado ${(buf.length / 1024 / 1024).toFixed(2)} MB en ${rutaSalida}`);

  // Duración del output.
  const durOut = probeDuracion(rutaSalida);
  const dims = probeDims(rutaSalida);
  console.log(`OUTPUT dims: ${dims} | duración: ${durOut.toFixed(2)}s`);

  // 3 fotogramas: t=1, mitad, final-1.
  const tMedio = Math.max(1, durOut / 2);
  const tFinal = Math.max(1.5, durOut - 1);
  const frames: { t: number; nombre: string }[] = [
    { t: 1, nombre: "frame-t1.jpg" },
    { t: tMedio, nombre: "frame-mitad.jpg" },
    { t: tFinal, nombre: "frame-final.jpg" },
  ];
  for (const f of frames) {
    extraerFrame(ffmpeg, rutaSalida, f.t, path.join(OUT_DIR, f.nombre));
  }

  // Comparación Ken Burns: si algún segmento tiene zoom, extraer inicio/fin de ese segmento.
  // El primer segmento con zoom empieza en la línea final calculada por acumulación.
  let acum = 0;
  let compZoom: { inicio: number; fin: number } | null = null;
  for (const s of plan.segmentos) {
    const vel = s.velocidad || 1;
    const durFinal = (s.hasta - s.desde) / vel;
    if (s.zoom && s.zoom !== "ninguno" && !compZoom) {
      compZoom = {
        inicio: acum + 0.2,
        fin: Math.max(acum + 0.4, acum + durFinal - 0.2),
      };
    }
    acum += durFinal;
  }
  if (compZoom) {
    extraerFrame(ffmpeg, rutaSalida, compZoom.inicio, path.join(OUT_DIR, "zoom-seg-inicio.jpg"));
    extraerFrame(ffmpeg, rutaSalida, compZoom.fin, path.join(OUT_DIR, "zoom-seg-fin.jpg"));
    console.log(
      `KEN BURNS comparación: inicio=${compZoom.inicio.toFixed(2)}s fin=${compZoom.fin.toFixed(2)}s (segmento con zoom)`
    );
  }

  // volumedetect.
  const vol = volumedetect(ffmpeg, rutaSalida);
  console.log("\n========== VOLUMEDETECT ==========");
  console.log(vol);

  console.log("\nFOTOGRAMAS EXTRAÍDOS:", fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".jpg")).join(", "));
  console.log("DIR:", OUT_DIR);
}

function extraerFrame(ffmpeg: string, video: string, t: number, dest: string) {
  const r = spawnSync(
    ffmpeg,
    ["-ss", t.toFixed(2), "-i", video, "-frames:v", "1", "-q:v", "2", "-y", dest],
    { encoding: "utf8" }
  );
  if (r.status !== 0 || !fs.existsSync(dest)) {
    console.error(`Extracción frame t=${t} FALLÓ:`, r.stderr?.split("\n").slice(-8).join("\n"));
  } else {
    console.log(`  frame t=${t.toFixed(2)}s -> ${dest}`);
  }
}

function probeDuracion(video: string): number {
  const r = spawnSync(
    resolveFfmpeg().replace(/ffmpeg$/, "ffprobe"),
    [],
    { encoding: "utf8" }
  );
  // ffprobe puede no compartir ruta; usamos ffmpeg para leer duración vía stderr.
  const rr = spawnSync(resolveFfmpeg(), ["-i", video, "-hide_banner"], {
    encoding: "utf8",
  });
  const m = rr.stderr?.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (m) {
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  return 15;
}

function probeDims(video: string): string {
  const rr = spawnSync(resolveFfmpeg(), ["-i", video, "-hide_banner"], {
    encoding: "utf8",
  });
  const m = rr.stderr?.match(/, (\d{2,5})x(\d{2,5})[, ]/);
  return m ? `${m[1]}x${m[2]}` : "desconocido";
}

function volumedetect(ffmpeg: string, video: string): string {
  const r = spawnSync(
    ffmpeg,
    ["-i", video, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const lineas = (r.stderr ?? "")
    .split("\n")
    .filter((l) => /volumedetect|mean_volume|max_volume|histogram/.test(l))
    .slice(0, 6);
  return lineas.join("\n") || "(sin salida de volumedetect)";
}

main().catch((e) => {
  console.error("ERROR E2E:", e);
  process.exit(1);
});
