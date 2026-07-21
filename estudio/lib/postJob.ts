// Orquestación del apartado "Post": diseño de posts (carruseles o imagen única)
// con la filosofía "diseño como JSON". La IA genera un PostDesignPlan y Remotion
// renderiza cada slide a PNG.
//
// Este módulo ata las piezas:
//   - lib/postDesign.ts  → genera el plan con Claude (viendo las fotos reales).
//   - lib/renderPost.ts  → renderiza cada slide del plan a PNG con Remotion.
//
// Igual que runProjectEditJob (lib/editor.ts), el trabajo corre en segundo
// plano: la ruta responde 202 al instante y aquí se va actualizando la fila
// post_disenos (procesando → completado | error).

import { getSupabaseServer } from "./supabase";
import { mensajeErrorPostgrest } from "./proyectos";
import { generarDisenoPost } from "./postDesign";
import { renderSlidesPost } from "./renderPost";
import type {
  PostDesignPlan,
  PostDiseno,
  Proyecto,
  ProyectoAsset,
} from "./types";

// Proyecto "vacío" para diseñar un post SIN proyecto: generarDisenoPost exige
// un Proyecto, pero un post puede componerse desde cero (solo texto/formas). Le
// pasamos un proyecto mínimo con el título del diseño como nombre para que la
// IA tenga algo de contexto.
function proyectoPlaceholder(diseno: PostDiseno): Proyecto {
  return {
    id: diseno.project_id ?? diseno.id,
    nombre: diseno.titulo || "Post",
    descripcion: diseno.instruccion,
    drive_folder_id: null,
    created_at: diseno.created_at,
  };
}

/**
 * Ejecuta un diseño de post de principio a fin (con IA):
 *   1. Lee la fila post_disenos y, si tiene project_id, su proyecto + assets.
 *   2. Genera el PostDesignPlan con Claude (generarDisenoPost) y lo guarda.
 *   3. Renderiza cada slide a PNG (renderSlidesPost) → slides_urls.
 *   4. Marca la fila como "completado" con las URLs.
 * Cualquier fallo se captura y deja la fila en "error" con un mensaje claro.
 *
 * Gestiona su propio estado en la base de datos: la ruta solo la dispara con
 * `after(() => runPostJob(id).catch(...))`.
 */
