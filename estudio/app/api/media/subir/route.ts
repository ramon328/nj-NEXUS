import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import {
  ensamblar,
  guardarTrozo,
  registrarVideoLocal,
  validarTokenMedia,
} from "@/lib/mediaLocal";
import { mensajeErrorPostgrest } from "@/lib/proyectos";
import { getSupabaseServer } from "@/lib/supabase";

// Recibir y ensamblar trozos de videos grandes puede tardar.
export const maxDuration = 300;

// Trozos nominales de 25 MB (el cliente): se acepta hasta 30 MB de margen.
const MAX_BYTES_TROZO = 30 * 1024 * 1024;
// Máximo 40 trozos ≈ 1 GB por archivo.
const MAX_TROZOS = 40;

// CORS: el navegador sube CROSS-ORIGIN desde el front de Vercel directo al
// mini (con el token de .../assets/token-mini), así que TODAS las respuestas
// llevan estas cabeceras y OPTIONS responde el preflight.
const CABECERAS_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization,x-media-token",
} as const;

function respuesta(cuerpo: unknown, status: number): NextResponse {
  return NextResponse.json(cuerpo, { status, headers: CABECERAS_CORS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CABECERAS_CORS });
}

function campoTexto(form: FormData, nombre: string): string {
  const valor = form.get(nombre);
  return typeof valor === "string" ? valor.trim() : "";
}

// POST /api/media/subir — recibe UN trozo de una subida por trozos.
//
// multipart/form-data con: projectId, uploadId, indice (0-based), total,
// nombre (del archivo original) y "chunk" (File con los bytes del trozo).
//
// Auth (cualquiera de las tres):
//  - "Authorization: Bearer <BACKEND_SECRET>" (servidor a servidor),
//  - token de media en query o header "x-media-token" (firmado por el front
//    con .../assets/token-mini; el navegador sube directo al mini con él),
//  - cookie de sesión (verificarAcceso, para uso local mismo-origen).
//
// Al llegar el ÚLTIMO trozo (indice === total-1) se ensambla el archivo, se
// guarda en el disco local del motor y se registra en project_assets →
// 201 { asset }. Con los trozos intermedios → 200 { ok: true, recibidos }.
export async function POST(request: Request) {
  try {
    const form = await request.formData().catch(() => null);
    if (!form) {
      return respuesta(
        {
          error:
            "Envía multipart/form-data con projectId, uploadId, indice, total, nombre y chunk",
        },
        400
      );
    }

    const projectId = campoTexto(form, "projectId");
    const uploadId = campoTexto(form, "uploadId");
    const nombre = campoTexto(form, "nombre");
    const indice = Number(campoTexto(form, "indice"));
    const total = Number(campoTexto(form, "total"));

    if (!projectId) {
      return respuesta({ error: "Falta el campo 'projectId'" }, 400);
    }

    // Auth: token de media (query o header) o acceso normal (Bearer/cookie).
    const token =
      request.headers.get("x-media-token") ||
      new URL(request.url).searchParams.get("x-media-token") ||
      "";
    const conToken = token ? validarTokenMedia(token, projectId) : false;
    if (!conToken && !(await verificarAcceso(request))) {
      return respuesta(
        { error: "No autorizado: token de subida inválido o expirado" },
        401
      );
    }

    if (!uploadId) {
      return respuesta({ error: "Falta el campo 'uploadId'" }, 400);
    }
    if (!nombre) {
      return respuesta({ error: "Falta el campo 'nombre'" }, 400);
    }
    if (!Number.isInteger(total) || total < 1 || total > MAX_TROZOS) {
      return respuesta(
        {
          error: `Campo 'total' inválido: debe ser un entero entre 1 y ${MAX_TROZOS} (trozos de ~25 MB, máximo ~1 GB por archivo)`,
        },
        400
      );
    }
    if (!Number.isInteger(indice) || indice < 0 || indice >= total) {
      return respuesta(
        {
          error: `Campo 'indice' inválido: debe ser un entero entre 0 y ${total - 1}`,
        },
        400
      );
    }

    const chunk = form.get("chunk");
    if (!(chunk instanceof Blob) || chunk.size === 0) {
      return respuesta(
        { error: "Falta el campo 'chunk' con los bytes del trozo" },
        400
      );
    }
    if (chunk.size > MAX_BYTES_TROZO) {
      const mb = (chunk.size / (1024 * 1024)).toFixed(1);
      return respuesta(
        {
          error: `El trozo pesa ${mb} MB y el máximo es 30 MB: sube en trozos de 25 MB`,
        },
        400
      );
    }

    // El proyecto debe existir antes de aceptar bytes.
    const supabase = getSupabaseServer();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle<{ id: string }>();
    if (projectError) {
      return respuesta(
        {
          error: `Error al leer el proyecto: ${mensajeErrorPostgrest(projectError.message)}`,
        },
        500
      );
    }
    if (!project) {
      return respuesta({ error: "No existe un proyecto con ese id" }, 404);
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());
    const recibidos = await guardarTrozo(uploadId, indice, buffer);

    // Trozo intermedio: confirmar y esperar el resto.
    if (indice !== total - 1) {
      return respuesta({ ok: true, recibidos }, 200);
    }

    // Último trozo: ensamblar el archivo completo y registrarlo como asset.
    let rutaEnsamblada: string | null = null;
    try {
      rutaEnsamblada = await ensamblar(uploadId, total);
    } catch (err) {
      const motivo = err instanceof Error ? err.message : String(err);
      return respuesta({ error: motivo }, 400);
    }

    try {
      const asset = await registrarVideoLocal(projectId, nombre, rutaEnsamblada);
      return respuesta({ asset }, 201);
    } catch (err) {
      // registrarVideoLocal ya limpia lo que movió; por si falló antes de
      // mover, borrar también el ensamblado que quedara en tmp.
      await fs.unlink(rutaEnsamblada).catch(() => {});
      const motivo = err instanceof Error ? err.message : String(err);
      return respuesta({ error: motivo }, 500);
    }
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "Error inesperado subiendo el trozo";
    return respuesta({ error: mensaje }, 500);
  }
}
