import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { backendConfigurado, reenviarAlBackend } from "@/lib/backend";
import { subirArchivoADrive } from "@/lib/drive";
import { esFormatoWeb, normalizarImagen } from "@/lib/imagen";
import {
  LIMITE_STORAGE_BYTES,
  PREFIJO_SUBIDAS,
  borrarAssetsStorage,
  comprimirVideoParaStorage,
  descargarDeBucketProyectos,
  inferirTipoAsset,
  mensajeErrorPostgrest,
  mimePorExtension,
  moverAssetAUbicacionDefinitiva,
  probeAssetBuffer,
  subirAssetProyecto,
} from "@/lib/proyectos";
import { getSupabaseServer } from "@/lib/supabase";
import type { Proyecto, ProyectoAsset, TipoAsset } from "@/lib/types";

// La compresión de videos grandes puede tardar varios minutos.
export const maxDuration = 300;

// Tope absoluto de entrada para no agotar memoria comprimiendo monstruos
// (mismo límite que la ruta clásica y que el cliente).
const MAX_BYTES_ENTRADA_VIDEO = 800 * 1024 * 1024;

const TIPOS_VALIDOS: TipoAsset[] = [
  "video",
  "foto",
  "audio",
  "musica",
  "sticker",
];

// Un archivo que no se pudo registrar y el porqué (en español, para la UI).
interface Rechazado {
  nombre: string;
  motivo: string;
}

// Una subida directa ya completada por el navegador, lista para registrar.
interface SubidaEntrante {
  nombre: string;
  ruta: string;
  tipo?: string;
}

