import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { probeVideo, resolveFfmpeg, resolveFfprobe } from "./ffmpeg";
import { getSupabaseServer } from "./supabase";
import type { TipoAsset } from "./types";

const execFileAsync = promisify(execFile);

// Límite duro de Supabase Storage (plan gratis): 50 MB por archivo. Subimos
// con margen de seguridad y comprimimos apuntando un poco más abajo para que
// el resultado nunca roce el tope.
export const LIMITE_STORAGE_BYTES = 48 * 1024 * 1024;
const OBJETIVO_COMPRESION_BYTES = 42 * 1024 * 1024;

export interface ResultadoCompresion {
  buffer: Buffer;
  nombre: string; // el nombre puede cambiar de extensión a .mp4
  mime: string;
  comprimido: boolean;
}

// Comprime un video que excede el límite de Storage: H.264 1080p (o 720p si
// hace falta más reducción), bitrate calculado para caber en el objetivo.
// Lanza Error con mensaje claro si ni comprimido cabe (videos muy largos).
export async function comprimirVideoParaStorage(
  buffer: Buffer,
  nombre: string
): Promise<ResultadoCompresion> {
  if (buffer.length <= LIMITE_STORAGE_BYTES) {
    return { buffer, nombre, mime: "", comprimido: false };
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "compresion-"));
  const ext = nombre.includes(".") ? nombre.split(".").pop()! : "mp4";
  const entrada = path.join(dir, `entrada.${ext}`);
  const salida = path.join(dir, "salida.mp4");

  try {
    await fs.writeFile(entrada, buffer);
    const probe = await probeVideo(entrada);
    const duracion = probe.durationSeconds;
    if (!duracion || duracion <= 0) {
      throw new Error("No se pudo leer la duración del video para comprimirlo");
    }

    // Bitrate de video disponible para caber en el objetivo (menos ~128 kbps
    // de audio). En bits por segundo.
    const bitsTotales = OBJETIVO_COMPRESION_BYTES * 8;
    const bitrateVideo = Math.floor(bitsTotales / duracion - 128_000);

    // Escala según cuánto hay que apretar: 1080p si el bitrate da para buena
    // calidad; 720p si viene justo; si ni así alcanza, el video es demasiado
    // largo para el límite de 50 MB.
    let ladoMaximo = 1920;
    if (bitrateVideo < 1_200_000) ladoMaximo = 1280;
    if (bitrateVideo < 450_000) {
      const minutos = Math.round(duracion / 60);
      throw new Error(
        `El video dura ~${minutos} min y no cabe en el límite de 50 MB de Supabase ni comprimido. Recórtalo o divídelo en partes más cortas.`
      );
    }

    const escala = `scale='trunc(min(1,${ladoMaximo}/max(iw,ih))*iw/2)*2':'trunc(min(1,${ladoMaximo}/max(iw,ih))*ih/2)*2'`;
    const bitrateFinal = Math.min(bitrateVideo, 8_000_000);

    const correr = async (bps: number) =>
      execFileAsync(
        resolveFfmpeg(),
        [
          "-y", "-i", entrada,
          "-vf", escala,
          "-c:v", "libx264", "-preset", "veryfast",
          "-b:v", String(bps),
          "-maxrate", String(Math.floor(bps * 1.3)),
          "-bufsize", String(bps * 2),
          "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-b:a", "128k",
          "-movflags", "+faststart",
          salida,
        ],
        { timeout: 15 * 60_000, maxBuffer: 64 * 1024 * 1024 }
      );

    await correr(bitrateFinal);
    let resultado = await fs.readFile(salida);

    // Si por overhead quedó sobre el límite, un segundo intento más apretado.
    if (resultado.length > LIMITE_STORAGE_BYTES) {
      const ajustado = Math.floor(
        bitrateFinal * (LIMITE_STORAGE_BYTES / resultado.length) * 0.9
      );
      await correr(Math.max(ajustado, 300_000));
      resultado = await fs.readFile(salida);
    }
    if (resultado.length > LIMITE_STORAGE_BYTES) {
      throw new Error(
        "No se pudo comprimir el video por debajo del límite de 50 MB de Supabase"
      );
    }

    const base = nombre.replace(/\.[^.]+$/, "");
    return {
      buffer: resultado,
      nombre: `${base}.mp4`,
      mime: "video/mp4",
      comprimido: true,
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

// Bucket público donde viven los archivos multimedia de cada proyecto
// (videos, fotos, música, stickers). Cada proyecto usa el prefijo
// "<projectId>/" dentro del bucket.
export const BUCKET_PROYECTOS = "proyectos";

// Crea el bucket "proyectos" si aún no existe (público, igual que el de
// videos editados: las URLs públicas se guardan en project_assets).
export async function ensureBucketProyectos(): Promise<void> {
  const supabase = getSupabaseServer();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(
      `No se pudieron listar los buckets de Storage: ${error.message}`
    );
  }
  if (buckets?.some((b) => b.name === BUCKET_PROYECTOS)) return;

  const { error: createError } = await supabase.storage.createBucket(
    BUCKET_PROYECTOS,
    { public: true }
  );
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(
      `No se pudo crear el bucket '${BUCKET_PROYECTOS}': ${createError.message}`
    );
  }
}

