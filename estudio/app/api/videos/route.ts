import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import type { VideoAsset } from "@/lib/types";

// GET /api/videos
// Devuelve todos los videos sincronizados, ordenados del más reciente al más antiguo.
export async function GET() {
  try {
    const supabase = getSupabaseServer();

    const { data: videos, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Error al leer los videos: ${error.message}`);
    }

    return NextResponse.json({ videos: (videos ?? []) as VideoAsset[] });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Error desconocido al obtener los videos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
