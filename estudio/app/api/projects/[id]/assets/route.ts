import { NextResponse } from "next/server";
import { subirArchivoADrive } from "@/lib/drive";
import {
  LIMITE_STORAGE_BYTES,
  borrarAssetsStorage,
  comprimirVideoParaStorage,
  mensajeErrorPostgrest,
  probeAssetBuffer,
  subirAssetProyecto,
} from "@/lib/proyectos";
import { getSupabaseServer } from "@/lib/supabase";
import type { Proyecto, ProyectoAsset, TipoAsset } from "@/lib/types";

// Límite por archivo en Storage: 48 MB (margen bajo el tope de 50 MB del plan
// gratuito de Supabase). Los VIDEOS que excedan no se rechazan: se comprimen
// automáticamente a H.264 (1080p o 720p) hasta caber. El resto de tipos que
// exceda se rechaza uno a uno sin cortar la subida del resto.
const MAX_BYTES = LIMITE_STORAGE_BYTES;
// Tope absoluto de entrada para no agotar memoria comprimiendo monstruos.
const MAX_BYTES_ENTRADA_VIDEO = 800 * 1024 * 1024;

// La compresión de videos grandes puede tardar varios minutos.
export const maxDuration = 300;

const TIPOS_VALIDOS: TipoAsset[] = [
  "video",
  "foto",
  "audio",
  "musica",
  "sticker",
];

// Un archivo que no se pudo subir y el porqué (en español, para la UI).
interface Rechazado {
  nombre: string;
  motivo: string;
}

// MIME de respaldo por extensión, para navegadores que suben archivos sin
// Content-Type (file.type vacío).
function mimePorExtension(nombre: string): string | null {
  const ext = nombre.toLowerCase().split(".").pop() ?? "";
  const mapa: Record<string, string> = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    flac: "audio/flac",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
  };
  return mapa[ext] ?? null;
}

// Infiere el tipo de asset a partir del MIME:
//   video/* → video · audio/* → musica · image/png → sticker · image/* → foto
function inferirTipo(mime: string): TipoAsset | null {
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "musica";
  if (mime === "image/png") return "sticker";
  if (mime.startsWith("image/")) return "foto";
  return null;
}

