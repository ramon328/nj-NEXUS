import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

// GET /api/edits?videoId=<uuid>  ó  /api/edits?projectId=<uuid>
// Lista los trabajos de edición de un video (modo clásico) o de un proyecto
// (multimedia múltiple), del más reciente al más antiguo. Exactamente uno de
// los dos parámetros es requerido. La UI lo consulta para mostrar el estado
// (procesando/completado/error), el plan generado y la URL del video editado.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");
    const projectId = searchParams.get("projectId");

    if (!videoId && !projectId) {
      return NextResponse.json(
        { error: "Falta el parámetro videoId o projectId en la URL" },
        { status: 400 }
      );
    }
    if (videoId && projectId) {
      return NextResponse.json(
        { error: "Usa videoId o projectId, pero no ambos a la vez" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    let query = supabase
      .from("edits")
      .select("*")
      .order("created_at", { ascending: false });
    query = videoId
      ? query.eq("video_id", videoId)
      : query.eq("project_id", projectId);

    const { data: edits, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `No se pudieron obtener las ediciones: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ edits: edits ?? [] });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado listando ediciones";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
