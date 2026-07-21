import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

// Archivo de video tal como lo devuelve la API de Google Drive
// (solo los campos que pedimos en `fields`).
export interface DriveVideoFile {
  id: string;
  name: string;
  mimeType: string | null;
  size: string | null;
  thumbnailLink: string | null;
  webViewLink: string | null;
  webContentLink: string | null;
  modifiedTime: string | null;
  durationMillis: string | null;
}

// La sincronización soporta tres modos, en este orden de prioridad:
// 1. Cuenta de servicio (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY):
//    acceso completo con metadatos (duración, tamaño, miniaturas).
// 2. API key de Google Cloud (GOOGLE_API_KEY): funciona con carpetas públicas
//    ("cualquiera con el enlace"), también con metadatos completos.
// 3. Sin credenciales: se lee la vista pública de la carpeta compartida.
//    No requiere configurar nada en Google Cloud, pero solo obtiene nombre e
//    id de cada archivo (sin duración ni tamaño).

function getDriveClient(): drive_v3.Drive | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const apiKey = process.env.GOOGLE_API_KEY;

  if (email && privateKey) {
    const auth = new google.auth.JWT({
      email,
      // La clave suele venir con "\n" literales en la variable de entorno.
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    return google.drive({ version: "v3", auth });
  }

  if (apiKey) {
    return google.drive({ version: "v3", auth: apiKey });
  }

  return null;
}

// Lista todos los videos de la carpeta configurada en GOOGLE_DRIVE_FOLDER_ID.
export async function listDriveVideos(): Promise<DriveVideoFile[]> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("Falta GOOGLE_DRIVE_FOLDER_ID en .env.local");
  }

  const drive = getDriveClient();
  if (drive) {
    return listWithApi(drive, folderId);
  }
  return listPublicFolder(folderId);
}

// Modo 1 y 2: API oficial de Drive (metadatos completos), con paginación.
async function listWithApi(
  drive: drive_v3.Drive,
  folderId: string
): Promise<DriveVideoFile[]> {
  const videos: DriveVideoFile[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const res: { data: drive_v3.Schema$FileList } = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
      fields:
        "nextPageToken, files(id,name,mimeType,size,thumbnailLink,webViewLink,webContentLink,modifiedTime,videoMediaMetadata(durationMillis))",
      pageSize: 100,
      pageToken,
    });

    for (const file of res.data.files ?? []) {
      if (!file.id || !file.name) continue; // sin id o nombre no podemos sincronizar
      videos.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType ?? null,
        size: file.size ?? null,
        thumbnailLink: file.thumbnailLink ?? null,
        webViewLink: file.webViewLink ?? null,
        webContentLink: file.webContentLink ?? null,
        modifiedTime: file.modifiedTime ?? null,
        durationMillis: file.videoMediaMetadata?.durationMillis ?? null,
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return videos;
}

// Modo 3 (sin credenciales): lee la vista embebida de la carpeta pública.
// Solo entrega nombre e id; las URLs de miniatura/descarga se construyen
// con los enlaces públicos estándar de Drive.
async function listPublicFolder(folderId: string): Promise<DriveVideoFile[]> {
  const res = await fetch(
    `https://drive.google.com/embeddedfolderview?id=${folderId}`,
    { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(
      `No se pudo leer la carpeta pública de Drive (HTTP ${res.status}). ` +
        "Verifica que la carpeta esté compartida como 'Cualquier persona con el enlace'."
    );
  }

  const html = await res.text();

  // Cada archivo aparece como: <div class="flip-entry" id="entry-FILE_ID"> ...
  // <div class="flip-entry-title">NOMBRE</div>
  const videos: DriveVideoFile[] = [];
  const entryRegex =
    /id="entry-([A-Za-z0-9_-]+)"[\s\S]*?flip-entry-title">([^<]+)</g;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(html)) !== null) {
    const id = match[1];
    const name = decodeHtmlEntities(match[2]);
    videos.push({
      id,
      name,
      mimeType: guessVideoMime(name),
      size: null,
      thumbnailLink: `https://drive.google.com/thumbnail?id=${id}&sz=w640`,
      webViewLink: `https://drive.google.com/file/d/${id}/view`,
      webContentLink: `https://drive.google.com/uc?export=download&id=${id}`,
      modifiedTime: null,
      durationMillis: null,
    });
  }

  // En este modo la carpeta puede listar también archivos que no son video;
  // filtramos por extensión conocida.
  return videos.filter((v) => v.mimeType !== null);
}

function guessVideoMime(name: string): string | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const map: Record<string, string> = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mkv: "video/x-matroska",
  };
  return map[ext] ?? null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// ---------- Escritura en Drive (opcional, solo cuenta de servicio) ----------
//
// La escritura (crear carpetas de proyecto y espejar archivos) requiere el
// scope completo https://www.googleapis.com/auth/drive, así que solo funciona
// en el modo 1 (cuenta de servicio). Con API key o carpeta pública no hay
// escritura: estas funciones devuelven null y el flujo sigue sin Drive.
// Los tres modos de LECTURA de arriba no se tocan (siguen usando readonly).

// ¿Hay credenciales de cuenta de servicio para escribir en Drive?
export function driveEscrituraDisponible(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY
  );
}

// Cliente con permiso de escritura (independiente del cliente readonly de
// lectura). null si no hay cuenta de servicio configurada.
function getDriveWriteClient(): drive_v3.Drive | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !privateKey) return null;

  const auth = new google.auth.JWT({
    email,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

// Crea una carpeta con el nombre dado dentro de GOOGLE_DRIVE_FOLDER_ID.
// Devuelve el id de la carpeta, o null si la escritura no está disponible
// o si Drive falla (best-effort: solo se registra la advertencia).
export async function crearCarpetaDrive(nombre: string): Promise<string | null> {
  const drive = getDriveWriteClient();
  const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!drive || !parentId || !nombre.trim()) return null;

  try {
    const res = await drive.files.create({
      requestBody: {
        name: nombre.trim(),
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id",
      supportsAllDrives: true,
    });
    return res.data.id ?? null;
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.warn(
      `No se pudo crear la carpeta '${nombre}' en Drive (se continúa sin espejo): ${mensaje}`
    );
    return null;
  }
}

// Sube un archivo a la carpeta de Drive indicada. Devuelve el id del archivo,
// o null si la escritura no está disponible o si Drive falla (best-effort).
export async function subirArchivoADrive(
  folderId: string,
  nombre: string,
  buffer: Buffer,
  mime: string
): Promise<string | null> {
  const drive = getDriveWriteClient();
  if (!drive || !folderId) return null;

  try {
    const res = await drive.files.create({
      requestBody: { name: nombre, parents: [folderId] },
      media: { mimeType: mime, body: Readable.from(buffer) },
      fields: "id",
      supportsAllDrives: true,
    });
    return res.data.id ?? null;
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    console.warn(
      `No se pudo espejar '${nombre}' en Drive (se continúa sin espejo): ${mensaje}`
    );
    return null;
  }
}