// POST /api/projects/[id]/assets
// Sube multimedia a un proyecto. Espera formData con:
//   - files: uno o más archivos.
//   - tipo (opcional): fuerza el tipo de TODOS los archivos del envío
//     ('video'|'foto'|'audio'|'musica'|'sticker'); si falta, se infiere
//     por MIME de cada archivo.
// Por archivo: valida tamaño ≤ 48 MB, sube al bucket "proyectos", analiza
// metadatos (duración/dimensiones), inserta la fila en project_assets y, si el
// proyecto tiene carpeta espejo en Drive, lo copia allí (best-effort).
// Respuesta: { assets: ProyectoAsset[], rechazados: [{ nombre, motivo }] }.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del proyecto en la URL" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // El proyecto debe existir (y necesitamos su drive_folder_id).
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle<Proyecto>();

    if (projectError) {
      return NextResponse.json(
        {
          error: `Error al leer el proyecto: ${mensajeErrorPostgrest(projectError.message)}`,
        },
        { status: 500 }
      );
    }
    if (!project) {
      return NextResponse.json(
        { error: "No existe un proyecto con ese id" },
        { status: 404 }
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: "El cuerpo de la petición debe ser multipart/form-data" },
        { status: 400 }
      );
    }

    const files = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo en el campo 'files'" },
        { status: 400 }
      );
    }

    // Tipo forzado (opcional) para todo el envío.
    const tipoCrudo = formData.get("tipo");
    let tipoForzado: TipoAsset | null = null;
    if (typeof tipoCrudo === "string" && tipoCrudo.trim()) {
      if (!TIPOS_VALIDOS.includes(tipoCrudo.trim() as TipoAsset)) {
        return NextResponse.json(
          {
            error: `Tipo de asset inválido: '${tipoCrudo}'. Usa uno de: ${TIPOS_VALIDOS.join(", ")}`,
          },
          { status: 400 }
        );
      }
      tipoForzado = tipoCrudo.trim() as TipoAsset;
    }

    const assets: ProyectoAsset[] = [];
    const rechazados: Rechazado[] = [];

    for (const file of files) {
      let nombre = file.name || "archivo";

      if (file.size === 0) {
        rechazados.push({ nombre, motivo: "El archivo está vacío (0 bytes)." });
        continue;
      }

      // 1) MIME y tipo (antes del control de tamaño: los videos grandes se
      //    comprimen en vez de rechazarse).
      let mime = file.type || mimePorExtension(nombre) || "";
      const tipo = tipoForzado ?? (mime ? inferirTipo(mime) : null);
      if (!tipo) {
        rechazados.push({
          nombre,
          motivo:
            "No se pudo determinar el tipo del archivo (usa video, foto, audio, música o sticker, o envía el campo 'tipo').",
        });
        continue;
      }

      // 2) Tamaño. Videos grandes → compresión automática más abajo; el resto
      //    de tipos se rechaza si excede el límite de Storage.
      if (file.size > MAX_BYTES && tipo !== "video") {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        rechazados.push({
          nombre,
          motivo: `El archivo pesa ${mb} MB y el máximo es 48 MB (límite de Supabase Storage). Comprímelo o súbelo en menor calidad.`,
        });
        continue;
      }
      if (file.size > MAX_BYTES_ENTRADA_VIDEO) {
        const mb = Math.round(file.size / (1024 * 1024));
        rechazados.push({
          nombre,
          motivo: `El video pesa ${mb} MB y el máximo aceptado para comprimir es 800 MB. Recórtalo o divídelo en partes.`,
        });
        continue;
      }

      let storagePath: string | null = null;
      try {
        let buffer: Buffer = Buffer.from(await file.arrayBuffer());

        // 3) Compresión automática de videos que exceden el límite de Storage
        //    (H.264 1080p/720p con bitrate calculado para caber en ~42 MB).
        if (tipo === "video" && buffer.length > MAX_BYTES) {
          const antesMb = (buffer.length / (1024 * 1024)).toFixed(1);
          try {
            const comprimido = await comprimirVideoParaStorage(buffer, nombre);
            buffer = comprimido.buffer;
            if (comprimido.comprimido) {
              nombre = comprimido.nombre;
              mime = comprimido.mime;
              console.log(
                `[assets] "${nombre}" comprimido: ${antesMb} MB → ${(buffer.length / (1024 * 1024)).toFixed(1)} MB`
              );
            }
          } catch (compErr) {
            rechazados.push({
              nombre,
              motivo:
                compErr instanceof Error
                  ? compErr.message
                  : "No se pudo comprimir el video",
            });
            continue;
          }
        }

        // 3) Subir a Storage.
        const subido = await subirAssetProyecto(
          id,
          nombre,
          buffer,
          mime || "application/octet-stream"
        );
        storagePath = subido.storage_path;

        // 4) Metadatos (duración / dimensiones). Para fotos y stickers la
        //    "duración" que reporte ffprobe no significa nada: se guarda null.
        const ext = nombre.includes(".") ? nombre.split(".").pop()! : "bin";
        const probe = await probeAssetBuffer(buffer, ext);
        const duracion =
          tipo === "foto" || tipo === "sticker"
            ? null
            : probe.duracion_seconds;

        // 5) Espejo en Drive (best-effort; null si no hay escritura).
        const driveFileId = project.drive_folder_id
          ? await subirArchivoADrive(
              project.drive_folder_id,
              nombre,
              buffer,
              mime || "application/octet-stream"
            )
          : null;

        // 6) Fila en project_assets.
        const { data: asset, error: insertError } = await supabase
          .from("project_assets")
          .insert({
            project_id: id,
            tipo,
            nombre,
            storage_path: subido.storage_path,
            public_url: subido.public_url,
            mime_type: mime || null,
            duracion_seconds: duracion,
            ancho: probe.ancho,
            alto: probe.alto,
            // Tras la compresión automática el archivo real puede pesar menos
            // que el subido: registrar lo que quedó en Storage.
            size_bytes: buffer.length,
            drive_file_id: driveFileId,
          })
          .select("*")
          .single<ProyectoAsset>();

        if (insertError) {
          // Sin fila no hay asset: limpiar el archivo huérfano de Storage.
          await borrarAssetsStorage([subido.storage_path]);
          rechazados.push({
            nombre,
            motivo: `No se pudo registrar en la base: ${mensajeErrorPostgrest(insertError.message)}`,
          });
          continue;
        }

        assets.push(asset);
      } catch (err) {
        // Falla de subida o inesperada: limpiar si el archivo alcanzó a subir.
        if (storagePath) await borrarAssetsStorage([storagePath]);
        const motivo = err instanceof Error ? err.message : String(err);
        rechazados.push({ nombre, motivo });
      }
    }

    const status = assets.length > 0 ? 201 : 400;
    return NextResponse.json({ assets, rechazados }, { status });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "Error inesperado subiendo archivos";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
