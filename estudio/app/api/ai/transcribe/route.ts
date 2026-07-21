import fs from "fs";
import os from "os";
import path from "path";
import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { backendConfigurado, reenviarAlBackend } from "@/lib/backend";
import { getSupabaseServer } from "@/lib/supabase";
import { downloadDriveFile } from "@/lib/ffmpeg";
import { mapearSubtitulos, transcribirSubtitulosProyecto } from "@/lib/editor";
import { resolveWhisper, transcribirVideo } from "@/lib/transcribe";
import type { EditJob, VideoAsset } from "@/lib/types";

// POST /api/ai/transcribe
// Body: { editId: string, idioma?: string }
// Transcribe la voz del material del edit y devuelve los subtítulos ya
// mapeados a la línea de tiempo del plan del edit (NO re-renderiza). El front
// puede pegarlos en el plan y luego llamar a /api/edits/rerender.
// - Edit clásico (video_id): transcribe el video original de Drive.
// - Edit de PROYECTO (project_id): transcribe los assets de video que el plan
//   referencia en sus segmentos y mapea los cues multi-fuente.
export async function POST(request: Request) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Modo front-con-backend: delegar la transcripción al Mac mini ANTES de
  // comprobar whisper local (en Vercel no hay whisper y por eso se delega).
  if (backendConfigurado()) {
    return reenviarAlBackend(request, "/api/ai/transcribe");
  }
  // Si whisper.cpp no está disponible, cortamos de una con 503.
  if (!resolveWhisper()) {
    return NextResponse.json(
      {
        error:
          "La transcripción de voz no está disponible en este servidor (falta whisper.cpp).",
      },
      { status: 503 }
    );
  }

  let dirTemporal: string | null = null;

  try {
    const body = await request.json().catch(() => null);
    const editId: unknown = body?.editId;
    if (!editId || typeof editId !== "string") {
      return NextResponse.json(
        { error: "Falta el campo editId en el cuerpo de la petición" },
        { status: 400 }
      );
    }
    const idioma: string =
      typeof body?.idioma === "string" && body.idioma.trim()
        ? body.idioma.trim()
        : "es";

    const supabase = getSupabaseServer();

    // 1. Leer el edit y su video asociado (404 si falta cualquiera).
    const { data: editData, error: editError } = await supabase
      .from("edits")
      .select("*")
      .eq("id", editId)
      .single();
    if (editError || !editData) {
      return NextResponse.json(
        { error: "Trabajo de edición no encontrado" },
        { status: 404 }
      );
    }
    const edit = editData as EditJob;

    if (!edit.plan) {
      return NextResponse.json(
        { error: "El trabajo de edición todavía no tiene un plan generado" },
        { status: 400 }
      );
    }

    // Rama PROYECTO: transcribir los assets de video referenciados por los
    // segmentos del plan y mapear los cues MULTI-FUENTE a la línea final.
    if (edit.project_id) {
      dirTemporal = fs.mkdtempSync(
        path.join(os.tmpdir(), "transcribe-proyecto-")
      );
      const subtitulos = await transcribirSubtitulosProyecto(
        edit.project_id,
        edit.plan,
        idioma,
        dirTemporal
      );
      return NextResponse.json({ subtitulos });
    }

    // Rama clásica: el video único asociado al edit.
    if (!edit.video_id) {
      return NextResponse.json(
        { error: "El trabajo de edición no tiene video ni proyecto asociado" },
        { status: 400 }
      );
    }

    const { data: videoData, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", edit.video_id)
      .single();
    if (videoError || !videoData) {
      return NextResponse.json(
        { error: "Video asociado no encontrado" },
        { status: 404 }
      );
    }
    const video = videoData as VideoAsset;

    // 2. Descargar el video original desde Drive a un directorio temporal.
    dirTemporal = fs.mkdtempSync(path.join(os.tmpdir(), "transcribe-edit-"));
    const rutaOriginal = path.join(dirTemporal, "original.mp4");
    await downloadDriveFile(video.drive_file_id, rutaOriginal);

    // 3. Transcribir (tiempo original) y mapear a la línea de tiempo del plan.
    const cuesOriginales = await transcribirVideo(rutaOriginal, idioma);
    const subtitulos = mapearSubtitulos(cuesOriginales, edit.plan.segmentos);

    return NextResponse.json({ subtitulos });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Error inesperado durante la transcripción";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (dirTemporal) {
      fs.rmSync(dirTemporal, { recursive: true, force: true });
    }
  }
}
