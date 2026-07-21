// Normalización de imágenes para que sean utilizables en toda la cadena:
//  - el NAVEGADOR (miniaturas) solo pinta JPEG/PNG/GIF/WebP;
//  - REMOTION (Chrome headless que renderiza los slides) tampoco pinta HEIC;
//  - Claude VISIÓN solo acepta JPEG/PNG/GIF/WebP (no HEIC).
// Las fotos de iPhone llegan en HEIC → hay que convertirlas a JPEG. sharp abre
// JPEG/PNG/WebP/GIF; para HEIC (el sharp de npm reconoce el contenedor pero no
// trae el códec HEVC) se cae a `sips` (nativo de macOS, en el Mac mini).
//
// SOLO SERVIDOR (usa sharp/child_process). Lo importan lib/postDesign.ts,
// lib/proyectos.ts y las rutas de registro de assets.

import sharp from "sharp";
import { spawn } from "child_process";
import { promises as fsp } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";

export type MediaTypeWeb = "image/jpeg" | "image/png";

// ¿El formato (por mime o nombre de archivo) ya lo pinta un navegador?
export function esFormatoWeb(mimeOrNombre: string): boolean {
  return /jpe?g|png|webp|gif/i.test(mimeOrNombre || "");
}

// ¿Es HEIC/HEIF (formato de fotos de iPhone que nadie del stack pinta)?
export function esHeic(mimeOrNombre: string): boolean {
  return /heic|heif/i.test(mimeOrNombre || "");
}

// Convierte un buffer HEIC → JPEG con `sips` (nativo de macOS; usa el códec HEVC
// del sistema). Best-effort: null si no hay sips (fuera de macOS) o si falla.
// El motor de render corre en el Mac mini, así que sips está disponible.
async function heicAJpegConSips(buffer: Buffer): Promise<Buffer | null> {
  const dir = os.tmpdir();
  const entrada = path.join(dir, `img-${randomUUID()}.heic`);
  const salida = path.join(dir, `img-${randomUUID()}.jpg`);
  try {
    await fsp.writeFile(entrada, buffer);
    await new Promise<void>((resolve, reject) => {
      const p = spawn(
        "sips",
        ["-s", "format", "jpeg", entrada, "--out", salida],
        { stdio: "ignore" }
      );
      p.on("error", reject);
      p.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`sips salió con código ${code}`))
      );
    });
    return await fsp.readFile(salida);
  } catch {
    return null;
  } finally {
    await fsp.rm(entrada, { force: true }).catch(() => {});
    await fsp.rm(salida, { force: true }).catch(() => {});
  }
}

// Reencuadra (EXIF), limita el tamaño y reencoda con sharp a JPEG (o PNG si hay
// alfa). LANZA si el buffer no es decodable por sharp (p. ej. HEIC).
async function conSharp(
  buffer: Buffer,
  ladoMax: number,
  calidad: number
): Promise<{ data: Buffer; mediaType: MediaTypeWeb }> {
  const img = sharp(buffer, { failOn: "none" });
  const meta = await img.metadata();
  img.rotate();
  if (ladoMax > 0) {
    img.resize({
      width: ladoMax,
      height: ladoMax,
      fit: "inside",
      withoutEnlargement: true,
    });
  }
  if (meta.hasAlpha) {
    return {
      data: await img.png({ compressionLevel: 9 }).toBuffer(),
      mediaType: "image/png",
    };
  }
  return {
    data: await img.jpeg({ quality: calidad, mozjpeg: true }).toBuffer(),
    mediaType: "image/jpeg",
  };
}

export interface OpcionesNormalizar {
  // Lado máximo (px). 0 = no redimensionar. Para visión de la IA basta 1568
  // (tier estándar de Claude); para guardar la foto usamos algo más grande.
  ladoMax?: number;
  calidad?: number;
}

/**
 * Normaliza cualquier imagen a JPEG/PNG (incluido HEIC de iPhone), corrige la
 * orientación EXIF y limita el tamaño. Intenta con sharp; si no puede decodificar
 * (HEIC), convierte con sips y reintenta. Devuelve null si no se pudo (best-effort).
 */
export async function normalizarImagen(
  buffer: Buffer,
  opciones: OpcionesNormalizar = {}
): Promise<{ data: Buffer; mediaType: MediaTypeWeb } | null> {
  const ladoMax = opciones.ladoMax ?? 1568;
  const calidad = opciones.calidad ?? 82;
  try {
    return await conSharp(buffer, ladoMax, calidad);
  } catch {
    const jpeg = await heicAJpegConSips(buffer);
    if (!jpeg) return null;
    try {
      return await conSharp(jpeg, ladoMax, calidad);
    } catch {
      return null;
    }
  }
}
