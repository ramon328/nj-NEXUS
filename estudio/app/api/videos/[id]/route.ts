import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { borrarVariosEditados, nombreArchivoDeEdit } from "@/lib/storage";

// DELETE /api/videos/[id]
// Borra un video y todo su contenido:
//  1. Junta los archivos de Storage de sus ediciones y los elimina del bucket.
//  2. Borra la fila del video; el ON DELETE CASCADE del esquema elimina
//     automáticamente sus generations, edits y posts.
// Responde { ok: true }. 404 si el video no existe.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del video en la URL" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Verificar que el video existe (para responder 404 correctamente).
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("id")
      .eq("id", id)
      .maybeSingle<{ id: string }>();

    if (videoError) {
      return NextResponse.json(
        { error: `Error al leer el video: ${videoError.message}` },
        { status: 500 }
      );
    }
    if (!video) {
      return NextResponse.json(
        { error: "No existe un video con ese id" },
        { status: 404 }
      );
    }

    // Juntar los nombres de archivo de las ediciones para borrarlos de Storage.
    const { data: edits, error: editsError } = await supabase
      .from("edits")
      .select("id, output_url")
      .eq("video_id", id);

    if (editsError) {
      return NextResponse.json(
        { error: `Error al leer las ediciones: ${editsError.message}` },
        { status: 500 }
      );
    }

    const archivos = (edits ?? []).map((edit) =>
      nombreArchivoDeEdit(edit.output_url, edit.id)
    );
    await borrarVariosEditados(archivos);

    // Borrar la fila del video: el cascade elimina generations/edits/posts.
    const { error: deleteError } = await supabase
      .from("videos")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: `No se pudo borrar el video: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "Error inesperado al borrar el video";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
