import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { compararSeguro, verificarAcceso } from "@/lib/auth";
import { guardarConexionInstagram, type ConexionInstagram } from "@/lib/ajustes";
import {
  COOKIE_ESTADO_IG,
  intercambiarCodigo,
  perfilInstagram,
  redirectUriCallback,
  tokenLargaDuracion,
} from "@/lib/instagramAuth";

// Redirige de vuelta al apartado Ajustes con un aviso (ok o error).
function volver(request: Request, params: Record<string, string>): NextResponse {
  const url = new URL("/", request.url);
  url.searchParams.set("tab", "ajustes");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  // Limpiar la cookie de estado en cualquier caso.
  res.cookies.set({ name: COOKIE_ESTADO_IG, value: "", path: "/", maxAge: 0 });
  return res;
}

// GET /api/ajustes/instagram/callback?code=...&state=...
// Instagram redirige aquí tras autorizar. Verificamos el `state`, cambiamos el
// código por un token de larga duración, leemos el perfil y guardamos todo.
export async function GET(request: NextRequest) {
  if (!(await verificarAcceso(request))) {
    return NextResponse.redirect(new URL("/acceso", request.url));
  }

  const { searchParams } = new URL(request.url);

  // El usuario canceló o Instagram devolvió un error de autorización. NO se
  // refleja el texto crudo de la query (es controlable por terceros): se mapea a
  // un mensaje fijo para no pintar contenido arbitrario en la UI.
  if (searchParams.get("error")) {
    const msg =
      searchParams.get("error") === "access_denied"
        ? "Cancelaste la autorización en Instagram."
        : "Instagram rechazó la autorización. Intenta de nuevo.";
    return volver(request, { ajustes: "ig_error", msg });
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieEstado = request.cookies.get(COOKIE_ESTADO_IG)?.value;

  if (!code) {
    return volver(request, { ajustes: "ig_error", msg: "No llegó el código de Instagram." });
  }
  // Verificación anti-CSRF en tiempo constante (compararSeguro hace hash SHA-256).
  if (!state || !cookieEstado || !(await compararSeguro(state, cookieEstado))) {
    return volver(request, {
      ajustes: "ig_error",
      msg: "La verificación de seguridad falló. Intenta vincular de nuevo.",
    });
  }

  try {
    const redirectUri = redirectUriCallback(request);
    // 1. código → token corto (+ user_id de la cuenta).
    const { accessToken: corto } = await intercambiarCodigo(code, redirectUri);
    // 2. token corto → token largo (~60 días).
    const { accessToken, expiresIn } = await tokenLargaDuracion(corto);
    // 3. perfil para mostrar @usuario y confirmar el id real de la cuenta.
    const perfil = await perfilInstagram(accessToken);

    const conexion: ConexionInstagram = {
      ig_user_id: perfil.ig_user_id,
      username: perfil.username,
      account_type: perfil.account_type,
      access_token: accessToken,
      token_expira_at: expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null,
      conectado_at: new Date().toISOString(),
      origen: "oauth",
    };
    await guardarConexionInstagram(conexion);

    return volver(request, { ajustes: "ig_ok", usuario: perfil.username });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "No se pudo completar la vinculación.";
    return volver(request, { ajustes: "ig_error", msg: mensaje });
  }
}
