import { NextResponse } from "next/server";
import { listDriveVideos } from "@/lib/drive";
import { getSupabaseServer } from "@/lib/supabase";
import type { VideoAsset } from "@/lib/types";

// POST /api/drive/sync
// Sincroniza los videos de la carpeta de Google Drive con la tabla `videos`.
// No sobrescribe el `status` de los videos ya existentes: el payload del
// upsert no incluye esa columna, así que en conflicto solo se actualizan
// los metadatos.
export async function POST() {
  try {
    const files = await listDriveVideos();
    const supabase = getSupabaseServer();

    let synced = 0;

    if (files.length > 0) {
      // Mapeo de metadatos de Drive a columnas de la tabla `videos`.
      const payload = files.map((file) => ({
        drive_file_id: file.id,
        name: file.name,
        mime_type: file.mimeType,
        size_bytes: file.size != null ? Number(file.size) : null,
        duration_seconds:
          file.durationMillis != null ? Number(file.durationMillis) / 1000 : null,
        thumbnail_url: file.thumbnailLink,
        web_view_link: file.webViewLink,
        download_url: file.webContentLink,
        drive_modified_at: file.modifiedTime,
      }));

      const { data: upserted, error: upsertError } = await supabase
        .from("videos")
        .upsert(payload, {
          onConflict: "drive_file_id",
          ignoreDuplicates: false,
        })
        .select("id");

      if (upsertError) {
        throw new Error(
          `Error al guardar los videos en Supabase: ${upsertError.message}`
        );
      }

      synced = upserted?.length ?? files.length;
    }

    // Lista completa y actualizada de videos.
    const { data: videos, error: listError } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (listError) {
      throw new Error(`Error al leer los videos: ${listError.message}`);
    }

    return NextResponse.json({
      synced,
      videos: (videos ?? []) as VideoAsset[],
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Error desconocido al sincronizar con Google Drive";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
