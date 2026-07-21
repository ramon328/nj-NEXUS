import { NextResponse } from "next/server";
import { generateContent } from "@/lib/ai";
import { verificarAcceso } from "@/lib/auth";
import { CLAUDE_MODEL } from "@/lib/anthropic";
import { getSupabaseServer } from "@/lib/supabase";
import type { VideoAsset } from "@/lib/types";

// POST /api/ai/generate
// Body: { videoId: string, tono?: string, idioma?: string, instrucciones?: string }
// Genera caption, descripción, hashtags, hook y CTA para un video y lo guarda
// como una fila en la tabla generations (kind: 'content').
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

    // Generar el contenido con Claude
    const content = await generateContent(video as VideoAsset, {
      tono: typeof body?.tono === "string" ? body.tono : undefined,
      idioma: typeof body?.idioma === "string" ? body.idioma : undefined,
      instrucciones:
        typeof body?.instrucciones === "string" ? body.instrucciones : undefined,
    });

    // Guardar la generación
    const { data: generation, error: insertError } = await supabase
      .from("generations")
      .insert({
        video_id: videoId,
        kind: "content",
        content,
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
      err instanceof Error ? err.message : "Error inesperado generando contenido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
