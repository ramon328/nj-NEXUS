import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import {
  COOKIE_ESTADO_IG,
  instagramConfigurado,
  redirectUriCallback,
  urlAutorizacion,
} from "@/lib/instagramAuth";

// GET /api/ajustes/instagram/conectar
// Inicia el OAuth: el navegador (con sesión) llega aquí, guardamos un `state`
// firmado en cookie y redirigimos a la pantalla de autorización de Instagram.
export async function GET(request: Request) {
  // El usuario llega navegando con su cookie de sesión; si no, al portón.
  if (!(await verificarAcceso(request))) {
    return NextResponse.redirect(new URL("/acceso", request.url));
  }

  // Sin credenciales de la app no hay botón que valga: volvemos con un aviso.
  if (!instagramConfigurado()) {
    return NextResponse.redirect(
      new URL("/?tab=ajustes&ajustes=ig_no_config", request.url)
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = redirectUriCallback(request);
  const destino = urlAutorizacion(redirectUri, state);

  const res = NextResponse.redirect(destino);
  // Cookie de vida corta (10 min), httpOnly, sameSite=lax para que sobreviva a
  // la vuelta desde instagram.com. Se compara en el callback.
  res.cookies.set({
    name: COOKIE_ESTADO_IG,
    value: state,
    httpOnly: true,
    // Igual que la cookie de sesión: Secure en producción (detrás del proxy TLS
    // de Vercel request.url puede venir en http y dejaría la cookie sin Secure).
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
