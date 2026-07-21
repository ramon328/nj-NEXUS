// Publicación de Reels en Instagram vía Meta Graph API.
//
// LIMITACIÓN IMPORTANTE: Instagram exige que `video_url` sea un archivo MP4
// accesible públicamente por HTTPS (los servidores de Meta lo descargan de
// forma directa, sin autenticación). Los enlaces de Google Drive con permisos
// restringidos, o que redirigen a una página de confirmación, FALLAN.
// El video debe estar compartido como "cualquiera con el enlace" o alojado
// en un hosting público (por ejemplo, Supabase Storage con URL pública).

import { leerConexionInstagram } from "./ajustes";
import { GRAPH_INSTAGRAM } from "./instagramAuth";

// Base de la Graph API para el flujo clásico (token en variables de entorno,
// con Facebook Login). El flujo nuevo (cuenta vinculada desde Ajustes) usa
// graph.instagram.com (GRAPH_INSTAGRAM).
const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

// Intervalo entre consultas de estado del contenedor (ms)
const POLL_INTERVAL_MS = 4000;
// Tiempo máximo de espera a que Meta procese el video (ms)
const POLL_TIMEOUT_MS = 90_000;

interface GraphErrorBody {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
}

// Devuelve las credenciales de publicación + el host de la Graph API a usar.
// Prioridad: (1) la cuenta vinculada desde el apartado Ajustes (flujo Instagram
// Login, publica en graph.instagram.com); (2) las variables de entorno del flujo
// clásico (Facebook Login, graph.facebook.com).
async function getCredentials(): Promise<{
  accessToken: string;
  igAccountId: string;
  base: string;
}> {
  try {
    const conexion = await leerConexionInstagram();
    if (conexion?.access_token && conexion?.ig_user_id) {
      return {
        accessToken: conexion.access_token,
        igAccountId: conexion.ig_user_id,
        base: GRAPH_INSTAGRAM,
      };
    }
  } catch {
    // Si la tabla `ajustes` no existe o falla la lectura, caemos a las env vars.
  }

  const accessToken = process.env.META_ACCESS_TOKEN;
  const igAccountId = process.env.IG_BUSINESS_ACCOUNT_ID;
  if (!accessToken || !igAccountId) {
    throw new Error(
      "No hay una cuenta de Instagram vinculada. Ve a Ajustes y vincula tu cuenta " +
        "(o define META_ACCESS_TOKEN / IG_BUSINESS_ACCOUNT_ID)."
    );
  }
  return { accessToken, igAccountId, base: GRAPH_API_BASE };
}

// Lee la respuesta de la Graph API y lanza un Error legible si vino error.
async function parseGraphResponse<T>(res: Response, contexto: string): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // Sin cuerpo JSON: usamos el status HTTP como detalle
  }

  if (!res.ok) {
    const graphError = (body as GraphErrorBody | null)?.error;
    const detalle =
      graphError?.message ?? `HTTP ${res.status} ${res.statusText}`;
    throw new Error(`Error de la Graph API al ${contexto}: ${detalle}`);
  }

  return body as T;
}

/**
 * Crea un contenedor de media tipo REELS.
 * Devuelve el id del contenedor, que luego hay que esperar y publicar.
 */
export async function createReelContainer(
  videoUrl: string,
  caption: string
): Promise<string> {
  const { accessToken, igAccountId, base } = await getCredentials();

  const res = await fetch(`${base}/${igAccountId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      access_token: accessToken,
    }),
  });

  const data = await parseGraphResponse<{ id?: string }>(
    res,
    "crear el contenedor del Reel"
  );

  if (!data.id) {
    throw new Error(
      "La Graph API no devolvió un id de contenedor al crear el Reel"
    );
  }
  return data.id;
}

/**
 * Espera a que Meta termine de procesar el contenedor.
 * Consulta el estado cada 4 segundos hasta 'FINISHED' (máximo 90 segundos).
 * Lanza Error si el estado es 'ERROR' o si se agota el tiempo.
 */
export async function waitForContainer(containerId: string): Promise<void> {
  const { accessToken, base } = await getCredentials();
  const inicio = Date.now();

  while (Date.now() - inicio < POLL_TIMEOUT_MS) {
    const url = new URL(`${base}/${containerId}`);
    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", accessToken);

    const res = await fetch(url);
    const data = await parseGraphResponse<{
      status_code?: string;
      status?: string;
    }>(res, "consultar el estado del contenedor");

    if (data.status_code === "FINISHED") {
      return;
    }
    if (data.status_code === "ERROR") {
      throw new Error(
        `Meta reportó un error al procesar el video: ${
          data.status ?? "sin detalle"
        }. Verifica que la URL sea un MP4 público y accesible.`
      );
    }

    // Aún procesando: esperamos antes del siguiente intento
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Tiempo de espera agotado (${POLL_TIMEOUT_MS / 1000}s): Meta no terminó de procesar el contenedor ${containerId}`
  );
}

/**
 * Publica un contenedor ya procesado.
 * Devuelve el id del media publicado en Instagram.
 */
export async function publishContainer(containerId: string): Promise<string> {
  const { accessToken, igAccountId, base } = await getCredentials();

  const res = await fetch(`${base}/${igAccountId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: accessToken,
    }),
  });

  const data = await parseGraphResponse<{ id?: string }>(
    res,
    "publicar el contenedor"
  );

  if (!data.id) {
    throw new Error(
      "La Graph API no devolvió un id de media al publicar el Reel"
    );
  }
  return data.id;
}
