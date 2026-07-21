// OAuth de "Instagram API with Instagram Login" (flujo directo lanzado en 2024):
// el usuario vincula su cuenta de Instagram de EMPRESA/CREADOR con un clic, sin
// necesidad de una pagina de Facebook. Este modulo solo arma URLs y hace las
// llamadas HTTP del intercambio de tokens; NO toca la base de datos.
//
// Flujo:
//   1. urlAutorizacion() -> el navegador va a www.instagram.com/oauth/authorize
//   2. Instagram redirige al callback con ?code=...
//   3. intercambiarCodigo() -> token de corta duracion + user_id (id de la cuenta)
//   4. tokenLargaDuracion() -> token de ~60 dias
//   5. perfilInstagram() -> username / account_type para mostrar en la UI
//
// Requiere las variables de entorno INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET
// (las da Meta al crear la app con el producto "Instagram" > "Instagram business
// login"). El App Secret es SOLO servidor y nunca se manda al navegador.

// Scopes minimos para leer el perfil y publicar contenido.
export const SCOPES_INSTAGRAM =
  "instagram_business_basic,instagram_business_content_publish";

// Host de la Graph API de Instagram (flujo Instagram Login).
export const GRAPH_INSTAGRAM = "https://graph.instagram.com";

// Nombre de la cookie anti-CSRF (state) del flujo OAuth de Instagram.
export const COOKIE_ESTADO_IG = "ig_oauth_state";

/** ¿Están las credenciales de la app de Instagram configuradas? */
export function instagramConfigurado(): boolean {
  return Boolean(
    process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET
  );
}

/**
 * Origen PÚBLICO del sitio (https://dominio), estable detrás del proxy TLS de
 * Vercel. Prioridad: APP_PUBLIC_URL (fuente de verdad recomendada) → cabeceras
 * x-forwarded-proto/host que pone el proxy → origin de request.url (último
 * recurso). NO usar request.url a secas: tras el proxy suele venir en http o con
 * un host interno, lo que rompería el redirect_uri (Meta lo exige byte-idéntico)
 * y dejaría la cookie de estado sin Secure.
 */
export function origenPublico(request: Request): string {
  const override = process.env.APP_PUBLIC_URL?.replace(/\/+$/, "");
  if (override) return override;
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}

/**
 * URL de callback (redirect_uri) que se usa en TODO el flujo. Debe ser idéntica
 * al autorizar y al intercambiar el código, y estar en las "Valid OAuth Redirect
 * URIs" de la app de Meta.
 */
export function redirectUriCallback(request: Request): string {
  return `${origenPublico(request)}/api/ajustes/instagram/callback`;
}

function credencialesApp(): { appId: string; appSecret: string } {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error(
      "Faltan INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET. Créalos en tu app de Meta " +
        "(producto Instagram → business login) y ponlos en las variables de entorno."
    );
  }
  return { appId, appSecret };
}

// Lee la respuesta JSON de Instagram y lanza un Error legible si vino error.
async function leerRespuesta<T>(res: Response, contexto: string): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // sin cuerpo JSON
  }
  if (!res.ok) {
    const e = body as
      | { error_message?: string; error?: { message?: string } }
      | null;
    const detalle =
      e?.error_message ??
      e?.error?.message ??
      `HTTP ${res.status} ${res.statusText}`;
    throw new Error(`Instagram: error al ${contexto}: ${detalle}`);
  }
  return body as T;
}

/**
 * URL a la que se envía al usuario para que autorice la app. `redirectUri` debe
 * coincidir EXACTAMENTE con una de las "Valid OAuth Redirect URIs" de la app en
 * Meta. `state` es un token anti-CSRF que se verifica en el callback.
 */
export function urlAutorizacion(redirectUri: string, state: string): string {
  const { appId } = credencialesApp();
  const url = new URL("https://www.instagram.com/oauth/authorize");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES_INSTAGRAM);
  url.searchParams.set("state", state);
  return url.toString();
}

/**
 * Intercambia el `code` del callback por un token de CORTA duración.
 * Devuelve el token y el `user_id` (id de la cuenta de Instagram para publicar).
 */
export async function intercambiarCodigo(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; userId: string }> {
  const { appId, appSecret } = credencialesApp();
  const form = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });
  const data = await leerRespuesta<{
    access_token?: string;
    user_id?: string | number;
  }>(res, "intercambiar el código por un token");
  if (!data.access_token || data.user_id == null) {
    throw new Error("Instagram no devolvió access_token/user_id al vincular.");
  }
  return { accessToken: data.access_token, userId: String(data.user_id) };
}

/**
 * Intercambia el token de corta duración por uno de LARGA duración (~60 días).
 */
export async function tokenLargaDuracion(
  shortToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const { appSecret } = credencialesApp();
  const url = new URL(`${GRAPH_INSTAGRAM}/access_token`);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortToken);
  const res = await fetch(url, { cache: "no-store" });
  const data = await leerRespuesta<{
    access_token?: string;
    expires_in?: number;
  }>(res, "obtener el token de larga duración");
  if (!data.access_token) {
    throw new Error("Instagram no devolvió el token de larga duración.");
  }
  return { accessToken: data.access_token, expiresIn: data.expires_in ?? 0 };
}

/**
 * Lee el perfil de la cuenta conectada (para mostrar @usuario y tipo de cuenta).
 * Sirve además como "probar conexión": si el token ya no vale, lanza.
 */
export async function perfilInstagram(token: string): Promise<{
  ig_user_id: string;
  username: string;
  account_type: string | null;
}> {
  const url = new URL(`${GRAPH_INSTAGRAM}/me`);
  url.searchParams.set("fields", "user_id,username,account_type");
  url.searchParams.set("access_token", token);
  const res = await fetch(url, { cache: "no-store" });
  const data = await leerRespuesta<{
    user_id?: string | number;
    id?: string | number;
    username?: string;
    account_type?: string;
  }>(res, "leer el perfil de la cuenta");
  const igId = data.user_id ?? data.id;
  if (igId == null || !data.username) {
    throw new Error("Instagram no devolvió el usuario de la cuenta.");
  }
  return {
    ig_user_id: String(igId),
    username: data.username,
    account_type: data.account_type ?? null,
  };
}
