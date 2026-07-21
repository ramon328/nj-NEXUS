import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { borrarVideoEditado, nombreArchivoDeEdit } from "@/lib/storage";

// DELETE /api/edits/[id]
// Borra una edición: elimina su archivo del bucket "videos-editados" y su fila.
// Responde { ok: true }. 404 si la edición no existe.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id de la edición en la URL" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Leer la edición para derivar el nombre del archivo en Storage.
    const { data: edit, error: editError } = await supabase
      .from("edits")
      .select("id, output_url")
      .eq("id", id)
      .maybeSingle<{ id: string; output_url: string | null }>();

    if (editError) {
      return NextResponse.json(
        { error: `Error al leer la edición: ${editError.message}` },
        { status: 500 }
      );
    }
    if (!edit) {
      return NextResponse.json(
        { error: "No existe una edición con ese id" },
        { status: 404 }
      );
    }

    // Borrar el archivo de Storage (no lanza si no existe).
    await borrarVideoEditado(nombreArchivoDeEdit(edit.output_url, edit.id));

    // Borrar la fila de la edición.
    const { error: deleteError } = await supabase
      .from("edits")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: `No se pudo borrar la edición: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado al borrar la edición";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