export async function runPostJob(disenoId: string): Promise<void> {
  const supabase = getSupabaseServer();

  try {
    // 1. Leer el diseño.
    const { data: disenoData, error: disenoError } = await supabase
      .from("post_disenos")
      .select("*")
      .eq("id", disenoId)
      .single();
    if (disenoError || !disenoData) {
      throw new Error(
        `No se encontró el diseño de post ${disenoId}${disenoError ? `: ${mensajeErrorPostgrest(disenoError.message)}` : ""}`
      );
    }
    const diseno = disenoData as PostDiseno;

    // 2. Leer el proyecto y sus assets (si el diseño pertenece a un proyecto).
    //    Un post PUEDE no tener proyecto (diseño desde cero con solo texto y
    //    formas); en ese caso usamos un proyecto "vacío" y la IA compone sin
    //    imágenes, solo con fondos de color/gradiente y textos.
    let proyecto: Proyecto = proyectoPlaceholder(diseno);
    let assets: ProyectoAsset[] = [];

    if (diseno.project_id) {
      const { data: proyectoData, error: proyectoError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", diseno.project_id)
        .single();
      if (proyectoError || !proyectoData) {
        throw new Error(
          `No se encontró el proyecto del post${proyectoError ? `: ${mensajeErrorPostgrest(proyectoError.message)}` : ""}`
        );
      }
      proyecto = proyectoData as Proyecto;

      const { data: assetsData, error: assetsError } = await supabase
        .from("project_assets")
        .select("*")
        .eq("project_id", diseno.project_id)
        .order("created_at", { ascending: true });
      if (assetsError) {
        throw new Error(
          `No se pudieron leer los assets del proyecto: ${mensajeErrorPostgrest(assetsError.message)}`
        );
      }
      assets = (assetsData ?? []) as ProyectoAsset[];
    }

    // 3. Generar el plan de diseño con la IA. La instrucción ya trae la pista
    //    del número de slides (la ruta la inyecta como "Diseña un carrusel de N
    //    slides."), así que dejamos que la IA elija el nSlides guiada por ella;
    //    si ya había un plan previo, respetamos su cantidad de slides.
    const plan = await generarDisenoPost({
      proyecto,
      assets,
      instruccion: diseno.instruccion ?? "",
      formato: diseno.formato,
      nSlides: diseno.plan?.slides.length ?? 5,
    });

    // Guardar el plan cuanto antes: aunque el render falle, el usuario puede
    // ver/editar el plan generado y re-renderizarlo a mano.
    const { error: planError } = await supabase
      .from("post_disenos")
      .update({ plan })
      .eq("id", disenoId);
    if (planError) {
      throw new Error(
        `No se pudo guardar el plan del post: ${mensajeErrorPostgrest(planError.message)}`
      );
    }

    // 4. Renderizar cada slide a PNG.
    const tRender = Date.now();
    const slidesUrls = await renderSlidesPost(disenoId, plan, assets);
    console.log(
      `[postJob] Diseño ${disenoId}: render de ${plan.slides?.length ?? "?"} slide(s) en ${Date.now() - tRender}ms`
    );

    // 5. Marcar como completado.
    const { error: finalError } = await supabase
      .from("post_disenos")
      .update({
        status: "completado",
        slides_urls: slidesUrls,
        error: null,
      })
      .eq("id", disenoId);
    if (finalError) {
      throw new Error(
        `No se pudo guardar el resultado del post: ${mensajeErrorPostgrest(finalError.message)}`
      );
    }
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error desconocido al diseñar el post";
    console.error(`[postJob] Diseño ${disenoId} falló:`, mensaje);
    // Registrar el error en la fila (best-effort).
    try {
      await supabase
        .from("post_disenos")
        .update({ status: "error", error: mensaje })
        .eq("id", disenoId);
    } catch (dbErr) {
      console.error(
        `[postJob] No se pudo registrar el error del diseño ${disenoId}:`,
        dbErr
      );
    }
    // Re-lanzar para que el catch de la ruta también lo vea (respaldo).
    throw err instanceof Error ? err : new Error(mensaje);
  }
}

/**
 * Re-renderiza un diseño de post con un PLAN editado a mano por el usuario,
 * SIN volver a llamar a la IA. Lee el proyecto/assets del diseño (para resolver
 * los asset_id de las imágenes de fondo y bloques), renderiza los slides y
 * actualiza la fila.
 *
 * La ruta la dispara con `after(() => renderPostDesdePlan(id, plan).catch(...))`
 * tras marcar la fila como "procesando".
 */
export async function renderPostDesdePlan(
  disenoId: string,
  plan: PostDesignPlan
): Promise<void> {
  const supabase = getSupabaseServer();

  try {
    // 1. Leer el diseño para saber a qué proyecto pertenece.
    const { data: disenoData, error: disenoError } = await supabase
      .from("post_disenos")
      .select("*")
      .eq("id", disenoId)
      .single();
    if (disenoError || !disenoData) {
      throw new Error(
        `No se encontró el diseño de post ${disenoId}${disenoError ? `: ${mensajeErrorPostgrest(disenoError.message)}` : ""}`
      );
    }
    const diseno = disenoData as PostDiseno;

    // 2. Cargar los assets del proyecto (si tiene) para resolver imágenes.
    let assets: ProyectoAsset[] = [];
    if (diseno.project_id) {
      const { data: assetsData, error: assetsError } = await supabase
        .from("project_assets")
        .select("*")
        .eq("project_id", diseno.project_id)
        .order("created_at", { ascending: true });
      if (assetsError) {
        throw new Error(
          `No se pudieron leer los assets del proyecto: ${mensajeErrorPostgrest(assetsError.message)}`
        );
      }
      assets = (assetsData ?? []) as ProyectoAsset[];
    }

    // 3. Guardar el plan editado.
    const { error: planError } = await supabase
      .from("post_disenos")
      .update({ plan })
      .eq("id", disenoId);
    if (planError) {
      throw new Error(
        `No se pudo guardar el plan editado del post: ${mensajeErrorPostgrest(planError.message)}`
      );
    }

    // 4. Renderizar los slides con el plan editado.
    const slidesUrls = await renderSlidesPost(disenoId, plan, assets);

    // 5. Marcar como completado.
    const { error: finalError } = await supabase
      .from("post_disenos")
      .update({
        status: "completado",
        slides_urls: slidesUrls,
        error: null,
      })
      .eq("id", disenoId);
    if (finalError) {
      throw new Error(
        `No se pudo guardar el resultado del post: ${mensajeErrorPostgrest(finalError.message)}`
      );
    }
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error desconocido al re-renderizar el post";
    console.error(`[postJob] Re-render del diseño ${disenoId} falló:`, mensaje);
    try {
      await supabase
        .from("post_disenos")
        .update({ status: "error", error: mensaje })
        .eq("id", disenoId);
    } catch (dbErr) {
      console.error(
        `[postJob] No se pudo registrar el error del re-render ${disenoId}:`,
        dbErr
      );
    }
    throw err instanceof Error ? err : new Error(mensaje);
  }
}
