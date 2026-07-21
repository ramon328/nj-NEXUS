import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { resolveFfprobe } from "./ffmpeg";

// Catálogo de medios locales (música, stickers y fuentes) disponibles en /public.
// Se usa para armar el prompt de la IA y para validar los planes de edición.

export interface PistaMusica {
  archivo: string;
  duracionSegundos?: number;
}

export interface StickerDisponible {
  archivo: string;
}

export interface FuenteDisponible {
  archivo: string;
}

export interface EfectoSonidoDisponible {
  archivo: string;
}

// Caché de duraciones para no invocar ffprobe más de una vez por archivo.
const cacheDuraciones = new Map<string, number>();

// Duración de un archivo de audio en segundos (mejor esfuerzo, síncrono).
function duracionAudio(ruta: string): number | undefined {
  const cacheada = cacheDuraciones.get(ruta);
  if (cacheada !== undefined) return cacheada;
  try {
    const res = spawnSync(resolveFfprobe(), [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      ruta,
    ]);
    if (res.status === 0) {
      const dur = parseFloat(res.stdout?.toString().trim() ?? "");
      if (Number.isFinite(dur) && dur > 0) {
        const redondeada = Math.round(dur * 10) / 10;
        cacheDuraciones.set(ruta, redondeada);
        return redondeada;
      }
    }
  } catch {
    // Sin ffprobe disponible se omite la duración: es un dato opcional.
  }
  return undefined;
}

// Lista los archivos de un directorio de /public filtrados por extensión.
function listarArchivos(subdir: string, extensiones: string[]): string[] {
  const dir = path.join(process.cwd(), "public", subdir);
  if (!fs.existsSync(dir)) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => extensiones.some((ext) => f.toLowerCase().endsWith(ext)))
      .sort();
  } catch {
    return [];
  }
}

// Pistas de música de public/musica (.mp3), con su duración si se puede leer.
// Son loops cortos: el renderer las repite hasta cubrir el video completo.
export function listarMusica(): PistaMusica[] {
  const dir = path.join(process.cwd(), "public", "musica");
  return listarArchivos("musica", [".mp3"]).map((archivo) => ({
    archivo,
    duracionSegundos: duracionAudio(path.join(dir, archivo)),
  }));
}

// Stickers PNG con transparencia de public/stickers.
export function listarStickers(): StickerDisponible[] {
  return listarArchivos("stickers", [".png"]).map((archivo) => ({ archivo }));
}

// Fuentes tipográficas (.ttf/.otf) de public/fuentes para los textos superpuestos.
export function listarFuentes(): FuenteDisponible[] {
  return listarArchivos("fuentes", [".ttf", ".otf"]).map((archivo) => ({ archivo }));
}

// Efectos de sonido puntuales (.mp3) de public/audio/fx (whoosh, pop, ding,
// riser, impacto, shutter, tick…). El renderer los coloca en un segundo exacto
// de la línea de tiempo final. Devuelve [] si el directorio no existe.
export function listarEfectosSonido(): EfectoSonidoDisponible[] {
  return listarArchivos(path.join("audio", "fx"), [".mp3"]).map((archivo) => ({
    archivo,
  }));
}