// Deja el nombre de archivo apto para una ruta de Storage: sin tildes,
// sin espacios ni caracteres raros. Conserva la extensión.
export function sanearNombre(nombre: string): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes/diacríticos
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+/, "")
    .replace(/-+$/, "");
  return limpio || "archivo";
}

// Sube un archivo al bucket de proyectos bajo "<projectId>/<uuid>-<nombre>".
// Devuelve la ruta dentro del bucket y la URL pública.
export async function subirAssetProyecto(
  projectId: string,
  nombre: string,
  buffer: Buffer,
  mime: string
): Promise<{ storage_path: string; public_url: string }> {
  await ensureBucketProyectos();
  const supabase = getSupabaseServer();

  const storagePath = `${projectId}/${randomUUID()}-${sanearNombre(nombre)}`;
  const { error } = await supabase.storage
    .from(BUCKET_PROYECTOS)
    .upload(storagePath, buffer, { contentType: mime, upsert: false });
  if (error) {
    throw new Error(`No se pudo subir '${nombre}' a Storage: ${error.message}`);
  }

  const { data } = supabase.storage
    .from(BUCKET_PROYECTOS)
    .getPublicUrl(storagePath);
  return { storage_path: storagePath, public_url: data.publicUrl };
}

// ---------- Subida directa navegador → Supabase Storage ----------
//
// Para saltarse el límite de ~4.5 MB por petición de Vercel, el navegador
// sube los archivos DIRECTO a Supabase Storage con URLs firmadas de subida:
//   1) POST /api/projects/[id]/assets/firmar   → una firma por archivo.
//   2) El navegador hace PUT del archivo a la signedUrl.
//   3) POST /api/projects/[id]/assets/registrar → mueve/comprime, saca
//      metadatos y crea las filas en project_assets.
// Los archivos aterrizan primero en la zona temporal
// "<projectId>/subidas/<uuid>-<nombre>" y `registrar` los deja en su ruta
// definitiva "<projectId>/<uuid>-<nombre>".

/** Prefijo (dentro de la carpeta del proyecto) de la zona temporal de subidas. */
export const PREFIJO_SUBIDAS = "subidas";

export interface FirmaSubidaProyecto {
  nombre: string; // nombre original que mandó el cliente
  ruta: string; // ruta temporal dentro del bucket "proyectos"
  token: string; // token de la firma (por si el cliente usara supabase-js)
  url: string; // signedUrl COMPLETA lista para hacer PUT desde el navegador
}

// Crea una URL firmada de subida para un archivo del proyecto.
//
// CÓMO SE SUBE DESDE EL NAVEGADOR (verificado en el código de
// node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts):
//  - createSignedUploadUrl(ruta) responde { signedUrl, token, path } donde
//    signedUrl = "<URL>/storage/v1/object/upload/sign/<bucket>/<ruta>?token=…"
//    y es válida por 2 horas.
//  - uploadToSignedUrl hace un HTTP **PUT** a esa misma URL con el archivo
//    como body y cabeceras `content-type` y `x-upsert` (opcional, "false"
//    por defecto). No hace falta supabase-js en el cliente: un
//    fetch(signedUrl, { method: "PUT", body: archivo }) equivale.
// Funciona igual en buckets públicos como "proyectos".
export async function crearFirmaSubidaProyecto(
  projectId: string,
  nombre: string
): Promise<FirmaSubidaProyecto> {
  const supabase = getSupabaseServer();
  const ruta = `${projectId}/${PREFIJO_SUBIDAS}/${randomUUID()}-${sanearNombre(nombre)}`;
  const { data, error } = await supabase.storage
    .from(BUCKET_PROYECTOS)
    .createSignedUploadUrl(ruta);
  if (error || !data) {
    throw new Error(
      `No se pudo firmar la subida de '${nombre}': ${error?.message ?? "Supabase no devolvió datos"}`
    );
  }
  return { nombre, ruta, token: data.token, url: data.signedUrl };
}

