// Auto-chequeo del backend de edición (Mac mini 24/7).
//
// Verifica TODO lo que el sistema de edición necesita para funcionar:
// Node, ffmpeg/ffprobe, whisper.cpp + modelo, render de humo de Remotion,
// variables de entorno, conexión real a Supabase, APP_PASSWORD y el puerto
// 3000. Imprime una tabla con OK/FALLO y un consejo de arreglo por cada ítem
// que falle. Sale con código 0 SOLO si todo pasa — pensado para correrlo en
// loop hasta que quede todo en verde:
//
//   npx --yes tsx scripts/verificar-backend.mts
//
// (ejecútalo desde la raíz del repo; el script se re-ancla solo igualmente)

import { spawnSync } from "child_process";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { resolveFfmpeg, resolveFfprobe } from "../lib/ffmpeg";
import type { ExecutableEditPlan } from "../lib/types";

// ---------- Anclaje a la raíz del repo (para public/, remotion/, .env.local) ----------

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(RAIZ);

// ---------- Carga manual de .env.local (tsx no lo carga solo, Next sí) ----------

function cargarEnvLocal(): boolean {
  const ruta = path.join(RAIZ, ".env.local");
  if (!fs.existsSync(ruta)) return false;
  for (const linea of fs.readFileSync(ruta, "utf8").split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;
    const igual = limpia.indexOf("=");
    if (igual <= 0) continue;
    const clave = limpia.slice(0, igual).replace(/^export\s+/, "").trim();
    let valor = limpia.slice(igual + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    if (clave && process.env[clave] === undefined) process.env[clave] = valor;
  }
  return true;
}

// ---------- Infraestructura de chequeos ----------

interface Resultado {
  item: string;
  ok: boolean;
  detalle: string;
  consejo?: string;
}

function mensajeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function rutaComando(cmd: string): string | null {
  const res = spawnSync("which", [cmd], { encoding: "utf8" });
  if (res.status === 0) {
    const ruta = res.stdout?.trim();
    if (ruta) return ruta;
  }
  return null;
}

// ---------- Chequeos individuales ----------

function chequearNode(): Resultado {
  const version = process.versions.node;
  const mayor = Number(version.split(".")[0]);
  return {
    item: "Node >= 20",
    ok: mayor >= 20,
    detalle: `v${version}`,
    consejo:
      mayor >= 20
        ? undefined
        : "Instala Node 20 o superior: brew install node (y abre una terminal nueva).",
  };
}

function chequearFfmpeg(): Resultado {
  try {
    const bin = resolveFfmpeg();
    const res = spawnSync(bin, ["-version"], { encoding: "utf8" });
    if (res.status !== 0) {
      throw new Error(`"${bin} -version" terminó con código ${res.status}`);
    }
    const primeraLinea = res.stdout.split("\n")[0]?.trim() ?? "";
    return { item: "ffmpeg", ok: true, detalle: `${bin} — ${primeraLinea}` };
  } catch (e) {
    return {
      item: "ffmpeg",
      ok: false,
      detalle: mensajeError(e),
      consejo:
        "Reinstala las dependencias (npm install) para recuperar ffmpeg-static, o instala el del sistema: brew install ffmpeg.",
    };
  }
}

function chequearFfprobe(): Resultado {
  try {
    const bin = resolveFfprobe();
    const res = spawnSync(bin, ["-version"], { encoding: "utf8" });
    if (res.status !== 0) {
      throw new Error(`"${bin} -version" terminó con código ${res.status}`);
    }
    const primeraLinea = res.stdout.split("\n")[0]?.trim() ?? "";
    return { item: "ffprobe", ok: true, detalle: `${bin} — ${primeraLinea}` };
  } catch (e) {
    return {
      item: "ffprobe",
      ok: false,
      detalle: mensajeError(e),
      consejo:
        "Reinstala las dependencias (npm install) para recuperar ffprobe-static, o instala el del sistema: brew install ffmpeg.",
    };
  }
}

// whisper.cpp: mismos candidatos y misma ruta de modelo que lib/transcribe.ts.
const RUTA_MODELO_WHISPER =
  process.env.WHISPER_MODEL ||
  path.join(os.homedir(), ".cache", "whisper-models", "ggml-base.bin");

const CONSEJO_WHISPER = [
  "Instala whisper.cpp y descarga el modelo base:",
  "  brew install whisper-cpp",
  "  mkdir -p ~/.cache/whisper-models",
  "  curl -L -o ~/.cache/whisper-models/ggml-base.bin \\",
  "    https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
].join("\n");

function chequearWhisperBinario(): Resultado {
  const bin =
    rutaComando("whisper-cli") ??
    rutaComando("whisper-cpp") ??
    rutaComando("whisper");
  return {
    item: "whisper-cli en PATH",
    ok: Boolean(bin),
    detalle: bin ?? "no se encontró whisper-cli / whisper-cpp / whisper",
    consejo: bin ? undefined : CONSEJO_WHISPER,
  };
}

function chequearWhisperModelo(): Resultado {
  const existe = fs.existsSync(RUTA_MODELO_WHISPER);
  let detalle = RUTA_MODELO_WHISPER;
  let ok = existe;
  if (existe) {
    const mb = fs.statSync(RUTA_MODELO_WHISPER).size / (1024 * 1024);
    detalle += ` (${mb.toFixed(0)} MB)`;
    // El modelo base pesa ~142 MB; menos de 50 MB delata una descarga cortada.
    if (mb < 50) {
      ok = false;
      detalle += " — parece una descarga incompleta";
    }
  }
  return {
    item: "modelo whisper (ggml-base.bin)",
    ok,
    detalle,
    consejo: ok
      ? undefined
      : `${CONSEJO_WHISPER}\n(si el archivo existe pero está corrupto, bórralo primero: rm "${RUTA_MODELO_WHISPER}")`,
  };
}

// Render de humo de Remotion: 2 segundos de capa de gráficos (texto + barra de
// progreso + subtítulo karaoke) a .mov con alpha, usando lib/overlay.ts tal
// cual lo usa el motor real. Si no hay navegador, ensureBrowser() hace que
// Remotion descargue su propio Chromium headless.
async function chequearRemotion(): Promise<Resultado> {
  const item = "render Remotion (humo 2 s)";
  let dirTmp: string | null = null;
  try {
    const { ensureBrowser } = await import("@remotion/renderer");
    await ensureBrowser();

    const { planAOverlayProps, renderOverlayPro } = await import(
      "../lib/overlay"
    );

    const plan: ExecutableEditPlan = {
      resumen: "Humo de verificación del backend",
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
          texto: "backend listo",
          desde: 0.2,
          hasta: 1.8,
          palabras: [
            { palabra: "backend", desde: 0.2, hasta: 1.0 },
            { palabra: "listo", desde: 1.0, hasta: 1.8 },
          ],
        },
      ],
      segmentos: [{ desde: 0, hasta: 2, velocidad: 1 }],
      textos: [
        {
          texto: "VERIFICACIÓN",
          desde: 0.1,
          hasta: 1.9,
          posicion: "centro",
          estilo: "caja",
          fuente: null,
          color: "blanco",
          animacion: "fundido",
        },
      ],
      stickers: [],
    };

    dirTmp = fs.mkdtempSync(path.join(os.tmpdir(), "verificar-overlay-"));
    const salida = path.join(dirTmp, "humo.mov");
    const props = planAOverlayProps(plan, 1, 2);
    await renderOverlayPro(props, 2, salida);

    if (!fs.existsSync(salida)) {
      throw new Error("el render terminó pero no dejó el archivo .mov");
    }
    const kb = fs.statSync(salida).size / 1024;
    if (kb < 5) {
      throw new Error(`el .mov salió sospechosamente pequeño (${kb.toFixed(1)} KB)`);
    }
    return { item, ok: true, detalle: `.mov con alpha de ${kb.toFixed(0)} KB` };
  } catch (e) {
    return {
      item,
      ok: false,
      detalle: mensajeError(e),
      consejo: [
        "Suele ser el navegador headless de Remotion. Fuerza su descarga con:",
        "  npx remotion browser ensure",
        "y vuelve a correr este script. Si el error es de bundle/render, revisa",
        "que npm install haya terminado sin errores y que exista remotion/index.ts.",
      ].join("\n"),
    };
  } finally {
    if (dirTmp) fs.rmSync(dirTmp, { recursive: true, force: true });
  }
}

