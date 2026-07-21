// Render de posts (carruseles / imágenes) con Remotion, lado servidor.
//
// - renderSlidesPost(): por cada slide del PostDesignPlan captura un PNG con la
//   composición Remotion "PostSlide" (remotion/PostSlide.tsx) y lo sube al
//   bucket público "post-slides"; devuelve las URLs públicas en orden.
// - borrarSlidesPost(): borra la carpeta del diseño en ese bucket (best-effort).
//
// SOLO SERVIDOR: lo importan los route handlers/orquestador. @remotion/bundler
// y @remotion/renderer van en serverExternalPackages (next.config.ts). El
// bundle se cachea por proceso (igual que lib/overlay.ts). Es defensivo: si un
// slide no se puede renderizar, lanza con el detalle para que el orquestador
// marque el diseño en error.
import fs from "fs";
import { promises as fsp } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import type { PostDesignPlan, ProyectoAsset } from "./types";
import { borrarCarpetaMedia, guardarArchivoMedia } from "./mediaLocal";
import { quitarFondo, recorteDisponible } from "./recorte";

// Los PNG de los slides se guardan en el DISCO del motor (el mini en
// producción, tu Mac en local), igual que los videos grandes, y se sirven con
// /api/media/archivo/... — no gastan la cuota de Supabase Storage. La ruta en
// el almacén es "posts/<disenoId>/<indice>.png".

// Chromium headless para el render (el mismo que usa la capa Overlay). Si el
// binario no existe, dejamos que Remotion baje el suyo (undefined → default).
const CHROME_HEADLESS =
  "/Users/macbookramon/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell";

function browserExecutable(): string | null {
  return fs.existsSync(CHROME_HEADLESS) ? CHROME_HEADLESS : null;
}

// ---------------------------------------------------------------------------
// Bundle de Remotion (remotion/index.ts), cacheado por proceso. La primera vez
// tarda; los renders siguientes lo reutilizan. Si falla, se limpia la caché.
// ---------------------------------------------------------------------------
let bundlePromesa: Promise<string> | null = null;

function rutaEntrada(): string {
  return path.join(process.cwd(), "remotion", "index.ts");
}

async function obtenerBundle(): Promise<string> {
  const { bundle } = await import("@remotion/bundler");
  if (!bundlePromesa) {
    bundlePromesa = bundle({ entryPoint: rutaEntrada() }).catch((e) => {
      bundlePromesa = null;
      throw e;
    });
  }
  return bundlePromesa;
}

// ---------------------------------------------------------------------------
// URLs absolutas de los assets usados en el plan.
// ---------------------------------------------------------------------------

