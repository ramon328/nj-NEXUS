import { NextResponse, after } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { backendConfigurado, reenviarAlBackend } from "@/lib/backend";
import { getSupabaseServer } from "@/lib/supabase";
import { renderFromPlan } from "@/lib/editor";
import type { ExecutableEditPlan } from "@/lib/types";

// El re-render puede tardar varios minutos (descarga + ffmpeg).
export const maxDuration = 300;

// POST /api/edits/rerender
// Body: { editId: string, plan: ExecutableEditPlan }
// Re-renderiza un edit existente con un plan editado A MANO por el usuario,
// SIN volver a llamar a la IA. Reutiliza el motor de render (renderFromPlan),
// que descarga el original desde Drive, aplica el plan con ffmpeg y sube el
// resultado a Supabase Storage. El front hace polling con GET /api/edits?videoId.
export async function POST(request: Request) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Modo front-con-backend: delegar el trabajo pesado al Mac mini tal cual
  // (antes de consumir el body: reenviarAlBackend usa el cuerpo crudo).
  if (backendConfigurado()) {
    return reenviarAlBackend(request, "/api/edits/rerender");
  }
  try {
    const body = await request.json().catch(() => null);

    // 1. Validar editId.
    const editId: unknown = body?.editId;
    if (!editId || typeof editId !== "string") {
      return NextResponse.json(
        { error: "Falta el campo editId en el cuerpo de la petición" },
        { status: 400 }
      );
    }

    // 2. Validar el plan: debe venir y tener un array de segmentos no vacío.
    const plan = body?.plan as ExecutableEditPlan | undefined;
    if (!plan || typeof plan !== "object") {
      return NextResponse.json(
        { error: "Falta el campo plan en el cuerpo de la petición" },
        { status: 400 }
      );
    }
    if (!Array.isArray(plan.segmentos) || plan.segmentos.length === 0) {
      return NextResponse.json(
        { error: "El plan debe incluir al menos un segmento en 'segmentos'" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // 3. Verificar que el edit exista.
    const { data: edit, error: editError } = await supabase
      .from("edits")
      .select("id")
      .eq("id", editId)
      .single();
    if (editError || !edit) {
      return NextResponse.json(
        { error: "Trabajo de edición no encontrado" },
        { status: 404 }
      );
    }

    // 4. Marcar el edit como en proceso y limpiar cualquier error anterior.
    const { data: updated, error: updateError } = await supabase
      .from("edits")
      .update({ status: "procesando", error: null })
      .eq("id", editId)
      .select()
      .single();
    if (updateError || !updated) {
      return NextResponse.json(
        {
          error: `No se pudo actualizar el trabajo de edición: ${updateError?.message ?? "error desconocido"}`,
        },
        { status: 500 }
      );
    }

    // 5. Disparar el re-render en segundo plano SIN esperar a que termine.
    //    renderFromPlan gestiona su propio try/catch/estado; el catch de aquí
    //    es un respaldo por si el propio import o el arranque de la tarea falla.
    after(() => renderFromPlan(editId, plan).catch(async (e: unknown) => {
      const mensaje =
        e instanceof Error ? e.message : "Error desconocido durante el re-render";
      console.error(`[rerender] Trabajo ${editId} falló:`, mensaje);
      try {
        await supabase
          .from("edits")
          .update({ status: "error", error: mensaje })
          .eq("id", editId);
      } catch (dbErr) {
        console.error(
          `[rerender] No se pudo registrar el error del trabajo ${editId}:`,
          dbErr
        );
      }
    }));

    // 6. Responder 202 con la fila ya en estado "procesando".
    return NextResponse.json({ edit: updated }, { status: 202 });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Error inesperado al re-renderizar el trabajo de edición";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
