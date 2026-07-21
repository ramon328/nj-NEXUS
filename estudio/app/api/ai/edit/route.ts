import { NextResponse, after } from "next/server";
import { verificarAcceso } from "@/lib/auth";
import { backendConfigurado, reenviarAlBackend } from "@/lib/backend";
import { getSupabaseServer } from "@/lib/supabase";
import { runEditJob } from "@/lib/editor";

// El render puede tardar varios minutos (descarga + IA + ffmpeg).
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
// en generateExecutablePlan/generateProjectPlan, lo quita del texto que ve la
// IA como instrucción y lo usa como el estilo del plan. Con "auto" no se añade
// marca (la instrucción queda intacta) porque "auto" es el comportamiento por
// defecto del motor.
function anteponerMarcadorEstilo(
  instruccion: string | null,
  estilo: EstiloValido
): string | null {
  if (estilo === "auto") return instruccion;
  const marcador = `[[estilo:${estilo}]]`;
  return instruccion ? `${marcador} ${instruccion}` : marcador;
}

// POST /api/ai/edit
// Body: { videoId: string, instruccion?: string, estilo?: "autos"|"punchy"|"cine"|"auto" }
// Crea un trabajo de edición (fila en `edits` con status 'procesando') y
// dispara el pipeline en segundo plano: descarga desde Drive, plan con
// Claude, render con ffmpeg y subida a Supabase Storage.
export async function POST(request: Request) {
  // Defensa en profundidad: exige la cookie de sesión (además del proxy).
  if (!(await verificarAcceso(request))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Modo front-con-backend: delegar el trabajo pesado al Mac mini tal cual
  // (antes de consumir el body: reenviarAlBackend usa el cuerpo crudo).
  if (backendConfigurado()) {
    return reenviarAlBackend(request, "/api/ai/edit");
  }
  try {
    const body = await request.json().catch(() => null);
    const videoId: unknown = body?.videoId;
    if (!videoId || typeof videoId !== "string") {
      return NextResponse.json(
        { error: "Falta el campo videoId en el cuerpo de la petición" },
        { status: 400 }
      );
    }

    const instruccion: string | null =
      typeof body?.instruccion === "string" && body.instruccion.trim()
        ? body.instruccion.trim()
        : null;

    // Estilo de edición: se guarda dentro de la instrucción como marcador
    // "[[estilo:X]]" (ENGINE-B lo parsea al generar el plan). Ver nota arriba.
    const estilo = normalizarEstilo(body?.estilo);
    const instruccionConEstilo = anteponerMarcadorEstilo(instruccion, estilo);

    const supabase = getSupabaseServer();

    // Verificar que el video exista.
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("id")
      .eq("id", videoId)
      .single();
    if (videoError || !video) {
      return NextResponse.json({ error: "Video no encontrado" }, { status: 404 });
    }

    // Crear el trabajo de edición.
    const { data: edit, error: insertError } = await supabase
      .from("edits")
      .insert({
        video_id: videoId,
        instruccion: instruccionConEstilo ?? null,
        status: "procesando",
      })
      .select()
      .single();
    if (insertError || !edit) {
      return NextResponse.json(
        {
          error: `No se pudo crear el trabajo de edición: ${insertError?.message ?? "error desconocido"}`,
        },
        { status: 500 }
      );
    }

    // Disparar el trabajo en segundo plano SIN esperar a que termine.
    // after() garantiza que siga corriendo tras responder también en
    // serverless (Vercel); en local se comporta igual que el void clásico.
    // runEditJob gestiona sus propios errores actualizando la fila de edits.
    after(() => runEditJob(edit.id as string).catch(console.error));

    return NextResponse.json({ edit }, { status: 202 });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Error inesperado creando el trabajo de edición";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