// POST /api/projects/[id]/assets/registrar
// Body: { subidas: [{ nombre, ruta, tipo? }] }
//
// Paso 3 de la subida DIRECTA navegador → Supabase Storage: el navegador ya
// subió los archivos a la zona temporal "<projectId>/subidas/…" (con las
// firmas de .../assets/firmar). Aquí, por cada subida:
//   - se descarga el archivo del bucket y se infiere su tipo (mime/extensión);
//   - si es un video > 48 MB se comprime con ffmpeg y el resultado se sube a
//     la ruta definitiva "<projectId>/<uuid>-<nombre>.mp4" (borrando el
//     original temporal); si no, se MUEVE a la ruta definitiva;
//   - se analizan metadatos (duración/dimensiones), se copia a Drive si el
//     proyecto tiene carpeta espejo (best-effort) y se inserta la fila en
//     project_assets.
// Respuesta: { assets: ProyectoAsset[], rechazados: [{ nombre, motivo }] }
// (igual que la ruta clásica POST .../assets).
//
// Si hay un backend de render configurado (Mac mini con RENDER_BACKEND_URL +
// BACKEND_SECRET), la petición completa se reenvía allí: descargar, comprimir
// y analizar es trabajo pesado que no debe correr en Vercel.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del proyecto en la URL" },
        { status: 400 }
      );
    }

    // Reenviar el trabajo pesado al sistema de edición (Mac mini) si está
    // configurado. Se reenvía ANTES de consumir el body para que la petición
    // llegue intacta; en el mini este mismo handler procesa en local.
    if (backendConfigurado()) {
      // Timeout largo: registrar responde recién al terminar de comprimir
      // (los videos de cientos de MB pueden tardar varios minutos).
      return await reenviarAlBackend(
        request,
        `/api/projects/${encodeURIComponent(id)}/assets/registrar`,
        10 * 60_000
      );
    }

    const body = await request.json().catch(() => null);
    const subidasCrudas: unknown = body?.subidas;
    if (!Array.isArray(subidasCrudas) || subidasCrudas.length === 0) {
      return NextResponse.json(
        {
          error:
            "Falta la lista 'subidas': envía { subidas: [{ nombre, ruta }] } con al menos una subida",
        },
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

    const assets: ProyectoAsset[] = [];
    const rechazados: Rechazado[] = [];

    for (const cruda of subidasCrudas as Partial<SubidaEntrante>[]) {
      const nombreOriginal =
        typeof cruda?.nombre === "string" && cruda.nombre.trim()
          ? cruda.nombre.trim()
          : "archivo";
      let nombre = nombreOriginal;
      const ruta = typeof cruda?.ruta === "string" ? cruda.ruta : "";

      // Solo se registran rutas de la zona temporal de ESTE proyecto: evita
      // que un cliente registre (o borre) archivos arbitrarios del bucket.
      if (!ruta.startsWith(`${id}/${PREFIJO_SUBIDAS}/`) || ruta.includes("..")) {
        rechazados.push({
          nombre,
          motivo:
            "Ruta de subida inválida: no pertenece a la zona temporal de este proyecto.",
        });
        continue;
      }

      // Tipo forzado (opcional) por archivo, como el campo 'tipo' clásico.
      let tipoForzado: TipoAsset | null = null;
      if (typeof cruda?.tipo === "string" && cruda.tipo.trim()) {
        const tipoCrudo = cruda.tipo.trim() as TipoAsset;
        if (!TIPOS_VALIDOS.includes(tipoCrudo)) {
          rechazados.push({
            nombre,
            motivo: `Tipo de asset inválido: '${cruda.tipo}'. Usa uno de: ${TIPOS_VALIDOS.join(", ")}`,
          });
          await borrarAssetsStorage([ruta]);
          continue;
        }
        tipoForzado = tipoCrudo;
      }

      let storagePath: string | null = null;
      try {
        // 1) Descargar el archivo subido a la zona temporal.
        const descarga = await descargarDeBucketProyectos(ruta);
        let buffer = descarga.buffer;

        if (buffer.length === 0) {
          rechazados.push({
            nombre,
            motivo: "El archivo está vacío (0 bytes).",
          });
          await borrarAssetsStorage([ruta]);
          continue;
        }

        // 2) MIME y tipo: el content-type que quedó en Storage (lo mandó el
        //    navegador en el PUT firmado) o la extensión como respaldo.
        let mime = descarga.mime || mimePorExtension(nombre) || "";
        const tipo = tipoForzado ?? (mime ? inferirTipoAsset(mime) : null);
        if (!tipo) {
          rechazados.push({
            nombre,
            motivo:
              "No se pudo determinar el tipo del archivo (usa video, foto, audio, música o sticker, o envía el campo 'tipo').",
          });
          await borrarAssetsStorage([ruta]);
          continue;
        }

        // 3) Tamaño. Videos grandes → compresión automática; el resto de
        //    tipos se rechaza si excede el límite de Storage.
        if (buffer.length > LIMITE_STORAGE_BYTES && tipo !== "video") {
          const mb = (buffer.length / (1024 * 1024)).toFixed(1);
          rechazados.push({
            nombre,
            motivo: `El archivo pesa ${mb} MB y el máximo es 48 MB (límite de Supabase Storage). Comprímelo o súbelo en menor calidad.`,
          });
          await borrarAssetsStorage([ruta]);
          continue;
        }
        if (buffer.length > MAX_BYTES_ENTRADA_VIDEO) {
          const mb = Math.round(buffer.length / (1024 * 1024));
          rechazados.push({
            nombre,
            motivo: `El video pesa ${mb} MB y el máximo aceptado para comprimir es 800 MB. Recórtalo o divídelo en partes.`,
          });
          await borrarAssetsStorage([ruta]);
          continue;
        }

        // 4) Dejar el archivo en su ruta definitiva "<projectId>/<uuid>-…":
        //    - video > 48 MB: comprimir y subir el resultado, borrando el
        //      original de subidas/;
        //    - resto: mover el objeto dentro del bucket (sin re-subir).
        let subido: { storage_path: string; public_url: string };
        if (tipo === "video" && buffer.length > LIMITE_STORAGE_BYTES) {
          const antesMb = (buffer.length / (1024 * 1024)).toFixed(1);
          const comprimido = await comprimirVideoParaStorage(buffer, nombre);
          buffer = comprimido.buffer;
          if (comprimido.comprimido) {
            nombre = comprimido.nombre;
            mime = comprimido.mime;
            console.log(
              `[assets/registrar] "${nombre}" comprimido: ${antesMb} MB → ${(buffer.length / (1024 * 1024)).toFixed(1)} MB`
            );
          }
          subido = await subirAssetProyecto(
            id,
            nombre,
            buffer,
            mime || "application/octet-stream"
          );
          storagePath = subido.storage_path;
          await borrarAssetsStorage([ruta]);
        } else if (
          (tipo === "foto" || tipo === "sticker") &&
          !esFormatoWeb(mime || nombre)
        ) {
          // Foto/sticker en un formato que ni el navegador (miniaturas) ni
          // Remotion (render de slides) pueden pintar —típicamente HEIC de
          // iPhone—. Se convierte a JPEG/PNG antes de guardar; si no se puede
          // decodificar, se rechaza con una pista clara.
          const norm = await normalizarImagen(buffer, {
            ladoMax: 2560,
            calidad: 88,
          });
          if (!norm) {
            rechazados.push({
              nombre,
              motivo:
                "No se pudo convertir la imagen (formato no soportado, p. ej. HEIC). Súbela en JPG o PNG.",
            });
            await borrarAssetsStorage([ruta]);
            continue;
          }
          buffer = norm.data;
          mime = norm.mediaType;
          const extNueva = norm.mediaType === "image/png" ? "png" : "jpg";
          nombre = `${nombre.replace(/\.[^.]+$/, "")}.${extNueva}`;
          subido = await subirAssetProyecto(id, nombre, buffer, mime);
          storagePath = subido.storage_path;
          await borrarAssetsStorage([ruta]);
        } else {
          subido = await moverAssetAUbicacionDefinitiva(id, ruta, nombre);
          storagePath = subido.storage_path;
        }

        // 5) Metadatos (duración / dimensiones). Para fotos y stickers la
        //    "duración" que reporte ffprobe no significa nada: se guarda null.
        const ext = nombre.includes(".") ? nombre.split(".").pop()! : "bin";
        const probe = await probeAssetBuffer(buffer, ext);
        const duracion =
          tipo === "foto" || tipo === "sticker" ? null : probe.duracion_seconds;

        // 6) Espejo en Drive (best-effort; null si no hay escritura).
        const driveFileId = project.drive_folder_id
          ? await subirArchivoADrive(
              project.drive_folder_id,
              nombre,
              buffer,
              mime || "application/octet-stream"
            )
          : null;

        // 7) Fila en project_assets.
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
        // Falla inesperada: limpiar tanto el temporal como el definitivo si
        // alcanzó a existir (borrarAssetsStorage ignora los que ya no estén).
        await borrarAssetsStorage(storagePath ? [ruta, storagePath] : [ruta]);
        const motivo = err instanceof Error ? err.message : String(err);
        rechazados.push({ nombre: nombreOriginal, motivo });
      }
    }

    const status = assets.length > 0 ? 201 : 400;
    return NextResponse.json({ assets, rechazados }, { status });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado registrando las subidas";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
