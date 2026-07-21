import fs from "fs";
import { NextResponse } from "next/server";
import { urlBackend } from "@/lib/backend";
import { borrarMediaLocal, rutaLocalDeAsset } from "@/lib/mediaLocal";
import { borrarAssetsStorage, mensajeErrorPostgrest } from "@/lib/proyectos";
import { getSupabaseServer } from "@/lib/supabase";

// Borra el archivo físico de un asset "mini:" (video grande guardado en el
// DISCO LOCAL de la instancia que corre el motor). Si el archivo está en ESTE
// disco, se borra directo; si no está (p. ej. corremos en Vercel y el archivo
// vive en el Mac mini) y hay RENDER_BACKEND_URL configurada, se reenvía el
// DELETE al backend con Bearer. Best-effort: nunca lanza ni bloquea el
// borrado de la fila.
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

// DELETE /api/assets/[id]
// Borra un asset de proyecto: primero el archivo físico (best-effort) — del
// bucket "proyectos" si vive en Supabase, o del disco local/backend si su
// storage_path es "mini:" — y luego la fila de project_assets.
// Respuesta: { ok: true }.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del asset en la URL" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    const { data: asset, error } = await supabase
      .from("project_assets")
      .select("id, storage_path, public_url")
      .eq("id", id)
      .maybeSingle<{
        id: string;
        storage_path: string;
        public_url: string | null;
      }>();

    if (error) {
      return NextResponse.json(
        {
          error: `Error al leer el asset: ${mensajeErrorPostgrest(error.message)}`,
        },
        { status: 500 }
      );
    }
    if (!asset) {
      return NextResponse.json(
        { error: "No existe un asset con ese id" },
        { status: 404 }
      );
    }

    // Archivo físico (no lanza si ya no existe): disco local/backend para los
    // "mini:", Supabase Storage para el resto.
    if (asset.storage_path?.startsWith("mini:")) {
      await borrarArchivoMini(asset.storage_path, asset.public_url);
    } else {
      await borrarAssetsStorage([asset.storage_path]);
    }

    const { error: deleteError } = await supabase
      .from("project_assets")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: `No se pudo borrar el asset: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "Error inesperado al borrar el asset";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
