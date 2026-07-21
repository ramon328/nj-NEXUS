import { promises as fs } from "fs";
import { getSupabaseServer } from "./supabase";

// Bucket público donde se guardan los videos editados. Al ser público,
// la URL resultante sirve directamente para publicar en Instagram
// (la Graph API exige un MP4 accesible públicamente).
const BUCKET = "videos-editados";

async function ensureBucket(): Promise<void> {
  const supabase = getSupabaseServer();
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`No se pudieron listar los buckets de Storage: ${error.message}`);
  }
  if (buckets?.some((b) => b.name === BUCKET)) return;

  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });
  if (createError && !/already exists/i.test(createError.message)) {
    throw new Error(`No se pudo crear el bucket '${BUCKET}': ${createError.message}`);
  }
}

// Sube un MP4 local al bucket público y devuelve su URL pública.
// Nota: el plan gratuito de Supabase limita cada archivo a 50 MB.
export async function uploadEditedVideo(
  localPath: string,
  fileName: string
): Promise<string> {
  await ensureBucket();
  const supabase = getSupabaseServer();

  const buffer = await fs.readFile(localPath);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: "video/mp4", upsert: true });
  if (error) {
    throw new Error(`No se pudo subir el video editado: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

// Borra un único archivo del bucket "videos-editados". No lanza si el archivo
// no existe: solo lo registra en consola, porque el flujo de borrado del video
// debe continuar aunque falte algún archivo (por ejemplo, ediciones que nunca
// llegaron a subirse). `fileName` es el nombre dentro del bucket, ej.
// "<editId>.mp4" (derivable del output_url con split('/').pop()).
export async function borrarVideoEditado(fileName: string): Promise<void> {
  if (!fileName) return;
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.storage.from(BUCKET).remove([fileName]);
    if (error) {
      console.warn(
        `No se pudo borrar '${fileName}' de Storage (se ignora): ${error.message}`
      );
    }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.warn(
      `Error inesperado al borrar '${fileName}' de Storage (se ignora): ${mensaje}`
    );
  }
}

// Borra varios archivos del bucket en una sola llamada. Ignora los nombres
// vacíos y no lanza si falla: solo lo registra en consola.
export async function borrarVariosEditados(fileNames: string[]): Promise<void> {
  const limpios = fileNames.filter((f): f is string => Boolean(f));
  if (limpios.length === 0) return;
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase.storage.from(BUCKET).remove(limpios);
    if (error) {
      console.warn(
        `No se pudieron borrar ${limpios.length} archivos de Storage (se ignora): ${error.message}`
      );
    }
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.warn(
      `Error inesperado al borrar archivos de Storage (se ignora): ${mensaje}`
    );
  }
}

// Deriva el nombre de archivo dentro del bucket a partir del output_url de un
// edit (ej. ".../videos-editados/<editId>.mp4" → "<editId>.mp4"). Si no hay
// output_url usable, cae al id del edit con extensión .mp4.
export function nombreArchivoDeEdit(
  outputUrl: string | null | undefined,
  editId: string
): string {
  if (outputUrl) {
    const nombre = outputUrl.split("/").pop();
    if (nombre) return nombre.split("?")[0];
  }
  return `${editId}.mp4`;
}