function chequearVariable(
  nombre: string,
  consejo: string,
  opciones?: { secreta?: boolean }
): Resultado {
  const valor = process.env[nombre]?.trim();
  const ok = Boolean(valor);
  let detalle = "no definida en .env.local";
  if (ok && valor) {
    detalle = opciones?.secreta
      ? `definida (${valor.length} caracteres)`
      : valor.length > 48
        ? `${valor.slice(0, 45)}...`
        : valor;
  }
  return { item: nombre, ok, detalle, consejo: ok ? undefined : consejo };
}

async function chequearSupabaseConexion(): Promise<Resultado> {
  const item = "conexión real a Supabase";
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return {
      item,
      ok: false,
      detalle: "sin credenciales — se omite la prueba de conexión",
      consejo:
        "Completa primero NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.",
    };
  }
  try {
    const { getSupabaseServer } = await import("../lib/supabase");
    const supabase = getSupabaseServer();
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw new Error(error.message);
    return {
      item,
      ok: true,
      detalle: `Storage responde (${data?.length ?? 0} buckets)`,
    };
  } catch (e) {
    return {
      item,
      ok: false,
      detalle: mensajeError(e),
      consejo:
        "Revisa que NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY sean los del proyecto correcto (Project Settings → API en supabase.com) y que el mini tenga internet.",
    };
  }
}

