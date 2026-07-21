import { NextResponse } from "next/server";
import { crearCarpetaDrive } from "@/lib/drive";
import { mensajeErrorPostgrest } from "@/lib/proyectos";
import { getSupabaseServer } from "@/lib/supabase";
import type { Proyecto, TipoAsset } from "@/lib/types";

// Conteo de assets por tipo que acompaña a cada proyecto en el listado.
export interface AssetsCount {
  total: number;
  video: number;
  foto: number;
  audio: number;
  musica: number;
  sticker: number;
}

export interface ProyectoConConteo extends Proyecto {
  assets_count: AssetsCount;
}

function conteoVacio(): AssetsCount {
  return { total: 0, video: 0, foto: 0, audio: 0, musica: 0, sticker: 0 };
}

// GET /api/projects
// Lista los proyectos (más recientes primero) con el conteo de sus assets.
// Respuesta: { projects: [{ ...proyecto, assets_count: { total, video,
// foto, audio, musica, sticker } }] }.
export async function GET() {
  try {
    const supabase = getSupabaseServer();

    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        {
          error: `No se pudieron obtener los proyectos: ${mensajeErrorPostgrest(error.message)}`,
        },
        { status: 500 }
      );
    }

    // Segunda query: solo project_id y tipo de cada asset; se agrega en JS.
    const { data: assets, error: assetsError } = await supabase
      .from("project_assets")
      .select("project_id, tipo");

    if (assetsError) {
      return NextResponse.json(
        {
          error: `No se pudieron contar los assets: ${mensajeErrorPostgrest(assetsError.message)}`,
        },
        { status: 500 }
      );
    }

    const conteos = new Map<string, AssetsCount>();
    for (const asset of (assets ?? []) as {
      project_id: string;
      tipo: TipoAsset;
    }[]) {
      const conteo = conteos.get(asset.project_id) ?? conteoVacio();
      conteo.total += 1;
      if (asset.tipo in conteo) conteo[asset.tipo] += 1;
      conteos.set(asset.project_id, conteo);
    }

    const projectsConConteo: ProyectoConConteo[] = (
      (projects ?? []) as Proyecto[]
    ).map((p) => ({
      ...p,
      assets_count: conteos.get(p.id) ?? conteoVacio(),
    }));

    return NextResponse.json({ projects: projectsConConteo });
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error inesperado listando proyectos";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}

// POST /api/projects
// Crea un proyecto: { nombre, descripcion? }. Si hay cuenta de servicio de
// Google con permiso de escritura, crea también una carpeta espejo en Drive
// (best-effort: si falla, el proyecto se crea igual con drive_folder_id null).
// Respuesta: { project } con status 201.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      nombre?: unknown;
      descripcion?: unknown;
    } | null;

    const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
    if (!nombre) {
      return NextResponse.json(
        { error: "Falta el nombre del proyecto" },
        { status: 400 }
      );
    }
    const descripcion =
      typeof body?.descripcion === "string" && body.descripcion.trim()
        ? body.descripcion.trim()
        : null;

    // Best-effort: carpeta espejo en Drive (null si no hay escritura).
    const driveFolderId = await crearCarpetaDrive(nombre);

    const supabase = getSupabaseServer();
    const { data: project, error } = await supabase
      .from("projects")
      .insert({ nombre, descripcion, drive_folder_id: driveFolderId })
      .select("*")
      .single<Proyecto>();

    if (error) {
      return NextResponse.json(
        {
          error: `No se pudo crear el proyecto: ${mensajeErrorPostgrest(error.message)}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "Error inesperado creando el proyecto";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
