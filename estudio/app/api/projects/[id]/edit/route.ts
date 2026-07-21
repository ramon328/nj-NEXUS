import { NextResponse, after } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { backendConfigurado, reenviarAlBackend } from "@/lib/backend";
import { runProjectEditJob } from "@/lib/editor";
import { mensajeErrorPostgrest } from "@/lib/proyectos";
import { getSupabaseServer } from "@/lib/supabase";

// La edición de proyecto puede tardar varios minutos (descargas + IA + ffmpeg).
export const maxDuration = 300;

// Estilos de edición admitidos por el motor. "auto" = la IA decide (default).
const ESTILOS_VALIDOS = ["autos", "punchy", "cine", "auto"] as const;
type EstiloValido = (typeof ESTILOS_VALIDOS)[number];

// Normaliza el estilo recibido en el body: cualquier valor no reconocido cae
// en "auto" (la IA elige según el material).
function normalizarEstilo(valor: unknown): EstiloValido {
  return typeof valor === "string" &&
    (ESTILOS_VALIDOS as readonly string[]).includes(valor)
    ? (valor as EstiloValido)
    : "auto";
}

// Antepone el marcador de estilo a la instrucción cuando NO es "auto".
// ENGINE-B extrae este marcador "[[estilo:X]]" del inicio de la instrucción
// en generateProjectPlan, lo quita del texto que ve la IA como instrucción y
// lo usa como el estilo del plan. Con "auto" no se añade marca (instrucción
// intacta) porque "auto" es el comportamiento por defecto del motor.
function anteponerMarcadorEstilo(
  instruccion: string | null,
  estilo: EstiloValido
): string | null {
  if (estilo === "auto") return instruccion;
  const marcador = `[[estilo:${estilo}]]`;
  return instruccion ? `${marcador} ${instruccion}` : marcador;
}

// POST /api/projects/[id]/edit
// Body: { instruccion?: string, estilo?: "autos"|"punchy"|"cine"|"auto" }
// Crea un trabajo de edición de PROYECTO (fila en `edits` con project_id y
// video_id null) y dispara el pipeline multi-fuente en segundo plano: descarga
// del material desde Storage, plan con Claude mezclando clips y fotos, render
// con ffmpeg y subida a Supabase Storage. Responde 202 { edit }.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Modo front-con-backend: delegar el trabajo pesado al Mac mini tal cual
  // (antes de consumir el body; se reconstruye la ruta real con el id).
  if (backendConfigurado()) {
    const { id } = await params;
    return reenviarAlBackend(
      request,
      `/api/projects/${encodeURIComponent(id)}/edit`
    );
  }
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Falta el id del proyecto en la URL" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const instruccion: string | null =
      typeof body?.instruccion === "string" && body.instruccion.trim()
        ? body.instruccion.trim()
        : null;

    // Estilo de edición: se guarda dentro de la instrucción como marcador
    // "[[estilo:X]]" (ENGINE-B lo parsea al generar el plan). Ver nota arriba.
    const estilo = normalizarEstilo(body?.estilo);
    const instruccionConEstilo = anteponerMarcadorEstilo(instruccion, estilo);

    const supabase = getSupabaseServer();

    // 1. Verificar que el proyecto exista.
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", id)
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

    // 2. El proyecto debe tener al menos un video o una foto para editar.
    const { count, error: countError } = await supabase
      .from("project_assets")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id)
      .in("tipo", ["video", "foto"]);
    if (countError) {
      return NextResponse.json(
        {
          error: `Error al leer los assets del proyecto: ${mensajeErrorPostgrest(countError.message)}`,
        },
        { status: 500 }
      );
    }
    if (!count) {
      return NextResponse.json(
        {
          error:
            "El proyecto no tiene videos ni fotos: sube material antes de pedir una edición.",
        },
        { status: 400 }
      );
    }

    // 3. Crear el trabajo de edición del proyecto (video_id null).
    const { data: edit, error: insertError } = await supabase
      .from("edits")
      .insert({
        project_id: id,
        video_id: null,
        instruccion: instruccionConEstilo,
        status: "procesando",
      })
      .select()
      .single();
    if (insertError || !edit) {
      let mensaje = mensajeErrorPostgrest(
        insertError?.message ?? "error desconocido"
      );
      // Pista específica: la columna video_id sigue siendo NOT NULL porque no
      // se re-ejecutó el schema.sql actualizado.
      if (/null value in column "?video_id"?|not-null/i.test(mensaje)) {
        mensaje +=
          ". Ejecuta el supabase/schema.sql actualizado: la columna video_id de edits debe permitir null.";
      }
      return NextResponse.json(
        { error: `No se pudo crear el trabajo de edición: ${mensaje}` },
        { status: 500 }
      );
    }

    // 4. Disparar el trabajo en segundo plano SIN esperar a que termine.
    //    runProjectEditJob gestiona sus propios errores actualizando la fila;
    //    este catch es un respaldo por si falla el propio arranque.
    const editId = edit.id as string;
    after(() => runProjectEditJob(editId).catch(async (e: unknown) => {
      const mensaje =
        e instanceof Error
          ? e.message
          : "Error desconocido durante la edición del proyecto";
      console.error(`[projects/edit] Trabajo ${editId} falló:`, mensaje);
      try {
        await supabase
          .from("edits")
          .update({ status: "error", error: mensaje })
          .eq("id", editId);
      } catch (dbErr) {
        console.error(
          `[projects/edit] No se pudo registrar el error del trabajo ${editId}:`,
          dbErr
        );
      }
    }));

    return NextResponse.json({ edit }, { status: 202 });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado creando la edición del proyecto";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
