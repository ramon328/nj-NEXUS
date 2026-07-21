import { NextResponse, after } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { backendConfigurado, reenviarAlBackend } from "@/lib/backend";
import { mensajeErrorPostgrest } from "@/lib/proyectos";
import { getSupabaseServer } from "@/lib/supabase";
import { runPostJob } from "@/lib/postJob";
import type { FormatoPost } from "@/lib/types";

// El diseño de un post (IA + render de varios slides con Remotion) puede tardar
// hasta unos minutos: dejamos margen amplio, aunque respondemos 202 al instante
// y el trabajo corre en segundo plano con after().
export const maxDuration = 300;

// Formatos de post admitidos (deben coincidir con FormatoPost en types.ts).
const FORMATOS_VALIDOS = [
  "cuadrado_1_1",
  "vertical_4_5",
  "historia_9_16",
] as const;

// Normaliza el formato recibido en el body: cualquier valor no reconocido cae
// en "cuadrado_1_1" (1080x1080), el formato por defecto de un post.
function normalizarFormato(valor: unknown): FormatoPost {
  return typeof valor === "string" &&
    (FORMATOS_VALIDOS as readonly string[]).includes(valor)
    ? (valor as FormatoPost)
    : "cuadrado_1_1";
}

// Normaliza el número de slides al rango 1–10 (default 5). Un carrusel de
// Instagram admite hasta 10 imágenes; 1 = imagen única.
function normalizarNSlides(valor: unknown): number {
  const n = Math.floor(Number(valor));
  if (!Number.isFinite(n)) return 5;
  return Math.min(10, Math.max(1, n));
}

// Añade una pista de "corre el SQL" cuando el error de PostgREST sugiere que la
// tabla post_disenos aún no existe en el Supabase real.
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

// POST /api/posts
// Body: { projectId?, titulo?, instruccion?, formato?, nSlides? }
// Crea un diseño de post (fila en post_disenos, status "procesando") y dispara
// el pipeline en segundo plano: la IA diseña el PostDesignPlan usando las fotos
// del proyecto y Remotion renderiza cada slide a PNG. Responde 202 { diseno }.
export async function POST(request: Request) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Modo front-con-backend: delegar el trabajo pesado al Mac mini tal cual.
  // OJO: antes de consumir el body (reenviarAlBackend usa el cuerpo crudo).
  if (backendConfigurado()) {
    return reenviarAlBackend(request, "/api/posts");
  }

  try {
    const body = await request.json().catch(() => null);

    // projectId es opcional: un post puede diseñarse desde cero (solo texto y
    // formas) sin proyecto. Si viene, verificamos que el proyecto exista.
    const projectId: string | null =
      typeof body?.projectId === "string" && body.projectId.trim()
        ? body.projectId.trim()
        : null;

    const titulo: string =
      typeof body?.titulo === "string" && body.titulo.trim()
        ? body.titulo.trim()
        : "Post";

    const instruccion: string | null =
      typeof body?.instruccion === "string" && body.instruccion.trim()
        ? body.instruccion.trim()
        : null;

    const formato = normalizarFormato(body?.formato);
    const nSlides = normalizarNSlides(body?.nSlides ?? 5);

    const supabase = getSupabaseServer();

    // 1. Si hay projectId, verificar que el proyecto exista.
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .maybeSingle<{ id: string }>();
      if (projectError) {
        return NextResponse.json(
          {
            error: `Error al leer el proyecto: ${mensajeErrorPostgrest(projectError.message)}`,
          },
          { status: 500 }
        );
      }
      if (!project) {
        return NextResponse.json(
          { error: "No existe un proyecto con ese id" },
          { status: 404 }
        );
      }
    }

    // 2. Crear la fila del diseño (status procesando). El plan y las URLs se
    //    rellenan en segundo plano. Guardamos nSlides como pista dentro de la
    //    instrucción para que la IA sepa cuántos slides diseñar.
    const instruccionConSlides =
      nSlides === 1
        ? instruccion
        : `${instruccion ? `${instruccion}\n\n` : ""}Diseña un carrusel de ${nSlides} slides.`;

    const { data: diseno, error: insertError } = await supabase
      .from("post_disenos")
      .insert({
        project_id: projectId,
        titulo,
        instruccion: instruccionConSlides,
        formato,
        status: "procesando",
      })
      .select()
      .single();
    if (insertError || !diseno) {
      return NextResponse.json(
        {
          error: `No se pudo crear el diseño de post: ${pistaTablaPost(
            insertError?.message ?? "error desconocido"
          )}`,
        },
        { status: 500 }
      );
    }

    // 3. Disparar el trabajo en segundo plano SIN esperar a que termine.
    //    runPostJob gestiona su propio estado (procesando → completado|error);
    //    este catch es un respaldo por si falla el arranque de la tarea.
    const disenoId = diseno.id as string;
    after(() =>
      runPostJob(disenoId).catch(async (e: unknown) => {
        const mensaje =
          e instanceof Error
            ? e.message
            : "Error desconocido al diseñar el post";
        console.error(`[posts] Diseño ${disenoId} falló:`, mensaje);
        try {
          await supabase
            .from("post_disenos")
            .update({ status: "error", error: mensaje })
            .eq("id", disenoId);
        } catch (dbErr) {
          console.error(
            `[posts] No se pudo registrar el error del diseño ${disenoId}:`,
            dbErr
          );
        }
      })
    );

    return NextResponse.json({ diseno }, { status: 202 });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado creando el diseño de post";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

// GET /api/posts?projectId=<uuid>  (o sin filtro)
// Lista los diseños de post, del más reciente al más antiguo (límite 50). Si se
// pasa projectId, solo los de ese proyecto. La UI hace polling para ver el
// estado (procesando/completado/error), el plan y las URLs de los slides.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    const supabase = getSupabaseServer();
    let query = supabase
      .from("post_disenos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (projectId) query = query.eq("project_id", projectId);

    const { data: disenos, error } = await query;

    if (error) {
      return NextResponse.json(
        {
          error: `No se pudieron obtener los diseños de post: ${pistaTablaPost(error.message)}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ disenos: disenos ?? [] });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado listando los diseños de post";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