// Descarga un archivo del bucket de proyectos. Devuelve el contenido y el
// content-type con el que quedó guardado (el que mandó el navegador en el
// PUT firmado), útil para inferir el tipo de asset.
export async function descargarDeBucketProyectos(
  ruta: string
): Promise<{ buffer: Buffer; mime: string | null }> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase.storage
    .from(BUCKET_PROYECTOS)
    .download(ruta);
  if (error || !data) {
    throw new Error(
      `No se pudo descargar '${ruta}' de Storage: ${error?.message ?? "sin datos"}. ¿La subida directa terminó bien?`
    );
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  const mime = data.type && data.type !== "application/octet-stream" ? data.type : null;
  return { buffer, mime };
}

// Mueve un archivo de la zona temporal "subidas/" a su ruta definitiva
// "<projectId>/<uuid>-<nombre saneado>" y devuelve ruta + URL pública.
export async function moverAssetAUbicacionDefinitiva(
  projectId: string,
  rutaOrigen: string,
  nombre: string
): Promise<{ storage_path: string; public_url: string }> {
  const supabase = getSupabaseServer();
  const destino = `${projectId}/${randomUUID()}-${sanearNombre(nombre)}`;
  const { error } = await supabase.storage
    .from(BUCKET_PROYECTOS)
    .move(rutaOrigen, destino);
  if (error) {
    throw new Error(
      `No se pudo mover '${nombre}' a su ubicación definitiva: ${error.message}`
    );
  }
  const { data } = supabase.storage.from(BUCKET_PROYECTOS).getPublicUrl(destino);
  return { storage_path: destino, public_url: data.publicUrl };
}

// MIME de respaldo por extensión (mismo mapa que la ruta clásica de subida,
// para navegadores/subidas que llegan sin Content-Type útil).
export function mimePorExtension(nombre: string): string | null {
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  const mapa: Record<string, string> = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    flac: "audio/flac",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
  };
  return mapa[ext] ?? null;
}

// Infiere el tipo de asset a partir del MIME (misma regla que la ruta
// clásica): video/* → video · audio/* → musica · image/png → sticker ·
// image/* → foto.
export function inferirTipoAsset(mime: string): TipoAsset | null {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "musica";
  if (mime === "image/png") return "sticker";
  if (mime.startsWith("image/")) return "foto";
  return null;
}

// Borra archivos concretos del bucket de proyectos por su storage_path.
// No lanza: el flujo de borrado debe continuar aunque falte algún archivo.
export async function borrarAssetsStorage(paths: string[]): Promise<void> {
  const limpios = paths.filter((p): p is string => Boolean(p));
  if (limpios.length === 0) return;
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.storage
      .from(BUCKET_PROYECTOS)
      .remove(limpios);
    if (error) {
      console.warn(
        `No se pudieron borrar ${limpios.length} archivos del bucket '${BUCKET_PROYECTOS}' (se ignora): ${error.message}`
      );
    }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.warn(
      `Error inesperado al borrar archivos del bucket '${BUCKET_PROYECTOS}' (se ignora): ${mensaje}`
    );
  }
}

