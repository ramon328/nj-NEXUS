import { supabase } from './supabase-client.ts';

// Centraliza el manejo del token OAuth de MercadoLibre, antes duplicado inline
// en 5 edge functions. Resuelve la "bomba del token":
//  1. ML ROTA el refresh_token en cada uso → hay que persistir el nuevo al toque.
//  2. Si el guardado falla, ML ya rotó → la base queda con un token inválido y la
//     integración se rompe. Acá reintentamos el guardado.
//  3. Carreras concurrentes (dos acciones a la vez): usamos un "guarded update"
//     (WHERE refresh_token = <viejo>) y recuperamos adoptando el token que ya
//     persistió la otra llamada, en vez de reportar "token expirado" en falso.
// No requiere migración ni columnas nuevas.

const MERCADOLIBRE_APP_ID =
  Deno.env.get('MERCADOLIBRE_APP_ID') || '8320956027534200';
const MERCADOLIBRE_CLIENT_SECRET =
  Deno.env.get('MERCADOLIBRE_CLIENT_SECRET') || 'EDL8Mcgvy5qyD8slMHmkqagGJPluH2vH';

const TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const EXPIRY_MARGIN_MS = 5 * 60 * 1000; // refrescar si vence dentro de 5 min
const MIN_VALID_MS = 60 * 1000; // margen para considerar "todavía válido" al recuperar

export interface MeliIntegrationToken {
  id: number;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
}

export interface TokenResult {
  ok: boolean;
  accessToken?: string;
  expiresAt?: string;
  tokenExpired?: boolean;
  // false solo cuando refrescamos en ML pero NO logramos guardar los tokens
  // nuevos (ML ya rotó → la próxima llamada fallará). Los flujos que solo
  // necesitan operar ahora lo ignoran; el botón "Renovar" lo reporta.
  persisted?: boolean;
  error?: string;
  details?: unknown;
}

// Devuelve un access_token fresco para la integración, refrescando solo si está
// por vencer (margen de 5 min). Es el reemplazo directo del bloque inline.
export async function ensureFreshMeliToken(
  integration: MeliIntegrationToken
): Promise<TokenResult> {
  const expiresAtMs = integration.expires_at
    ? new Date(integration.expires_at).getTime()
    : 0;
  // Refrescar si: no hay access_token, no hay vencimiento, o vence pronto.
  const needsRefresh =
    !integration.access_token ||
    !expiresAtMs ||
    expiresAtMs - Date.now() <= EXPIRY_MARGIN_MS;

  if (!needsRefresh) {
    return {
      ok: true,
      accessToken: integration.access_token ?? undefined,
      expiresAt: integration.expires_at ?? undefined,
    };
  }

  return await refreshMeliToken(integration.id, integration.refresh_token);
}

// Fuerza un refresh contra ML y persiste los tokens nuevos de forma robusta.
export async function refreshMeliToken(
  integrationId: number,
  oldRefreshToken: string | null
): Promise<TokenResult> {
  if (!oldRefreshToken) {
    return {
      ok: false,
      tokenExpired: true,
      error:
        'No hay refresh token para esta integración. Reconecta tu cuenta de MercadoLibre.',
    };
  }

  // 1. Pedir tokens nuevos a ML.
  const formData = new URLSearchParams();
  formData.append('grant_type', 'refresh_token');
  formData.append('client_id', MERCADOLIBRE_APP_ID);
  formData.append('client_secret', MERCADOLIBRE_CLIENT_SECRET);
  formData.append('refresh_token', oldRefreshToken);

  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
    tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || tokenData.error) {
      console.error('[meli-token] ML rechazó el refresh:', JSON.stringify(tokenData));
      // Puede ser que otra llamada concurrente ya haya refrescado (token de un
      // solo uso). Intentar adoptar el token que esa otra llamada persistió.
      const recovered = await recoverFromConcurrentRefresh(integrationId, oldRefreshToken);
      if (recovered) return recovered;
      // Distinguir refresh_token REALMENTE inválido (invalid_grant) de un error
      // transitorio de ML (429/500/503): solo el primero amerita "reconecta".
      const invalidGrant = tokenData.error === 'invalid_grant';
      return {
        ok: false,
        tokenExpired: invalidGrant,
        error: invalidGrant
          ? 'Token de MercadoLibre expirado. Por favor, renueva tu conexión en la página de MercadoLibre.'
          : 'MercadoLibre no respondió correctamente al renovar la sesión. Intenta de nuevo en unos minutos.',
        details: tokenData,
      };
    }
  } catch (e) {
    console.error('[meli-token] Error de red al refrescar:', e);
    return {
      ok: false,
      error: 'Error de red al refrescar el token de MercadoLibre.',
      details: String(e),
    };
  }

  // 2. Persistir con guarded update + reintentos. ML ya rotó el token, así que
  //    DEBEMOS dejar esto guardado o la integración queda rota.
  // ML normalmente devuelve 21600 (6h). Si faltara, usamos ese default en vez
  // de 0 (que marcaría el token como ya vencido y forzaría otro refresh inútil).
  const expiresInSec =
    tokenData.expires_in && tokenData.expires_in > 0 ? tokenData.expires_in : 21600;
  const expiryIso = new Date(Date.now() + expiresInSec * 1000).toISOString();
  const updateData = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: expiresInSec,
    expires_at: expiryIso,
    update_at: new Date().toISOString(),
    status: 'active',
  };

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('meli_integration')
      .update(updateData)
      .eq('id', integrationId)
      .eq('refresh_token', oldRefreshToken) // guard: solo si nadie más refrescó
      .select('id');

    if (!error) {
      if (data && data.length > 0) {
        return { ok: true, accessToken: tokenData.access_token, expiresAt: expiryIso };
      }
      // 0 filas: otra llamada refrescó entre nuestra lectura y escritura.
      // Adoptar el token persistido por esa otra llamada.
      const recovered = await recoverFromConcurrentRefresh(integrationId, oldRefreshToken);
      if (recovered) return recovered;
      // No se pudo adoptar; nuestro access_token recién emitido sigue válido ahora.
      return { ok: true, accessToken: tokenData.access_token, expiresAt: expiryIso };
    }

    lastError = error;
    await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
  }

  // Agotados los reintentos: la base quedó con el refresh_token viejo (inválido).
  // Igual devolvemos el access_token nuevo para que la operación actual proceda,
  // pero dejamos rastro fuerte para diagnóstico.
  console.error(
    '[meli-token] CRÍTICO: refrescamos en ML pero falló persistir los tokens nuevos',
    lastError
  );
  return {
    ok: true,
    accessToken: tokenData.access_token,
    expiresAt: expiryIso,
    persisted: false,
    error: 'persist_failed',
  };
}

// Si otra llamada concurrente ya refrescó, la fila ahora tiene otro refresh_token
// y un access_token fresco. Lo releemos y lo adoptamos.
async function recoverFromConcurrentRefresh(
  integrationId: number,
  oldRefreshToken: string
): Promise<TokenResult | null> {
  const { data: fresh } = await supabase
    .from('meli_integration')
    .select('access_token, refresh_token, expires_at')
    .eq('id', integrationId)
    .single();

  if (fresh && fresh.refresh_token && fresh.refresh_token !== oldRefreshToken) {
    const expMs = fresh.expires_at ? new Date(fresh.expires_at).getTime() : 0;
    if (expMs - Date.now() > MIN_VALID_MS) {
      return {
        ok: true,
        accessToken: fresh.access_token,
        expiresAt: fresh.expires_at,
      };
    }
  }
  return null;
}
