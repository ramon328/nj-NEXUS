import fs from "fs";
import { NextResponse } from "next/server";
import { urlBackend } from "@/lib/backend";
import { borrarMediaLocal, rutaLocalDeAsset } from "@/lib/mediaLocal";
import {
  borrarAssetsStorage,
  borrarCarpetaProyecto,
  mensajeErrorPostgrest,
} from "@/lib/proyectos";
import { borrarVariosEditados, nombreArchivoDeEdit } from "@/lib/storage";
import { getSupabaseServer } from "@/lib/supabase";
import type { Proyecto, ProyectoAsset } from "@/lib/types";

// Borra el archivo físico de un asset "mini:" (video grande guardado en el
// DISCO LOCAL de la instancia que corre el motor). Si el archivo está en ESTE
// disco, se borra directo; si no está (p. ej. corremos en Vercel y el archivo
// vive en el Mac mini) y hay RENDER_BACKEND_URL configurada, se reenvía el
// DELETE al backend con Bearer. Best-effort: nunca lanza ni bloquea el
// borrado de las filas.
async function borrarArchivoMini(
  storagePath: string,
  publicUrl: string | null
): Promise<void> {
  try {
    const rutaLocal = rutaLocalDeAsset(storagePath);
    if (rutaLocal && fs.existsSync(rutaLocal)) {
      await borrarMediaLocal(storagePath);
      return;
    }
    if (!process.env.RENDER_BACKEND_URL || !publicUrl) return;
    // Ruta de la API de medios (/api/media/archivo/...) a partir del
    // public_url guardado (sirve tanto si es absoluto como relativo).
    const rutaMedia = new URL(publicUrl, "http://interno").pathname;
    if (!rutaMedia.startsWith("/api/media/")) return;
    const respuesta = await fetch(urlBackend(rutaMedia), {
      method: "DELETE",
      headers: { authorization: `Bearer ${process.env.BACKEND_SECRET ?? ""}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!respuesta.ok && respuesta.status !== 404) {
      console.warn(
        `No se pudo borrar el archivo "mini:" en el backend (HTTP ${respuesta.status}, se ignora): ${storagePath}`
      );
    }
  } catch (err) {
    console.warn(
      `No se pudo borrar el archivo "mini:" (se ignora): ${err instanceof Error ? err.message : err}`
    );
  }
}

// GET /api/projects/[id]
// Devuelve el proyecto y sus assets (más recientes primero):
// { project, assets }.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del proyecto en la URL" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle<Proyecto>();

    if (error) {
      return NextResponse.json(
        {
          error: `Error al leer el proyecto: ${mensajeErrorPostgrest(error.message)}`,
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

    const { data: assets, error: assetsError } = await supabase
      .from("project_assets")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (assetsError) {
      return NextResponse.json(
        {
          error: `Error al leer los assets del proyecto: ${mensajeErrorPostgrest(assetsError.message)}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      project,
      assets: (assets ?? []) as ProyectoAsset[],
    });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "Error inesperado leyendo el proyecto";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

// DELETE /api/projects/[id]
// Borra un proyecto y todo su contenido:
//  1. Elimina los archivos multimedia: los assets "mini:" del disco local (o
//     vía DELETE al backend si el archivo vive en el Mac mini) y el resto del
//     bucket "proyectos" (por storage_path + barrido del prefijo <id>/ por si
//     quedó algún archivo huérfano).
//  2. Elimina los renders de sus ediciones del bucket "videos-editados".
//  3. Borra la fila del proyecto; el ON DELETE CASCADE elimina sus
//     project_assets y edits.
// Responde { ok: true }. 404 si el proyecto no existe.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del proyecto en la URL" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Verificar que el proyecto existe (para responder 404 correctamente).
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

    // 1) Archivos multimedia: separar los "mini:" (disco local/backend) de
    //    los que viven en el bucket "proyectos" de Supabase.
    const { data: assets, error: assetsError } = await supabase
      .from("project_assets")
      .select("storage_path, public_url")
      .eq("project_id", id);

    if (assetsError) {
      return NextResponse.json(
        {
          error: `Error al leer los assets del proyecto: ${mensajeErrorPostgrest(assetsError.message)}`,
        },
        { status: 500 }
      );
    }

    const filasAssets = (assets ?? []) as {
      storage_path: string;
      public_url: string | null;
    }[];
    const assetsMini = filasAssets.filter((a) =>
      a.storage_path?.startsWith("mini:")
    );
    const rutasSupabase = filasAssets
      .filter((a) => !a.storage_path?.startsWith("mini:"))
      .map((a) => a.storage_path);

    for (const asset of assetsMini) {
      await borrarArchivoMini(asset.storage_path, asset.public_url);
    }
    await borrarAssetsStorage(rutasSupabase);
    // Barrido del prefijo por si quedó algo sin fila en la base.
    await borrarCarpetaProyecto(id);

    // 2) Renders de sus ediciones en el bucket "videos-editados".
    const { data: edits, error: editsError } = await supabase
      .from("edits")
      .select("id, output_url")
      .eq("project_id", id);

    if (editsError) {
      return NextResponse.json(
        { error: `Error al leer las ediciones: ${editsError.message}` },
        { status: 500 }
      );
    }

    await borrarVariosEditados(
      ((edits ?? []) as { id: string; output_url: string | null }[]).map(
        (edit) => nombreArchivoDeEdit(edit.output_url, edit.id)
      )
    );

    // 3) Borrar la fila: el cascade elimina project_assets y edits.
    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: `No se pudo borrar el proyecto: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado al borrar el proyecto";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
