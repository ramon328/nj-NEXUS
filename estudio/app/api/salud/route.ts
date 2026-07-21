import { existsSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { backendConfigurado, urlBackend } from "@/lib/backend";
import { resolveFfmpeg } from "@/lib/ffmpeg";
import { resolveWhisper } from "@/lib/transcribe";
import { getSupabaseServer } from "@/lib/supabase";
import paquete from "@/package.json";

// GET /api/salud — ping de salud SIN auth (no expone secretos).
// Sirve para: a) comprobar desde el navegador en qué modo corre esta
// instancia, y b) que el front (Vercel) compruebe si el backend de render
// (Mac mini) está alcanzable.
// Respuesta: { ok, modo, version, motor: {...}, backend?: { alcanzable } }.

/** ¿Hay binario de ffmpeg utilizable? resolveFfmpeg lanza si no encuentra. */
function comprobarFfmpeg(): boolean {
  try {
    resolveFfmpeg();
    return true;
  } catch {
    return false;
  }
}

/** ¿Está whisper.cpp disponible para transcribir? */
function comprobarWhisper(): boolean {
  try {
    return resolveWhisper() !== null;
  } catch {
    return false;
  }
}

/** ¿Está la capa de gráficos Remotion presente en este despliegue? */
function comprobarRemotion(): boolean {
  try {
    return (
      existsSync(path.join(process.cwd(), "remotion", "index.ts")) &&
      existsSync(path.join(process.cwd(), "lib", "overlay.ts"))
    );
  } catch {
    return false;
  }
}

/** Select barato contra Supabase con timeout de 3s. */
async function comprobarSupabase(): Promise<boolean> {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("videos")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(3_000));
    return !error;
  } catch {
    return false;
  }
}

/** ¿Responde el /api/salud del backend remoto? Timeout de 5s. */
async function comprobarBackend(): Promise<boolean> {
  try {
    const cabeceras: Record<string, string> = {};
    if (process.env.BACKEND_SECRET) {
      cabeceras.authorization = `Bearer ${process.env.BACKEND_SECRET}`;
    }
    const respuesta = await fetch(urlBackend("/api/salud"), {
      headers: cabeceras,
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    return respuesta.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const [supabase, backendAlcanzable] = await Promise.all([
    comprobarSupabase(),
    process.env.RENDER_BACKEND_URL ? comprobarBackend() : Promise.resolve(null),
  ]);

  const cuerpo: {
    ok: true;
    modo: "front-con-backend" | "motor-local";
    version: string;
    motor: {
      ffmpeg: boolean;
      whisper: boolean;
      remotion: boolean;
      supabase: boolean;
    };
    backend?: { alcanzable: boolean };
  } = {
    ok: true,
    modo: backendConfigurado() ? "front-con-backend" : "motor-local",
    version: paquete.version,
    motor: {
      ffmpeg: comprobarFfmpeg(),
      whisper: comprobarWhisper(),
      remotion: comprobarRemotion(),
      supabase,
    },
  };
  if (backendAlcanzable !== null) {
    cuerpo.backend = { alcanzable: backendAlcanzable };
  }

  return NextResponse.json(cuerpo);
}