// El public_url de un asset puede ser:
//  - una URL absoluta (Supabase Storage: "https://...").
//  - una ruta relativa "/api/media/archivo/..." (media local del Mac mini
//    cuando MEDIA_PUBLIC_URL está vacía) → hay que prefijar una base pública.
// El navegador headless necesita SIEMPRE una URL absoluta y alcanzable.
function urlAbsoluta(publicUrl: string): string {
  const url = (publicUrl || "").trim();
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.MEDIA_PUBLIC_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Recolecta los asset_id usados por el plan (fondos, imágenes y stickers).
function assetsUsados(plan: PostDesignPlan): Set<string> {
  const ids = new Set<string>();
  for (const slide of plan.slides ?? []) {
    if (slide.fondo?.tipo === "imagen" && slide.fondo.asset_id) {
      ids.add(slide.fondo.asset_id);
    }
    for (const b of slide.bloques ?? []) {
      if (b.tipo === "imagen" && b.asset_id) ids.add(b.asset_id);
      if (b.tipo === "sticker" && b.asset_id) ids.add(b.asset_id);
    }
  }
  return ids;
}

// Resuelve, para cada asset usado, su URL pública ABSOLUTA. Los posts usan
// fotos/stickers: un asset de tipo "video" solo entra si trae thumbnail (no
// tenemos aquí; los thumbnails no están en ProyectoAsset), así que se salta.
function resolverUrlsPorAsset(
  plan: PostDesignPlan,
  assets: ProyectoAsset[]
): Record<string, string> {
  const usados = assetsUsados(plan);
  const porId = new Map(assets.map((a) => [a.id, a]));
  const urls: Record<string, string> = {};
  for (const id of usados) {
    const asset = porId.get(id);
    if (!asset) continue;
    // Los posts se componen con fotos/stickers/imágenes; los videos no aportan
    // un fotograma aquí, así que se omiten (el slide simplemente no los pinta).
    if (asset.tipo === "video") continue;
    if (!asset.public_url) continue;
    urls[id] = urlAbsoluta(asset.public_url);
  }
  return urls;
}

// Recolecta los asset_id que el plan marcó con sin_fondo (en fondos o bloques imagen).
function assetsSinFondo(plan: PostDesignPlan): Set<string> {
  const ids = new Set<string>();
  for (const slide of plan.slides ?? []) {
    const f = slide.fondo as { tipo?: string; asset_id?: string; sin_fondo?: boolean } | undefined;
    if (f?.tipo === "imagen" && f.asset_id && f.sin_fondo) ids.add(f.asset_id);
    for (const b of slide.bloques ?? []) {
      const bb = b as { tipo?: string; asset_id?: string; sin_fondo?: boolean };
      if (bb.tipo === "imagen" && bb.asset_id && bb.sin_fondo) ids.add(bb.asset_id);
    }
  }
  return ids;
}

// Para cada asset marcado sin_fondo: baja la foto, le quita el fondo (rembg) y la
// guarda como PNG transparente; agrega urlsPorAsset["cut:<id>"]. Best-effort: si el
// motor no está o algo falla en un asset, se deja sin recorte (usa la foto normal).
async function agregarRecortes(
  disenoId: string,
  plan: PostDesignPlan,
  urlsPorAsset: Record<string, string>
): Promise<void> {
  const ids = assetsSinFondo(plan);
  if (!ids.size) return;
  if (!recorteDisponible()) {
    console.warn("[renderPost] sin_fondo pedido pero el motor de recorte no está disponible; se usa la foto normal");
    return;
  }
  for (const id of ids) {
    const src = urlsPorAsset[id];
    if (!src) continue;
    try {
      const resp = await fetch(src);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const buf = Buffer.from(await resp.arrayBuffer());
      const png = await quitarFondo(buf);
      const url = await guardarArchivoMedia(`posts/${disenoId}/cut-${id}.png`, png);
      urlsPorAsset[`cut:${id}`] = url;
    } catch (e) {
      console.warn(`[renderPost] no pude recortar el asset ${id}: ${e instanceof Error ? e.message : e}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Render principal
// ---------------------------------------------------------------------------

/**
 * Renderiza cada slide del plan a PNG con Remotion, los guarda en el disco del
 * motor en "posts/<disenoId>/<indice>.png" y devuelve sus URLs públicas
 * (/api/media/archivo/...) EN ORDEN. Si un slide falla al renderizar, lanza con
 * el detalle (el orquestador marcará el diseño en error).
 */
export async function renderSlidesPost(
  disenoId: string,
  plan: PostDesignPlan,
  assets: ProyectoAsset[]
): Promise<string[]> {
  if (!plan?.slides?.length) {
    throw new Error("El plan del post no tiene slides para renderizar.");
  }
  if (!fs.existsSync(rutaEntrada())) {
    throw new Error(
      "no existe remotion/index.ts (la capa Remotion no está disponible en este despliegue)"
    );
  }

  const urlsPorAsset = resolverUrlsPorAsset(plan, assets);
  // RECORTES ("quitar fondo"): para cada imagen marcada sin_fondo en el plan,
  // generamos un PNG transparente (rembg, local) y lo servimos con la clave
  // "cut:<asset_id>". Si el motor no está o algo falla, se sigue con la foto normal.
  await agregarRecortes(disenoId, plan, urlsPorAsset);
  const serveUrl = await obtenerBundle();
  const { renderStill, selectComposition } = await import("@remotion/renderer");
  const ejecutable = browserExecutable();

  const dirTemporal = path.join(os.tmpdir(), "post-slides", disenoId);
  await fsp.mkdir(dirTemporal, { recursive: true });

  // El formato (dimensiones) es el MISMO para todos los slides → seleccionamos la
  // composición UNA sola vez (cada selectComposition lanza el navegador; hacerlo
  // por slide duplicaba el trabajo). OJO: selectComposition "hornea" los props del
  // slide con que se llamó; por eso en renderStill se OVERRIDEA composition.props
  // con los del slide de cada iteración — si no, los 5 slides salían idénticos
  // (todos el slide 0), aunque el plan tuviera slides distintos.
  const composition = await selectComposition({
    serveUrl,
    id: "PostSlide",
    inputProps: { slide: plan.slides[0], formato: plan.formato, urlsPorAsset },
  });

  // Renderiza un slide a PNG, lo guarda en el disco del motor y devuelve su URL.
  const renderUno = async (i: number): Promise<string> => {
    const inputProps = {
      slide: plan.slides[i],
      formato: plan.formato,
      urlsPorAsset,
    };
    const rutaPng = path.join(dirTemporal, `${i}-${randomUUID()}.png`);
    try {
      await renderStill({
        composition: { ...composition, props: inputProps },
        serveUrl,
        output: rutaPng,
        inputProps,
        imageFormat: "png",
        overwrite: true,
        ...(ejecutable ? { browserExecutable: ejecutable } : {}),
        timeoutInMilliseconds: 120000,
        logLevel: "warn",
      });
    } catch (err) {
      const detalle = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Fallo al renderizar el slide ${i + 1}/${plan.slides.length}: ${detalle}`
      );
    }
    const buffer = await fsp.readFile(rutaPng);
    return guardarArchivoMedia(`posts/${disenoId}/${i}.png`, buffer);
  };

  const urls: string[] = new Array(plan.slides.length);
  try {
    // Render en PARALELO con concurrencia acotada (varios navegadores a la vez es
    // pesado; 3 es un buen equilibrio en el mini). Baja de secuencial a ~1/3.
    const CONCURRENCIA = 3;
    let siguiente = 0;
    const worker = async () => {
      for (;;) {
        const i = siguiente++;
        if (i >= plan.slides.length) return;
        urls[i] = await renderUno(i);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCIA, plan.slides.length) }, worker)
    );
  } finally {
    // Limpiar temporales (best-effort).
    await fsp.rm(dirTemporal, { recursive: true, force: true }).catch(() => {});
  }

  return urls;
}

/**
 * Borra la carpeta "posts/<disenoId>/" del disco del motor (best-effort).
 */
export async function borrarSlidesPost(disenoId: string): Promise<void> {
  if (!disenoId) return;
  await borrarCarpetaMedia(`posts/${disenoId}`);
}
