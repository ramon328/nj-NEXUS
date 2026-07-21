import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import {
  crearFirmaSubidaProyecto,
  ensureBucketProyectos,
  mensajeErrorPostgrest,
  type FirmaSubidaProyecto,
} from "@/lib/proyectos";
import { getSupabaseServer } from "@/lib/supabase";

// Tope de firmas por lote: suficiente para cualquier subida manual y evita
// que un cliente pida miles de URLs firmadas de golpe.
const MAX_ARCHIVOS = 50;

// POST /api/projects/[id]/assets/firmar
// Body: { archivos: [{ nombre: string, tipo?: string }] }
//
// Paso 1 de la subida DIRECTA navegador → Supabase Storage (evita el límite
// de ~4.5 MB por petición de Vercel). Para cada archivo genera la ruta
// temporal "<projectId>/subidas/<uuid>-<nombre saneado>" y una URL firmada
// de subida (válida 2 horas).
//
// Respuesta: { firmas: [{ nombre, ruta, token, url }] } donde `url` es la
// signedUrl COMPLETA: el navegador sube con
//   fetch(url, { method: "PUT", body: archivo,
//                headers: { "content-type": ..., "x-upsert": "false" } })
// (es el mismo PUT que hace uploadToSignedUrl de supabase-js; verificado en
// node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts).
// Después el cliente llama a POST .../assets/registrar con las rutas.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del proyecto en la URL" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const archivosCrudos: unknown = body?.archivos;
    if (!Array.isArray(archivosCrudos) || archivosCrudos.length === 0) {
      return NextResponse.json(
        {
          error:
            "Falta la lista 'archivos': envía { archivos: [{ nombre }] } con al menos un archivo",
        },
        { status: 400 }
      );
    }
    if (archivosCrudos.length > MAX_ARCHIVOS) {
      return NextResponse.json(
        {
          error: `Demasiados archivos en un lote (${archivosCrudos.length}): el máximo es ${MAX_ARCHIVOS}`,
        },
        { status: 400 }
      );
    }

    const nombres: string[] = [];
    for (const archivo of archivosCrudos) {
      const nombre =
        typeof (archivo as { nombre?: unknown })?.nombre === "string"
          ? ((archivo as { nombre: string }).nombre || "").trim()
          : "";
      if (!nombre) {
        return NextResponse.json(
          { error: "Cada archivo debe traer un 'nombre' no vacío" },
          { status: 400 }
        );
      }
      nombres.push(nombre);
    }

    // El proyecto debe existir antes de firmar nada.
    const supabase = getSupabaseServer();
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
      .maybeSingle<{ id: string }>();
    if (projectError) {
      return NextResponse.json(
        {
          error: `Error al leer el proyecto: ${mensajeErrorPostgrest(projectError.message)}`,
        },
        { status: 500 }
      );
    }
    if (!project) {
      return NextResponse.json(
        { error: "No existe un proyecto con ese id" },
        { status: 404 }
      );
    }

    await ensureBucketProyectos();

    const firmas: FirmaSubidaProyecto[] = [];
    for (const nombre of nombres) {
      firmas.push(await crearFirmaSubidaProyecto(id, nombre));
    }

    return NextResponse.json({ firmas }, { status: 200 });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado al firmar las subidas";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
