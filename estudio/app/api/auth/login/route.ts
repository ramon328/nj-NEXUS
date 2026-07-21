import { NextResponse } from "next/server";
import { compararSeguro, crearTokenSesion, NOMBRE_COOKIE } from "@/lib/auth";

// POST /api/auth/login
// Body: { password: string }
// Compara la contraseña con APP_PASSWORD (en tiempo constante) y, si
// coincide, deja la cookie de sesión HttpOnly por 30 días.
export async function POST(request: Request) {
  const appPassword = process.env.APP_PASSWORD;

  // Sin APP_PASSWORD la app está abierta: no hay nada que validar.
  if (!appPassword) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => null);
  const password: unknown = body?.password;
  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Falta la contraseña en el cuerpo de la petición" },
      { status: 400 }
    );
  }

  // Comparación en tiempo constante para no filtrar nada por tiempos.
  if (!(await compararSeguro(password, appPassword))) {
    return NextResponse.json(
      { error: "Contraseña incorrecta" },
      { status: 401 }
    );
  }

  const token = await crearTokenSesion(appPassword);
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set({
    name: NOMBRE_COOKIE,
    value: token,
    httpOnly: true,
    // En localhost sin https una cookie Secure no se guarda: solo en prod.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 días, en segundos
    path: "/",
  });
  return respuesta;
}
