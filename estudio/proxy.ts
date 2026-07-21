// Portón de acceso de toda la app (convención proxy.ts de Next 16, antes
// llamada middleware). Si APP_PASSWORD no está definida, la app queda abierta
// (modo local). Si está definida, toda ruta no pública exige la cookie de
// sesión firmada: sin ella, las páginas redirigen a /acceso y la API responde
// 401. Además aplica un rate limit básico al login para frenar fuerza bruta.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { NOMBRE_COOKIE, bearerBackendValido, validarTokenSesion } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Rate limit básico en memoria por IP, SOLO para /api/auth/login.
// OJO: en serverless (Vercel) este Map vive POR INSTANCIA — cada instancia
// cuenta sus propios intentos, así que es una defensa SECUNDARIA anti-abuso;
// la defensa primaria sigue siendo la contraseña (y su firma HMAC).
// ---------------------------------------------------------------------------
const VENTANA_MS = 10 * 60 * 1000; // 10 minutos
const MAX_INTENTOS = 10;
const intentosPorIp = new Map<string, { cuenta: number; desde: number }>();

function excedeLimite(ip: string): boolean {
  const ahora = Date.now();
  const registro = intentosPorIp.get(ip);
  if (!registro || ahora - registro.desde > VENTANA_MS) {
    intentosPorIp.set(ip, { cuenta: 1, desde: ahora });
    return false;
  }
  registro.cuenta += 1;
  return registro.cuenta > MAX_INTENTOS;
}

// Rutas públicas: el portón mismo, el login, el ping de salud (documentado
// SIN auth y no expone secretos: lo usan el front para sondear el backend y
// scripts/verificar-backend.mts) y los assets públicos que usa el render de
// video (música, stickers y fuentes NO se bloquean).
function esRutaPublica(pathname: string): boolean {
  return (
    pathname === "/acceso" ||
    pathname === "/api/salud" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/musica") ||
    pathname.startsWith("/stickers") ||
    pathname.startsWith("/fuentes")
  );
}

export async function proxy(request: NextRequest) {
  // Sin APP_PASSWORD la app funciona abierta, igual que hoy (modo local).
  if (!process.env.APP_PASSWORD) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // El login es público, pero con rate limit por IP contra fuerza bruta.
  if (pathname === "/api/auth/login") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "desconocida";
    if (request.method === "POST" && excedeLimite(ip)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera 10 minutos y vuelve a probar." },
        { status: 429 }
      );
    }
    return NextResponse.next();
  }

  if (esRutaPublica(pathname)) {
    return NextResponse.next();
  }

  // Acceso servidor-a-servidor a la API: cuando esta instancia corre como
  // backend de render (Mac mini), el front (Vercel) llama SIN cookie, con
  // "Authorization: Bearer <BACKEND_SECRET>". Se valida aquí para que la
  // petición llegue al route handler (que además re-verifica con
  // verificarAcceso, defensa en profundidad).
  if (pathname.startsWith("/api/") && (await bearerBackendValido(request))) {
    return NextResponse.next();
  }

  // Resto de rutas: exigir cookie de sesión con token firmado y vigente.
  const token = request.cookies.get(NOMBRE_COOKIE)?.value;
  if (token && (await validarTokenSesion(token))) {
    return NextResponse.next();
  }

  // Sin sesión: la API responde 401 JSON y las páginas van al portón.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/acceso", request.url));
}

export const config = {
  // Excluye de entrada los assets estáticos y públicos para no ejecutar el
  // proxy (ni bloquear CSS/JS/imágenes) en cada request de archivos.
  //
  // "api/media/" (con barra: NO tapa /api/medios) también queda fuera porque
  // esas rutas se autentican SOLAS y el proxy las rompería:
  //  - POST /api/media/subir valida su propio x-media-token (el navegador
  //    sube trozos directo al mini SIN cookie ni Bearer) y su preflight
  //    OPTIONS llega sin credenciales;
  //  - GET /api/media/archivo/... es público a propósito (es el public_url
  //    de los <video> y del motor; la ruta es impredecible por el uuid);
  //  - DELETE /api/media/archivo/... re-verifica con verificarAcceso en el
  //    propio handler.
  // Además así el proxy no buffea en RAM los cuerpos de 25 MB de cada trozo.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|musica|stickers|fuentes|api/media/).*)",
  ],
};