function puertoEnUso(puerto: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port: puerto, host: "127.0.0.1" });
    const terminar = (enUso: boolean) => {
      socket.destroy();
      resolve(enUso);
    };
    socket.once("connect", () => terminar(true));
    socket.once("error", () => terminar(false));
    socket.setTimeout(1500, () => terminar(false));
  });
}

async function chequearPuerto3000(): Promise<Resultado> {
  const item = "puerto 3000";
  const enUso = await puertoEnUso(3000);
  if (!enUso) {
    return { item, ok: true, detalle: "libre — listo para npm run start" };
  }
  // Hay algo escuchando: comprobar si es ESTA app (su endpoint de salud).
  try {
    const res = await fetch("http://localhost:3000/api/salud", {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return { item, ok: true, detalle: "la app ya está corriendo (/api/salud responde)" };
    }
    return {
      item,
      ok: false,
      detalle: `hay un servidor en :3000 pero /api/salud respondió ${res.status}`,
      consejo:
        "Si es una versión vieja de la app, reiníciala (launchctl unload/load del LaunchAgent o corta el npm run dev). Si es otro proceso, identifícalo con: lsof -i :3000",
    };
  } catch {
    return {
      item,
      ok: false,
      detalle: "hay un proceso ocupando el puerto 3000 que no responde HTTP",
      consejo: "Identifícalo y ciérralo: lsof -i :3000 && kill <PID>",
    };
  }
}

// ---------- Ejecución y tabla ----------

const VERDE = "\x1b[32m";
const ROJO = "\x1b[31m";
const GRIS = "\x1b[90m";
const RESET = "\x1b[0m";

function imprimirTabla(resultados: Resultado[]): void {
  const anchoItem = Math.max(...resultados.map((r) => r.item.length), 4) + 2;
  const linea = "─".repeat(anchoItem + 60);
  console.log(`\n${linea}`);
  console.log(` ${"ÍTEM".padEnd(anchoItem)}ESTADO    DETALLE`);
  console.log(linea);
  for (const r of resultados) {
    const estado = r.ok ? `${VERDE}✓ OK${RESET}    ` : `${ROJO}✗ FALLO${RESET} `;
    console.log(` ${r.item.padEnd(anchoItem)}${estado} ${GRIS}${r.detalle}${RESET}`);
  }
  console.log(linea);

  const fallos = resultados.filter((r) => !r.ok);
  if (fallos.length) {
    console.log(`\n${ROJO}Cómo arreglar cada fallo:${RESET}\n`);
    for (const f of fallos) {
      console.log(`• ${f.item}:`);
      console.log(
        (f.consejo ?? "Revisa el detalle del error de arriba.")
          .split("\n")
          .map((l) => `    ${l}`)
          .join("\n")
      );
      console.log("");
    }
  }
}

async function main(): Promise<void> {
  console.log("Verificación del backend de edición (Mac mini)");
  console.log(`Repo: ${RAIZ}\n`);

  const hayEnv = cargarEnvLocal();
  const resultados: Resultado[] = [];

  const correr = async (
    etiqueta: string,
    fn: () => Resultado | Promise<Resultado>
  ) => {
    process.stdout.write(`→ ${etiqueta}... `);
    const r = await fn();
    console.log(r.ok ? `${VERDE}OK${RESET}` : `${ROJO}FALLO${RESET}`);
    resultados.push(r);
  };

  await correr("Node", chequearNode);
  await correr("ffmpeg", chequearFfmpeg);
  await correr("ffprobe", chequearFfprobe);
  await correr("whisper (binario)", chequearWhisperBinario);
  await correr("whisper (modelo)", chequearWhisperModelo);

  await correr(".env.local", () => ({
    item: "archivo .env.local",
    ok: hayEnv,
    detalle: hayEnv ? path.join(RAIZ, ".env.local") : "no existe en la raíz del repo",
    consejo: hayEnv
      ? undefined
      : "Crea .env.local en la raíz del repo pegando el contenido del .env.local del Mac de Ramón (ver docs/mac-mini/INSTRUCCIONES-AGENTE.md, fase 1).",
  }));
  await correr("NEXT_PUBLIC_SUPABASE_URL", () =>
    chequearVariable(
      "NEXT_PUBLIC_SUPABASE_URL",
      "Cópiala del .env.local del otro Mac (Project Settings → API en supabase.com)."
    )
  );
  await correr("NEXT_PUBLIC_SUPABASE_ANON_KEY", () =>
    chequearVariable(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "Cópiala del .env.local del otro Mac (Project Settings → API en supabase.com).",
      { secreta: true }
    )
  );
  await correr("SUPABASE_SERVICE_ROLE_KEY", () =>
    chequearVariable(
      "SUPABASE_SERVICE_ROLE_KEY",
      "Cópiala del .env.local del otro Mac (Project Settings → API en supabase.com). Es secreta: solo vive en el servidor.",
      { secreta: true }
    )
  );
  await correr("ANTHROPIC_API_KEY", () =>
    chequearVariable(
      "ANTHROPIC_API_KEY",
      "Cópiala del .env.local del otro Mac o crea una nueva en platform.claude.com.",
      { secreta: true }
    )
  );
  await correr("BACKEND_SECRET", () =>
    chequearVariable(
      "BACKEND_SECRET",
      'Genera uno nuevo y agrégalo a .env.local:\n  echo "BACKEND_SECRET=$(openssl rand -hex 24)" >> .env.local\nEse mismo valor se configura después en Vercel para conectar el front.',
      { secreta: true }
    )
  );
  await correr("APP_PASSWORD", () =>
    chequearVariable(
      "APP_PASSWORD",
      "En el Mac mini es OBLIGATORIA (el equipo queda expuesto por el túnel). Agrégala a .env.local: APP_PASSWORD=<la misma contraseña que usa el front>.",
      { secreta: true }
    )
  );
  await correr("conexión a Supabase", chequearSupabaseConexion);
  await correr("puerto 3000", chequearPuerto3000);

  console.log(
    `${GRIS}\nEl siguiente chequeo renderiza 2 s de gráficos con Remotion; la primera vez puede tardar varios minutos (bundle + descarga de Chromium headless).${RESET}`
  );
  await correr("render Remotion de humo", chequearRemotion);

  imprimirTabla(resultados);

  const fallos = resultados.filter((r) => !r.ok).length;
  if (fallos === 0) {
    console.log(`${VERDE}TODO EN VERDE ✓ — el backend de edición está listo.${RESET}\n`);
    process.exit(0);
  }
  console.log(
    `${ROJO}${fallos} ítem(s) en rojo.${RESET} Arregla lo indicado y vuelve a correr:\n  npx --yes tsx scripts/verificar-backend.mts\n`
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(`\n${ROJO}Error inesperado del verificador:${RESET}`, mensajeError(e));
  process.exit(1);
});
