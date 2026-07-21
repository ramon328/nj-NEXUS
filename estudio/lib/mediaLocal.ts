// Almacén de media en DISCO LOCAL de la instancia que corre el motor de
// render (el Mac mini en producción, esta Mac en local).
//
// POR QUÉ EXISTE: Supabase Storage rechaza archivos de más de 50 MB (413) —
// la subida directa firmada (assets/firmar → PUT → assets/registrar) FALLA
// para videos grandes — y el túnel gratuito de Cloudflare corta cuerpos de
// más de 100 MB. La solución canónica: los videos grandes se suben EN TROZOS
// de ~25 MB a /api/media/subir, se ensamblan aquí en disco y la propia app
// los sirve con soporte de Range desde /api/media/archivo/....
//
// La fila de project_assets usa storage_path "mini:<ruta-relativa>" (el
// prefijo distingue estos archivos de los que viven en Supabase Storage) y
// public_url apuntando a /api/media/archivo/....

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { createReadStream, createWriteStream, mkdirSync } from "fs";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream/promises";
import { probeVideo } from "./ffmpeg";
import {
  inferirTipoAsset,
  mensajeErrorPostgrest,
  mimePorExtension,
  sanearNombre,
} from "./proyectos";
import { getSupabaseServer } from "./supabase";
import type { ProyectoAsset } from "./types";

/** Prefijo de storage_path que marca un asset guardado en disco local. */
export const PREFIJO_MEDIA_LOCAL = "mini:";

// Identificadores que terminan en rutas de disco: solo caracteres seguros.
const REGEX_UPLOAD_ID = /^[a-zA-Z0-9_-]{8,80}$/;
const REGEX_PROJECT_ID = /^[a-zA-Z0-9-]{1,64}$/;

// Tope defensivo de trozos que la librería acepta (la ruta de subida aplica
// su propio límite de negocio, más bajo).
const MAX_TROZOS_LIB = 200;

// ---------------------------------------------------------------------------
// Carpeta raíz del almacén
// ---------------------------------------------------------------------------

/**
 * Carpeta raíz del almacén local de media. Configurable con MEDIA_DIR; por
 * defecto ~/EstudioMedia. Se crea (recursivo) si no existe.
 */
