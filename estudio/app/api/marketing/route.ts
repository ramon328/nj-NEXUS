import { NextResponse } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase";
import {
  ejecutarHerramienta,
  esHerramientaMarketing,
  ErrorDeEntrada,
  HERRAMIENTAS_MARKETING,
} from "@/lib/marketing";
import type { Estrategia } from "@/lib/types";

// API de las herramientas de estrategia de marketing.
//   POST   /api/marketing              { herramienta, entrada } → { estrategia }
//   GET    /api/marketing?herramienta= → { estrategias } (últimas 20)
//   DELETE /api/marketing?id=          → { ok }

// Si el error viene de que la tabla estrategias aún no existe en el Supabase
// real, agrega la pista de cómo arreglarlo (correr el schema.sql).
function pistaPostgrest(mensaje: string): string {
  if (/does not exist|schema cache/i.test(mensaje)) {
    return (
      `${mensaje}. Es probable que falte la tabla "estrategias": ` +
      "ejecuta supabase/schema.sql en el SQL Editor de Supabase."
    );
  }
  return mensaje;
}

export async function POST(request: Request) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => null);
    const herramienta: unknown = body?.herramienta;
    if (!esHerramientaMarketing(herramienta)) {
      return NextResponse.json(
        {
          error: `Herramienta no válida. Usa una de: ${HERRAMIENTAS_MARKETING.join(", ")}`,
        },
        { status: 400 }
      );
    }
    const entrada: Record<string, unknown> =
      body?.entrada && typeof body.entrada === "object" && !Array.isArray(body.entrada)
        ? (body.entrada as Record<string, unknown>)
        : {};

    // Ejecutar la herramienta con Claude (valida su propia entrada).
    let titulo: string;
    let resultado: Record<string, unknown>;
    try {
      ({ titulo, resultado } = await ejecutarHerramienta(herramienta, entrada));
    } catch (e) {
      if (e instanceof ErrorDeEntrada) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    // Guardar la ejecución en la tabla estrategias.
    const supabase = getSupabaseServer();
    const { data: estrategia, error: insertError } = await supabase
      .from("estrategias")
      .insert({ herramienta, titulo, entrada, resultado })
      .select()
      .single();

    if (insertError || !estrategia) {
      return NextResponse.json(
        {
          error: `No se pudo guardar la estrategia: ${pistaPostgrest(insertError?.message ?? "error desconocido")}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ estrategia: estrategia as Estrategia });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado generando la estrategia";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const herramienta = url.searchParams.get("herramienta");
    if (herramienta && !esHerramientaMarketing(herramienta)) {
      return NextResponse.json(
        {
          error: `Herramienta no válida. Usa una de: ${HERRAMIENTAS_MARKETING.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    let consulta = supabase
      .from("estrategias")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (herramienta) {
      consulta = consulta.eq("herramienta", herramienta);
    }

    const { data, error } = await consulta;
    if (error) {
      return NextResponse.json(
        { error: pistaPostgrest(error.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ estrategias: (data ?? []) as Estrategia[] });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado cargando estrategias";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Falta el parámetro id (?id=...)" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase.from("estrategias").delete().eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: pistaPostgrest(error.message) },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error inesperado borrando la estrategia";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
