import { createReadStream, promises as fs } from "fs";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { backendConfigurado, reenviarAlBackend } from "@/lib/backend";
import {
  PREFIJO_MEDIA_LOCAL,
  borrarMediaLocal,
  rutaLocalDeAsset,
} from "@/lib/mediaLocal";
import { mimePorExtension } from "@/lib/proyectos";

// Servir un video grande puede tardar más que el default en conexiones lentas.
export const maxDuration = 300;

const CABECERAS_CORS = {
  "access-control-allow-origin": "*",
} as const;

// Convierte los segmentos del catch-all en el storage_path local "mini:...".
// rutaLocalDeAsset valida que la ruta resuelta quede DENTRO de dirMedia().
async function paramsARutaLocal(
  params: Promise<{ ruta: string[] }>
): Promise<string | null> {
  const { ruta } = await params;
  const relativa = (ruta ?? []).join("/");
  if (!relativa) return null;
  return rutaLocalDeAsset(`${PREFIJO_MEDIA_LOCAL}${relativa}`);
}

// Rango pedido por el cliente, ya validado contra el tamaño del archivo.
interface Rango {
  inicio: number;
  fin: number;
}

// Parsea la cabecera Range "bytes=a-b" (también "a-" y "-sufijo").
// Devuelve el rango saneado, null si no hay Range utilizable (→ 200 completo)
// o "invalido" si el rango pedido no cabe en el archivo (→ 416).
function parsearRange(
  cabecera: string | null,
  tamano: number
): Rango | null | "invalido" {
  if (!cabecera) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(cabecera.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;

  if (m[1] === "") {
    // "-sufijo": los últimos N bytes.
    const sufijo = Number(m[2]);
    if (sufijo === 0) return "invalido";
    return { inicio: Math.max(0, tamano - sufijo), fin: tamano - 1 };
  }

  const inicio = Number(m[1]);
  const fin = m[2] === "" ? tamano - 1 : Math.min(Number(m[2]), tamano - 1);
  if (inicio >= tamano || inicio > fin) return "invalido";
  return { inicio, fin };
}

// GET /api/media/archivo/[...ruta] — sirve un archivo del almacén local con
// soporte de Range (los <video> y el motor de render piden por rangos).
//
// SIN auth de cookie a propósito: los public_url de estos assets se usan en
// <video src> y en descargas del motor; la ruta es impredecible (uuid en el
// nombre del archivo). CORS abierto y cache de 1 hora.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ ruta: string[] }> }
) {
  // Modo front-con-backend (Vercel): los archivos viven en el disco del mini,
  // no aquí. Reenviamos el GET al backend y devolvemos sus bytes. Así una URL
  // RELATIVA "/api/media/archivo/..." (p. ej. un slide de post renderizado sin
  // MEDIA_PUBLIC_URL) se resuelve contra Vercel y este la proxya al mini en vez
  // de dar 404 (imagen en negro). Los assets con URL ABSOLUTA (video/foto ya
  // registrados con MEDIA_PUBLIC_URL) apuntan directo al mini y no pasan por
  // aquí, así que los archivos grandes no viajan por Vercel.
  if (backendConfigurado()) {
    const { ruta } = await params;
    const relativa = (ruta ?? []).join("/");
    if (!relativa) {
      return NextResponse.json(
        { error: "Ruta de archivo inválida" },
        { status: 400, headers: CABECERAS_CORS }
      );
    }
    return reenviarAlBackend(request, `/api/media/archivo/${relativa}`);
  }

  try {
    const rutaLocal = await paramsARutaLocal(params);
    if (!rutaLocal) {
      return NextResponse.json(
        { error: "Ruta de archivo inválida" },
        { status: 400, headers: CABECERAS_CORS }
      );
    }

    const stat = await fs.stat(rutaLocal).catch(() => null);
    if (!stat || !stat.isFile()) {
      return NextResponse.json(
        { error: "Archivo no encontrado en el almacén local de media" },
        { status: 404, headers: CABECERAS_CORS }
      );
    }

    const cabecerasBase: Record<string, string> = {
      ...CABECERAS_CORS,
      "content-type":
        mimePorExtension(path.basename(rutaLocal)) ??
        "application/octet-stream",
      "accept-ranges": "bytes",
      "cache-control": "public, max-age=3600",
    };

    const rango = parsearRange(request.headers.get("range"), stat.size);
    if (rango === "invalido") {
      return new Response(null, {
        status: 416,
        headers: { ...cabecerasBase, "content-range": `bytes */${stat.size}` },
      });
    }

    // Stream de Node → web stream para el body de la Response (sin RAM).
    const flujo = (inicio?: number, fin?: number) =>
      Readable.toWeb(
        createReadStream(rutaLocal, inicio === undefined ? {} : { start: inicio, end: fin })
      ) as unknown as ReadableStream<Uint8Array>;

    if (rango) {
      return new Response(flujo(rango.inicio, rango.fin), {
        status: 206,
        headers: {
          ...cabecerasBase,
          "content-range": `bytes ${rango.inicio}-${rango.fin}/${stat.size}`,
          "content-length": String(rango.fin - rango.inicio + 1),
        },
      });
    }

    return new Response(flujo(), {
      status: 200,
      headers: { ...cabecerasBase, "content-length": String(stat.size) },
    });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "Error inesperado sirviendo el archivo";
    return NextResponse.json(
      { error: mensaje },
      { status: 500, headers: CABECERAS_CORS }
    );
  }
}

// DELETE /api/media/archivo/[...ruta] — borra el archivo del disco local.
// SOLO con "Authorization: Bearer <BACKEND_SECRET>" o sesión válida
// (verificarAcceso cubre ambos). Best-effort: siempre responde { ok: true }
// si la ruta es válida, exista o no el archivo.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ ruta: string[] }> }
) {
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { ruta } = await params;
    const relativa = (ruta ?? []).join("/");
    const storagePath = `${PREFIJO_MEDIA_LOCAL}${relativa}`;
    if (!relativa || !rutaLocalDeAsset(storagePath)) {
      return NextResponse.json(
        { error: "Ruta de archivo inválida" },
        { status: 400 }
      );
    }
    await borrarMediaLocal(storagePath);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "Error inesperado borrando el archivo";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
