// Ajustes de la app (tabla `ajustes`: clave -> valor JSON). Acceso SOLO servidor
// (service role de Supabase); nunca se expone el valor crudo al navegador porque
// puede contener tokens. La UI lee un resumen "seguro" via /api/ajustes.
//
// Hoy guarda la conexion de Instagram (apartado "Ajustes"): el token de larga
// duracion + el id/username de la cuenta de negocio, para poder publicar.

import { getSupabaseServer } from "./supabase";

// Clave de la fila que guarda la conexion de Instagram.
export const CLAVE_INSTAGRAM = "instagram";

/**
 * Conexion de una cuenta de Instagram de empresa/creador vinculada por OAuth
 * (flujo "Instagram API with Instagram Login"). El `ig_user_id` es el id que se
 * usa para publicar en graph.instagram.com/{ig_user_id}/media.
 */
export interface ConexionInstagram {
  ig_user_id: string;
  username: string;
  account_type: string | null;
  access_token: string;
  // ISO 8601. Cuando caduca el token de larga duracion (~60 dias); null si no se
  // conoce (p. ej. token pegado a mano).
  token_expira_at: string | null;
  conectado_at: string;
  // "oauth" (vinculado con el boton) o "manual" (token pegado a mano).
  origen: "oauth" | "manual";
}

// Resumen sin secretos para mandar al navegador.
export interface ResumenInstagram {
  conectado: boolean;
  configurado: boolean; // ¿hay INSTAGRAM_APP_ID/SECRET para el boton de vincular?
  username: string | null;
  account_type: string | null;
  conectado_at: string | null;
  origen: ConexionInstagram["origen"] | null;
}

// ---------------------------------------------------------------------------
// Acceso genérico clave/valor.
// ---------------------------------------------------------------------------

/** Lee un ajuste por clave. Devuelve null si no existe. */
export async function leerAjuste<T = unknown>(clave: string): Promise<T | null> {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("ajustes")
    .select("valor")
    .eq("clave", clave)
    .maybeSingle<{ valor: T }>();
  if (error) {
    throw new Error(error.message);
  }
  return data?.valor ?? null;
}

/** Guarda (upsert) un ajuste por clave. */
export async function guardarAjuste(clave: string, valor: unknown): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from("ajustes")
    .upsert(
      { clave, valor, updated_at: new Date().toISOString() },
      { onConflict: "clave" }
    );
  if (error) {
    throw new Error(error.message);
  }
}

/** Borra un ajuste por clave (no falla si no existe). */
export async function borrarAjuste(clave: string): Promise<void> {
  const supabase = getSupabaseServer();
  const { error } = await supabase.from("ajustes").delete().eq("clave", clave);
  if (error) {
    throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Conexion de Instagram.
// ---------------------------------------------------------------------------

/** Lee la conexion de Instagram guardada (con el token). null si no hay. */
export async function leerConexionInstagram(): Promise<ConexionInstagram | null> {
  return leerAjuste<ConexionInstagram>(CLAVE_INSTAGRAM);
}

/** Guarda/actualiza la conexion de Instagram. */
export async function guardarConexionInstagram(
  conexion: ConexionInstagram
): Promise<void> {
  await guardarAjuste(CLAVE_INSTAGRAM, conexion);
}

/** Desvincula la cuenta de Instagram (borra la fila). */
export async function borrarConexionInstagram(): Promise<void> {
  await borrarAjuste(CLAVE_INSTAGRAM);
}
