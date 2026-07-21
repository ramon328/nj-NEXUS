import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase";
import {
  createReelContainer,
  waitForContainer,
  publishContainer,
} from "@/lib/instagram";
import type { Post, VideoAsset } from "@/lib/types";

// Publica un video como Reel en Instagram.
// Body esperado: { videoId: string, caption: string, hashtags?: string[], videoUrl?: string }
// Si viene videoUrl (por ejemplo, un video ya editado con IA) se publica esa URL
// en lugar de la URL original de descarga del video.
export async function POST(request: Request) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const supabase = getSupabaseServer();

  let body: {
    videoId?: string;
    caption?: string;
    hashtags?: string[];
    videoUrl?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON válido" },
      { status: 400 }
    );
  }

  const { videoId, caption, hashtags, videoUrl } = body;
  if (!videoId || typeof videoId !== "string") {
    return NextResponse.json(
      { error: "Falta el campo videoId" },
      { status: 400 }
    );
  }
  if (typeof caption !== "string" || caption.trim().length === 0) {
    return NextResponse.json(
      { error: "Falta el campo caption" },
      { status: 400 }
    );
  }
  // Si viene videoUrl, debe ser una URL pública válida (http/https).
  if (videoUrl !== undefined) {
    if (typeof videoUrl !== "string" || !videoUrl.startsWith("http")) {
      return NextResponse.json(
        {
          error:
            "El campo videoUrl debe ser una URL pública que empiece con http",
        },
        { status: 400 }
      );
    }
  }

  try {
    // 1. Buscar el video en Supabase. Las ediciones de PROYECTO no tienen un
    //    video de la biblioteca (video_id null → la UI manda el id del edit):
    //    en ese caso se permite publicar SOLO si viene videoUrl, sin registrar
    //    el post (la tabla posts exige un video de la biblioteca por FK).
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .maybeSingle<VideoAsset>();

    if (videoError) {
      throw new Error(`Error al leer el video: ${videoError.message}`);
    }
    if (!video && !videoUrl) {
      return NextResponse.json(
        { error: "No existe un video con ese id" },
        { status: 404 }
      );
    }
    // URL del MP4 que Instagram va a descargar: la editada (videoUrl) si viene,
    // o la URL original de descarga del video.
    const urlVideoAPublicar = videoUrl ?? video?.download_url;
    if (!urlVideoAPublicar) {
      return NextResponse.json(
        {
          error:
            "No hay una URL pública del video para publicar. Envía un videoUrl en el body (por ejemplo, la URL de un video editado con IA) o asegúrate de que el video tenga una URL pública de descarga (download_url). Instagram necesita descargar el MP4 directamente.",
        },
        { status: 400 }
      );
    }

    // 2. Componer el caption final con los hashtags
    const listaHashtags = Array.isArray(hashtags) ? hashtags : [];
    const textoHashtags = listaHashtags
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
      .join(" ");
    const captionFinal = textoHashtags
      ? `${caption}\n\n${textoHashtags}`
      : caption;

    // 2b. Edición de PROYECTO (sin video de la biblioteca): publicar directo,
    //     sin fila en posts (su FK video_id exige un video existente).
    if (!video) {
      try {
        const containerId = await createReelContainer(
          urlVideoAPublicar,
          captionFinal
        );
        await waitForContainer(containerId);
        const mediaId = await publishContainer(containerId);
        return NextResponse.json({ post: null, ig_media_id: mediaId });
      } catch (publishError) {
        const mensaje =
          publishError instanceof Error
            ? publishError.message
            : "Error desconocido al publicar en Instagram";
        return NextResponse.json({ error: mensaje }, { status: 502 });
      }
    }

    // 3. Registrar el intento de publicación
    const { data: post, error: insertError } = await supabase
      .from("posts")
      .insert({
        video_id: video.id,
        caption: captionFinal,
        hashtags: listaHashtags,
        status: "publicando",
      })
      .select("*")
      .single<Post>();

    if (insertError || !post) {
      throw new Error(
        `No se pudo registrar la publicación: ${insertError?.message ?? "sin detalle"}`
      );
    }

    // 4. Flujo de publicación: contenedor → esperar procesamiento → publicar
    try {
      const containerId = await createReelContainer(
        urlVideoAPublicar,
        captionFinal
      );
      await waitForContainer(containerId);
      const mediaId = await publishContainer(containerId);

      const { data: postActualizado, error: updateError } = await supabase
        .from("posts")
        .update({
          ig_container_id: containerId,
          ig_media_id: mediaId,
          status: "publicado",
          published_at: new Date().toISOString(),
        })
        .eq("id", post.id)
        .select("*")
        .single<Post>();

      if (updateError) {
        throw new Error(
          `El Reel se publicó pero no se pudo actualizar el registro: ${updateError.message}`
        );
      }

      // Marcar el video como publicado
      await supabase
        .from("videos")
        .update({ status: "publicado" })
        .eq("id", video.id);

      return NextResponse.json({ post: postActualizado });
    } catch (publishError) {
      // 5. Registrar el fallo en la fila del post
      const mensaje =
        publishError instanceof Error
          ? publishError.message
          : "Error desconocido al publicar en Instagram";

      await supabase
        .from("posts")
        .update({ status: "error", error: mensaje })
        .eq("id", post.id);

      return NextResponse.json({ error: mensaje }, { status: 502 });
    }
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
