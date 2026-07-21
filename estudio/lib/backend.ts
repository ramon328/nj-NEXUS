// Modo "front con backend remoto": cuando la app corre en Vercel (sin ffmpeg,
// sin Whisper, con límites de tiempo), los trabajos pesados se reenvían al
// Mac mini que corre ESTE MISMO repo 24/7 como sistema de edición.
//
// Conexión: RENDER_BACKEND_URL (URL pública del mini) + BACKEND_SECRET
// (secreto compartido que el mini valida en verificarAcceso vía
// "Authorization: Bearer"). Si ambas variables están definidas, las rutas
// pesadas delegan; si no, todo corre en el motor local como siempre.

import { NextResponse } from "next/server";

/** Timeout generoso del reenvío: el backend responde 202 rápido porque los
 *  renders corren en segundo plano, pero dejamos margen para subidas/red. */
const TIMEOUT_REENVIO_MS = 60_000;

/** ¿Está configurado el backend remoto? (ambas variables presentes). */
export function backendConfigurado(): boolean {
  return Boolean(process.env.RENDER_BACKEND_URL && process.env.BACKEND_SECRET);
}

/** Construye la URL absoluta de una ruta en el backend (sin doble barra). */
export function urlBackend(ruta: string): string {
  const base = (process.env.RENDER_BACKEND_URL ?? "").replace(/\/+$/, "");
  return `${base}${ruta}`;
}

/**
 * Reenvía la petición al backend de render (Mac mini) y devuelve su respuesta
 * tal cual (status + JSON). Conserva método, cuerpo crudo y content-type, y
 * agrega "Authorization: Bearer <BACKEND_SECRET>".
 *
 * OJO: lee request.arrayBuffer() UNA sola vez — por eso las rutas deben
 * llamar a esta función ANTES de consumir el body con request.json().
 */
export async function reenviarAlBackend(
  request: Request,
  ruta: string,
  // Timeout del reenvío. Las rutas que responden 202 al instante usan el
  // default; las que trabajan antes de responder (p. ej. registrar, que
  // comprime videos de cientos de MB) deben pasar uno largo.
  timeoutMs: number = TIMEOUT_REENVIO_MS
): Promise<Response> {
  const headers = new Headers();
  headers.set("authorization", `Bearer ${process.env.BACKEND_SECRET ?? ""}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  // Cuerpo crudo: se pasa como bytes para soportar tanto JSON como formData
  // sin re-serializar nada.
  let cuerpo: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    cuerpo = await request.arrayBuffer();
  }

  // Conservar la query string original (por si alguna ruta la usa).
  const busqueda = new URL(request.url).search;
  const destino = urlBackend(ruta) + (ruta.includes("?") ? "" : busqueda);

  try {
    const respuesta = await fetch(destino, {
      method: request.method,
      headers,
      body: cuerpo,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Reconstruimos la Response para devolver status + cuerpo sin arrastrar
    // cabeceras hop-by-hop del backend (content-encoding, etc.).
    const cuerpoRespuesta = await respuesta.arrayBuffer();
    return new Response(cuerpoRespuesta, {
      status: respuesta.status,
      headers: {
        "content-type":
          respuesta.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "El sistema de edición (Mac mini) no está disponible en este momento. Revisa que esté encendido y conectado, y vuelve a intentarlo.",
      },
      { status: 503 }
    );
  }
}
