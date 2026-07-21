import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { firmarTokenMedia } from "@/lib/mediaLocal";

// Validez del token de subida: 2 horas (de sobra para subir ~1 GB en trozos).
const DURACION_TOKEN_MS = 2 * 60 * 60 * 1000;

// Límite de la subida por trozos: 40 trozos de 25 MB ≈ 1 GB.
const MAXIMO_MB = 1000;

// POST /api/projects/[id]/assets/token-mini
//
// Entrega al navegador lo necesario para subir un video grande POR TROZOS
// directo al almacén local del motor (POST {url}/api/media/subir):
//   { url, token, maximoMb }
//  - url: RENDER_BACKEND_URL (el mini). Si está VACÍA, el front no tiene
//    backend remoto y el navegador sube a su MISMO origen (modo local).
//  - token: firmado aquí con el MISMO BACKEND_SECRET que comparten front y
//    mini, así el mini lo valida sin más viajes. NO se reenvía al backend.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del proyecto en la URL" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      url: process.env.RENDER_BACKEND_URL || "",
      token: firmarTokenMedia(id, Date.now() + DURACION_TOKEN_MS),
      maximoMb: MAXIMO_MB,
    });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado firmando el token de subida";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