// Borra TODO lo que quede bajo el prefijo "<projectId>/" del bucket
// (red de seguridad por si algún asset quedó sin fila en la base).
// No lanza: solo registra advertencias.
export async function borrarCarpetaProyecto(projectId: string): Promise<void> {
  if (!projectId) return;
  try {
    const supabase = getSupabaseServer();
    const { data: archivos, error } = await supabase.storage
      .from(BUCKET_PROYECTOS)
      .list(projectId, { limit: 1000 });
    if (error) {
      console.warn(
        `No se pudo listar la carpeta '${projectId}' del bucket '${BUCKET_PROYECTOS}' (se ignora): ${error.message}`
      );
      return;
    }
    const rutas = (archivos ?? []).map((a) => `${projectId}/${a.name}`);
    if (rutas.length === 0) return;
    const { error: removeError } = await supabase.storage
      .from(BUCKET_PROYECTOS)
      .remove(rutas);
    if (removeError) {
      console.warn(
        `No se pudo vaciar la carpeta '${projectId}' del bucket '${BUCKET_PROYECTOS}' (se ignora): ${removeError.message}`
      );
    }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.warn(
      `Error inesperado al vaciar la carpeta '${projectId}' (se ignora): ${mensaje}`
    );
  }
}

// ---------- Metadatos de un asset (duración / dimensiones) ----------

export interface ProbeAsset {
  duracion_seconds: number | null;
  ancho: number | null;
  alto: number | null;
}

const PROBE_VACIO: ProbeAsset = {
  duracion_seconds: null,
  ancho: null,
  alto: null,
};

// Obtiene duración y dimensiones de un archivo multimedia en memoria.
// Escribe el buffer a un archivo temporal y lo analiza con ffprobe:
//  - videos: duración + ancho/alto (via probeVideo de lib/ffmpeg).
//  - audios: probeVideo lanza ("no contiene pista de video"), así que se cae
//    a un ffprobe directo que saca la duración del formato (sin dimensiones).
//  - imágenes: dimensiones del stream; la duración que reporte ffprobe para
//    una imagen fija no es significativa (el llamador la ignora para fotos).
// Nunca lanza: si el análisis falla, devuelve todo null. Limpia el temporal.
export async function probeAssetBuffer(
  buffer: Buffer,
  ext: string
): Promise<ProbeAsset> {
  const extLimpia = ext.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  const tmpPath = path.join(
    os.tmpdir(),
    `proyecto-asset-${randomUUID()}.${extLimpia}`
  );

  try {
    await fs.writeFile(tmpPath, buffer);
    try {
      const probe = await probeVideo(tmpPath);
      return {
        duracion_seconds:
          probe.durationSeconds > 0 ? probe.durationSeconds : null,
        ancho: probe.width > 0 ? probe.width : null,
        alto: probe.height > 0 ? probe.height : null,
      };
    } catch {
      // Sin pista de video (audio) o formato que probeVideo no acepta:
      // ffprobe directo para rescatar lo que se pueda.
      return await probeConFfprobe(tmpPath);
    }
  } catch {
    return PROBE_VACIO;
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}

interface FfprobeStreamMin {
  codec_type?: string;
  width?: number;
  height?: number;
  duration?: string;
}

// ffprobe genérico (show_format + show_streams): sirve para audios (duración)
// e imágenes (dimensiones). Devuelve null en lo que no pueda determinar.
async function probeConFfprobe(ruta: string): Promise<ProbeAsset> {
  try {
    const { stdout } = await execFileAsync(
      resolveFfprobe(),
      [
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        ruta,
      ],
      { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 }
    );

    const info = JSON.parse(stdout) as {
      streams?: FfprobeStreamMin[];
      format?: { duration?: string };
    };
    const streams = info.streams ?? [];
    const conDimensiones = streams.find((s) => s.width && s.height);
    const duracionCruda = parseFloat(
      info.format?.duration ?? streams[0]?.duration ?? ""
    );

    return {
      duracion_seconds:
        Number.isFinite(duracionCruda) && duracionCruda > 0
          ? duracionCruda
          : null,
      ancho: conDimensiones?.width ?? null,
      alto: conDimensiones?.height ?? null,
    };
  } catch {
    return PROBE_VACIO;
  }
}

// ---------- Mensajes de error de PostgREST ----------

// Si el error viene de que las tablas nuevas (projects / project_assets)
// aún no existen en el Supabase real, agrega la pista de cómo arreglarlo.
export function mensajeErrorPostgrest(mensaje: string): string {
  if (/does not exist|schema cache/i.test(mensaje)) {
    return (
      `${mensaje}. Es probable que falten las tablas de proyectos: ` +
      "ejecuta supabase/schema.sql en el SQL Editor de Supabase."
    );
  }
  return mensaje;
}
