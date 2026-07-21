import { NextResponse } from "next/server";
import {
  listarMusica,
  listarStickers,
  listarFuentes,
  listarEfectosSonido,
} from "@/lib/medios";

// GET /api/medios
// Devuelve el catálogo de medios locales (de /public) para poblar los
// selectores del editor visual: música de fondo, stickers PNG, fuentes
// tipográficas y efectos de sonido. Cada campo es un array de NOMBRES de
// archivo (sin ruta), en el orden en que los devuelven las utilidades de
// lib/medios.
//
// Respuesta: { musica: string[], stickers: string[], fuentes: string[], efectos: string[] }
export async function GET() {
  try {
    const musica = listarMusica().map((m) => m.archivo);
    const stickers = listarStickers().map((s) => s.archivo);
    const fuentes = listarFuentes().map((f) => f.archivo);
    const efectos = listarEfectosSonido().map((e) => e.archivo);

    return NextResponse.json({ musica, stickers, fuentes, efectos });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Error inesperado listando los medios";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