export function dirMedia(): string {
  const dir =
    process.env.MEDIA_DIR || path.join(os.homedir(), "EstudioMedia");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Carpeta temporal de subidas por trozos dentro del almacén. */
function dirTmp(): string {
  return path.join(dirMedia(), "tmp");
}

// ---------------------------------------------------------------------------
// Subida por trozos: guardar + ensamblar
// ---------------------------------------------------------------------------

function validarUploadId(uploadId: string): void {
  if (!REGEX_UPLOAD_ID.test(uploadId)) {
    throw new Error(
      "uploadId inválido: usa entre 8 y 80 caracteres alfanuméricos, guiones o guiones bajos (por ejemplo un UUID)"
    );
  }
}

function validarIndice(indice: number): void {
  if (!Number.isInteger(indice) || indice < 0 || indice >= MAX_TROZOS_LIB) {
    throw new Error(
      `Índice de trozo inválido: debe ser un entero entre 0 y ${MAX_TROZOS_LIB - 1}`
    );
  }
}

/**
 * Guarda un trozo de una subida en dirMedia()/tmp/<uploadId>/<indice>.part.
 * Devuelve cuántos trozos hay recibidos (archivos .part) tras guardarlo.
 */
export async function guardarTrozo(
  uploadId: string,
  indice: number,
  buffer: Buffer
): Promise<number> {
  validarUploadId(uploadId);
  validarIndice(indice);

  const dir = path.join(dirTmp(), uploadId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${indice}.part`), buffer);

  const archivos = await fs.readdir(dir);
  return archivos.filter((a) => a.endsWith(".part")).length;
}

/**
 * Ensambla los `total` trozos de una subida (en orden 0..total-1) en un solo
 * archivo, en streaming (nunca carga todo en RAM). Valida que estén TODOS los
 * trozos, limpia la carpeta temporal y devuelve la ruta del archivo final
 * (dirMedia()/tmp/<uploadId>.listo), listo para registrarVideoLocal.
 */
export async function ensamblar(
  uploadId: string,
  total: number
): Promise<string> {
  validarUploadId(uploadId);
  if (!Number.isInteger(total) || total < 1 || total > MAX_TROZOS_LIB) {
    throw new Error(
      `Total de trozos inválido: debe ser un entero entre 1 y ${MAX_TROZOS_LIB}`
    );
  }

  const dir = path.join(dirTmp(), uploadId);
  const partes: string[] = [];
  const faltantes: number[] = [];
  for (let i = 0; i < total; i++) {
    const parte = path.join(dir, `${i}.part`);
    const stat = await fs.stat(parte).catch(() => null);
    if (!stat || !stat.isFile()) {
      faltantes.push(i);
    } else {
      partes.push(parte);
    }
  }
  if (faltantes.length > 0) {
    throw new Error(
      `Faltan trozos de la subida '${uploadId}': ${faltantes.join(", ")} de ${total}. Vuelve a subirlos antes de ensamblar.`
    );
  }

  // Concatenar en orden con un generador que va entregando los bytes de cada
  // trozo: pipeline los escribe al destino sin cargar el video entero en RAM.
  const destino = path.join(dirTmp(), `${uploadId}.listo`);
  async function* concatenar() {
    for (const parte of partes) {
      yield* createReadStream(parte);
    }
  }
  await pipeline(concatenar(), createWriteStream(destino));

  // Limpiar los trozos: el archivo ensamblado es la única copia que queda.
  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  return destino;
}

// ---------------------------------------------------------------------------
// Registro del archivo final como asset del proyecto
// ---------------------------------------------------------------------------

/**
 * Mueve el archivo ensamblado a su ubicación definitiva
 * dirMedia()/proyectos/<projectId>/<uuid>-<nombre saneado>, saca metadatos
 * con ffprobe e inserta la fila en project_assets con:
 *  - storage_path "mini:proyectos/<projectId>/<archivo>"
 *  - public_url (MEDIA_PUBLIC_URL || "") + "/api/media/archivo/proyectos/..."
 *    (si MEDIA_PUBLIC_URL está vacía la URL queda RELATIVA y el front la
 *    resuelve contra el origen del backend).
 * Devuelve la fila insertada. Si algo falla, limpia el archivo y lanza.
 */
export async function registrarVideoLocal(
  projectId: string,
  nombre: string,
  rutaArchivoFinal: string
): Promise<ProyectoAsset> {
  if (!REGEX_PROJECT_ID.test(projectId)) {
    throw new Error("projectId inválido para el almacén local de media");
  }
  const nombreLimpio = nombre.trim() || "archivo";

  // Tipo por extensión/MIME. Sin tipo no hay asset: mejor fallar claro aquí.
  const mime = mimePorExtension(nombreLimpio);
  const tipo = mime ? inferirTipoAsset(mime) : null;
  if (!tipo) {
    await fs.unlink(rutaArchivoFinal).catch(() => {});
    throw new Error(
      `No se pudo determinar el tipo de '${nombreLimpio}' por su extensión (usa video, foto, audio, música o sticker)`
    );
  }

  // Mover a la ubicación definitiva (rename; copia si cruza de disco).
  const carpeta = path.join(dirMedia(), "proyectos", projectId);
  await fs.mkdir(carpeta, { recursive: true });
  const archivo = `${randomUUID()}-${sanearNombre(nombreLimpio)}`;
  const destino = path.join(carpeta, archivo);
  try {
    await fs.rename(rutaArchivoFinal, destino);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EXDEV") {
      await fs.copyFile(rutaArchivoFinal, destino);
      await fs.unlink(rutaArchivoFinal).catch(() => {});
    } else {
      throw err;
    }
  }

  const storagePath = `${PREFIJO_MEDIA_LOCAL}proyectos/${projectId}/${archivo}`;
  const base = (process.env.MEDIA_PUBLIC_URL || "").replace(/\/+$/, "");
  const publicUrl = `${base}/api/media/archivo/proyectos/${projectId}/${archivo}`;

  try {
    // Metadatos reales del archivo en disco (sin cargarlo en RAM). probeVideo
    // lanza para audios/imágenes: en ese caso se guardan metadatos nulos.
    const stat = await fs.stat(destino);
    let duracion: number | null = null;
    let ancho: number | null = null;
    let alto: number | null = null;
    try {
      const probe = await probeVideo(destino);
      duracion = probe.durationSeconds > 0 ? probe.durationSeconds : null;
      ancho = probe.width > 0 ? probe.width : null;
      alto = probe.height > 0 ? probe.height : null;
    } catch {
      // Sin pista de video (o formato no analizable): metadatos nulos.
    }
    if (tipo === "foto" || tipo === "sticker") duracion = null;

    const supabase = getSupabaseServer();
    const { data: asset, error: insertError } = await supabase
      .from("project_assets")
      .insert({
        project_id: projectId,
        tipo,
        nombre: nombreLimpio,
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: mime,
        duracion_seconds: duracion,
        ancho,
        alto,
        size_bytes: stat.size,
        drive_file_id: null,
      })
      .select("*")
      .single<ProyectoAsset>();

    if (insertError || !asset) {
      throw new Error(
        `No se pudo registrar el asset en la base: ${mensajeErrorPostgrest(insertError?.message ?? "sin datos")}`
      );
    }
    return asset;
  } catch (err) {
    // Sin fila no hay asset: no dejar el archivo huérfano en disco.
    await fs.unlink(destino).catch(() => {});
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Resolución de rutas y borrado
// ---------------------------------------------------------------------------

/**
 * Ruta absoluta en disco de un asset local ("mini:<ruta-relativa>").
 * Devuelve null si el storage_path no es local o si la ruta resuelta queda
 * FUERA de dirMedia() (defensa contra "../" y rutas absolutas).
 */
export function rutaLocalDeAsset(storagePath: string): string | null {
  if (!storagePath.startsWith(PREFIJO_MEDIA_LOCAL)) return null;
  const relativa = storagePath.slice(PREFIJO_MEDIA_LOCAL.length);
  if (!relativa) return null;

  const base = dirMedia();
  const resuelta = path.resolve(base, relativa);
  if (resuelta === base || !resuelta.startsWith(base + path.sep)) return null;
  return resuelta;
}

/** Borra el archivo local de un asset "mini:...". Best-effort: nunca lanza. */
export async function borrarMediaLocal(storagePath: string): Promise<void> {
  const ruta = rutaLocalDeAsset(storagePath);
  if (!ruta) return;
  await fs.unlink(ruta).catch(() => {});
}

// ---------------------------------------------------------------------------
// Almacén genérico de archivos en el disco del motor (mini). Igual que los
// videos, pero para cualquier archivo (p. ej. los PNG de los slides de un
// post). La ruta relativa va SIN el prefijo "mini:" y sin barra inicial,
// ej. "posts/<disenoId>/0.png". Devuelve la URL pública que sirve
// /api/media/archivo/... (absoluta con MEDIA_PUBLIC_URL, o relativa si vacía).
// ---------------------------------------------------------------------------

// Normaliza una ruta relativa y garantiza que quede DENTRO de dirMedia().
function rutaMediaSegura(rutaRelativa: string): string {
  const limpia = rutaRelativa.replace(/^[/\\]+/, "");
  const destino = path.resolve(dirMedia(), limpia);
  const raiz = path.resolve(dirMedia());
  if (destino !== raiz && !destino.startsWith(raiz + path.sep)) {
    throw new Error(`Ruta de media fuera del almacén: ${rutaRelativa}`);
  }
  return destino;
}

/** URL pública (absoluta o relativa) para una ruta relativa del almacén. */
export function urlPublicaMedia(rutaRelativa: string): string {
  const limpia = rutaRelativa.replace(/^[/\\]+/, "");
  const base = (process.env.MEDIA_PUBLIC_URL || "").replace(/\/+$/, "");
  return `${base}/api/media/archivo/${limpia}`;
}

/** Guarda un archivo en el disco del motor y devuelve su URL pública. */
export async function guardarArchivoMedia(
  rutaRelativa: string,
  contenido: Buffer
): Promise<string> {
  const destino = rutaMediaSegura(rutaRelativa);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, contenido);
  return urlPublicaMedia(rutaRelativa);
}

/** Borra una carpeta entera del almacén (best-effort). */
export async function borrarCarpetaMedia(rutaRelativa: string): Promise<void> {
  try {
    const destino = rutaMediaSegura(rutaRelativa);
    await fs.rm(destino, { recursive: true, force: true });
  } catch {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// Tokens de subida (HMAC): el front (Vercel) los firma con el MISMO
// BACKEND_SECRET que comparte con el mini, así el mini los valida sin hablar
// con nadie. Formato: "<expEpochMs>.<firma hex>".
// ---------------------------------------------------------------------------

function claveMedia(): string {
  return (
    process.env.BACKEND_SECRET || process.env.APP_PASSWORD || "local-abierto"
  );
}

/**
 * Firma un token de subida de media para un proyecto, válido hasta
 * `expEpoch` (epoch en MILISEGUNDOS, p. ej. Date.now() + 2h).
 */
export function firmarTokenMedia(projectId: string, expEpoch: number): string {
  const exp = Math.floor(expEpoch);
  const firma = createHmac("sha256", claveMedia())
    .update(`${projectId}.${exp}`)
    .digest("hex");
  return `${exp}.${firma}`;
}

/**
 * Valida un token de subida para un proyecto: expiración vigente y firma
 * HMAC correcta (comparación en tiempo constante).
 */
export function validarTokenMedia(token: string, projectId: string): boolean {
  const partes = token.split(".");
  if (partes.length !== 2) return false;

  const exp = Number(partes[0]);
  if (!Number.isInteger(exp) || exp <= Date.now()) return false;

  const esperada = createHmac("sha256", claveMedia())
    .update(`${projectId}.${exp}`)
    .digest();
  let recibida: Buffer;
  try {
    recibida = Buffer.from(partes[1], "hex");
  } catch {
    return false;
  }
  if (recibida.length !== esperada.length) return false;
  return timingSafeEqual(recibida, esperada);
}
