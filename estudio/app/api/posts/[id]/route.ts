import { NextResponse, after } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { backendConfigurado, reenviarAlBackend } from "@/lib/backend";
import { mensajeErrorPostgrest } from "@/lib/proyectos";
import { getSupabaseServer } from "@/lib/supabase";
import { renderPostDesdePlan } from "@/lib/postJob";
import { borrarSlidesPost } from "@/lib/renderPost";
import type { PostDesignPlan } from "@/lib/types";

// El re-render (Remotion sobre varios slides) puede tardar: dejamos margen.
export const maxDuration = 300;

// Añade la pista de "corre el SQL" cuando el error sugiere que la tabla
// post_disenos aún no existe en el Supabase real.
function pistaTablaPost(mensaje: string): string {
  const conPista = mensajeErrorPostgrest(mensaje);
  if (
    /post_disenos/i.test(mensaje) ||
    /does not exist|schema cache|could not find the table/i.test(mensaje)
  ) {
    return (
      `${conPista}. Es probable que falte la tabla post_disenos: ` +
      "ejecuta supabase/schema.sql en el SQL Editor de Supabase."
    );
  }
  return conPista;
}

// GET /api/posts/[id]
// Devuelve un diseño de post concreto. 404 si no existe.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del diseño en la URL" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    const { data: diseno, error } = await supabase
      .from("post_disenos")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: `Error al leer el diseño de post: ${pistaTablaPost(error.message)}` },
        { status: 500 }
      );
    }
    if (!diseno) {
      return NextResponse.json(
        { error: "No existe un diseño de post con ese id" },
        { status: 404 }
      );
    }

    return NextResponse.json({ diseno });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado leyendo el diseño de post";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

// POST /api/posts/[id]
// Body: { plan: PostDesignPlan }
// Re-renderiza el diseño con un plan editado A MANO por el usuario, SIN volver
// a llamar a la IA. Marca la fila como "procesando" y dispara el render en
// segundo plano (renderPostDesdePlan). Responde 202 { diseno }.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Modo front-con-backend: delegar el re-render (trabajo pesado) al Mac mini
  // tal cual, ANTES de consumir el body (reenviarAlBackend usa el cuerpo crudo).
  if (backendConfigurado()) {
    const { id } = await params;
    return reenviarAlBackend(
      request,
      `/api/posts/${encodeURIComponent(id)}`
    );
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del diseño en la URL" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);

    // Validar el plan: debe venir y tener un array de slides no vacío.
    const plan = body?.plan as PostDesignPlan | undefined;
    if (!plan || typeof plan !== "object") {
      return NextResponse.json(
        { error: "Falta el campo plan en el cuerpo de la petición" },
        { status: 400 }
      );
    }
    if (!Array.isArray(plan.slides) || plan.slides.length === 0) {
      return NextResponse.json(
        { error: "El plan debe incluir al menos un slide en 'slides'" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Marcar el diseño como en proceso (y limpiar error previo). Sirve también
    // de verificación de existencia: si no hay fila, updated es null.
    const { data: updated, error: updateError } = await supabase
      .from("post_disenos")
      .update({ status: "procesando", error: null })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (updateError) {
      return NextResponse.json(
        {
          error: `No se pudo actualizar el diseño de post: ${pistaTablaPost(updateError.message)}`,
        },
        { status: 500 }
      );
    }
    if (!updated) {
      return NextResponse.json(
        { error: "No existe un diseño de post con ese id" },
        { status: 404 }
      );
    }

    // Disparar el re-render en segundo plano SIN esperar a que termine.
    after(() =>
      renderPostDesdePlan(id, plan).catch(async (e: unknown) => {
        const mensaje =
          e instanceof Error
            ? e.message
            : "Error desconocido durante el re-render del post";
        console.error(`[posts/${id}] Re-render falló:`, mensaje);
        try {
          await supabase
            .from("post_disenos")
            .update({ status: "error", error: mensaje })
            .eq("id", id);
        } catch (dbErr) {
          console.error(
            `[posts/${id}] No se pudo registrar el error del re-render:`,
            dbErr
          );
        }
      })
    );

    return NextResponse.json({ diseno: updated }, { status: 202 });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado re-renderizando el diseño de post";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

// DELETE /api/posts/[id]
// Borra un diseño de post: elimina sus PNGs de Storage (borrarSlidesPost) y su
// fila. Responde { ok: true }. 404 si el diseño no existe.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Modo front-con-backend: delegar el borrado al Mac mini para que elimine
  // también los PNG de los slides que viven en SU disco (borrarSlidesPost). Si
  // borráramos solo aquí, la fila se iría pero los archivos quedarían huérfanos.
  if (backendConfigurado()) {
    const { id } = await params;
    return reenviarAlBackend(request, `/api/posts/${encodeURIComponent(id)}`);
  }

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del diseño en la URL" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Verificar que exista antes de borrar (para devolver 404 claro).
    const { data: diseno, error: readError } = await supabase
      .from("post_disenos")
      .select("id")
      .eq("id", id)
      .maybeSingle<{ id: string }>();
    if (readError) {
      return NextResponse.json(
        { error: `Error al leer el diseño de post: ${pistaTablaPost(readError.message)}` },
        { status: 500 }
      );
    }
    if (!diseno) {
      return NextResponse.json(
        { error: "No existe un diseño de post con ese id" },
        { status: 404 }
      );
    }

    // Borrar los PNGs de Storage (best-effort; no lanza si no existen).
    await borrarSlidesPost(id);

    // Borrar la fila.
    const { error: deleteError } = await supabase
      .from("post_disenos")
      .delete()
      .eq("id", id);
    if (deleteError) {
      return NextResponse.json(
        { error: `No se pudo borrar el diseño de post: ${pistaTablaPost(deleteError.message)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado al borrar el diseño de post";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
