// lib/recorte.ts — QUITAR EL FONDO de una imagen (recortar el sujeto, ej. un auto)
// con rembg, 100% LOCAL en el mini (venv .venv-img). Devuelve un PNG con
// transparencia. Cachea por hash del contenido para no re-procesar en cada render.
//
// SOLO SERVIDOR (usa child_process/fs). Lo usa lib/renderPost.ts.
import fs from "fs";
import { promises as fsp } from "fs";
import os from "os";
import path from "path";
import { createHash } from "crypto";
import { spawn } from "child_process";
import sharp from "sharp";

// El venv vive FUERA del proyecto (si va dentro, Turbopack se rompe con sus symlinks).
const PY = path.join(os.homedir(), ".estudio-venv-img", "bin", "python");
const SCRIPT = path.join(process.cwd(), "scripts", "imgproc", "recortar.py");
const CACHE = path.join(os.tmpdir(), "estudio-recortes");

/** ¿Está disponible el motor de recorte (venv + script)? */
export function recorteDisponible(): boolean {
  return fs.existsSync(PY) && fs.existsSync(SCRIPT);
}

function hashBuf(buf: Buffer): string {
  return createHash("sha1").update(buf).digest("hex").slice(0, 24);
}

/**
 * Quita el fondo de una imagen. Recibe el buffer original (JPEG/PNG) y devuelve
 * un PNG con transparencia (el sujeto recortado). Cacheado en disco por hash.
 * Lanza si el motor no está disponible o rembg falla.
 */
export async function quitarFondo(entrada: Buffer): Promise<Buffer> {
  if (!recorteDisponible()) {
    throw new Error("Motor de recorte no disponible (.venv-img / recortar.py)");
  }
  await fsp.mkdir(CACHE, { recursive: true });
  const h = hashBuf(entrada);
  const outPath = path.join(CACHE, `${h}.png`);
  // cache-hit: ya recortado antes
  try {
    const cached = await fsp.readFile(outPath);
    if (cached.length) return cached;
  } catch {
    /* no cacheado */
  }
  const inPath = path.join(CACHE, `${h}.src`);
  await fsp.writeFile(inPath, entrada);
  await new Promise<void>((resolve, reject) => {
    const ch = spawn(PY, [SCRIPT, inPath, outPath], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    ch.stderr.on("data", (d) => { err += String(d); });
    const to = setTimeout(() => { try { ch.kill("SIGKILL"); } catch { /* */ } reject(new Error("recorte timeout")); }, 120000);
    ch.on("error", (e) => { clearTimeout(to); reject(e); });
    ch.on("exit", (code) => {
      clearTimeout(to);
      code === 0 ? resolve() : reject(new Error("rembg exit " + code + " " + err.slice(0, 160)));
    });
  });
  const raw = await fsp.readFile(outPath);
  fsp.unlink(inPath).catch(() => {});
  // Recorta los márgenes TRANSPARENTES para que el sujeto (el auto) llene el marco
  // y se vea grande al colocarlo (si no, quedaba chico rodeado de vacío). Best-effort.
  try {
    const trimmed = await sharp(raw).trim({ threshold: 10 }).png().toBuffer();
    await fsp.writeFile(outPath, trimmed);   // deja el CACHE ya recortado (para los cache-hit)
    return trimmed;
  } catch {
    return raw;   // si trim falla, se usa el recorte sin recortar márgenes
  }
}
