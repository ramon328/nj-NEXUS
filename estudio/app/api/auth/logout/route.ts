import { NextResponse } from "next/server";
import { NOMBRE_COOKIE } from "@/lib/auth";

// POST /api/auth/logout — borra la cookie de sesión (cierra la sesión).
export async function POST() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set({
    name: NOMBRE_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0, // expira de inmediato
    path: "/",
  });
  return respuesta;
}
