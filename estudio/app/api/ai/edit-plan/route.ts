import { NextResponse } from "next/server";
import { generateEditPlan } from "@/lib/ai";
import { verificarAcceso } from "@/lib/auth";
import { CLAUDE_MODEL } from "@/lib/anthropic";
import { getSupabaseServer } from "@/lib/supabase";
import type { VideoAsset } from "@/lib/types";

// POST /api/ai/edit-plan
// Body: { videoId: string, objetivo?: string }
// Genera un plan de edición para el video y lo guarda como una fila en la
// tabla generations (kind: 'edit_plan').
export async function POST(request: Request) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => null);
    const videoId: string | undefined = body?.videoId;
    if (!videoId || typeof videoId !== "string") {
      return NextResponse.json(
        { error: "Falta el campo videoId en el cuerpo de la petición" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Buscar el video en Supabase
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { error: "Video no encontrado" },
        { status: 404 }
      );
    }

    // Generar el plan de edición con Claude
    const plan = await generateEditPlan(
      video as VideoAsset,
      typeof body?.objetivo === "string" ? body.objetivo : undefined
    );

    // Guardar la generación
    const { data: generation, error: insertError } = await supabase
      .from("generations")
      .insert({
        video_id: videoId,
        kind: "edit_plan",
        content: plan,
        model: CLAUDE_MODEL,
      })
      .select()
      .single();

    if (insertError || !generation) {
      return NextResponse.json(
        { error: `No se pudo guardar la generación: ${insertError?.message ?? "error desconocido"}` },
        { status: 500 }
      );
    }

    // Si el video estaba en estado 'nuevo', pasa a 'listo'
    if ((video as VideoAsset).status === "nuevo") {
      await supabase
        .from("videos")
        .update({ status: "listo" })
        .eq("id", videoId);
    }

    return NextResponse.json({ generation });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Error inesperado generando el plan de edición";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
