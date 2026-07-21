// Capa de gráficos profesional (Remotion), lado servidor.
//
// - planAOverlayProps(): traduce el plan ejecutable (tiempos en la línea
//   "ingenua", reescalados por factorTiempo a la duración final real) a las
//   props de la composición "Overlay" (remotion/), incrustando stickers y
//   fuentes como data URLs para que el navegador headless no dependa de rutas.
// - renderOverlayPro(): bundlea remotion/index.ts (cacheado por proceso) y
//   renderiza la capa como .mov ProRes 4444 con canal alpha.
//
// SOLO SERVIDOR: lo importa lib/ffmpeg.ts (route handlers). @remotion/bundler
// y @remotion/renderer van en serverExternalPackages (next.config.ts) para que
// Next no intente bundlearlos. Si algo falla aquí, componerFinal captura el
// error y cae a la rama clásica de ffmpeg (drawtext/ass): ningún render se
// rompe por esta capa.
import fs from "fs";
import path from "path";
import type { ExecutableEditPlan } from "./types";
import type {
  FuenteOverlay,
  OverlayProps,
  StickerOverlay,
  SubtituloOverlay,
  TextoOverlay,
} from "../remotion/tipos";
import { FAMILIA_BASE, OVERLAY_FPS } from "../remotion/tipos";

// Re-export del contrato para quien ya importaba el tipo desde aquí.
export type OverlayProProps = OverlayProps;

// Fuente gruesa por defecto de la capa (misma que usa la rama clásica ASS).
const FUENTE_BASE = "titulos-gruesos.ttf";

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

const MIMES_IMAGEN: Record<string, string> = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
};

function archivoADataUrl(ruta: string, mimePorDefecto: string): string {
  const mime = MIMES_IMAGEN[path.extname(ruta).toLowerCase()] ?? mimePorDefecto;
  return `data:${mime};base64,${fs.readFileSync(ruta).toString("base64")}`;
}

// Traduce el plan a las props de la composición Remotion. `rutasAssets` es
// opcional: permite resolver stickers subidos al proyecto (asset_id).
export function planAOverlayProps(
  plan: ExecutableEditPlan,
  factorTiempo: number,
  duracionFinal: number,
  rutasAssets?: Record<string, { ruta: string }>
): OverlayProps {
  const f = Number.isFinite(factorTiempo) && factorTiempo > 0 ? factorTiempo : 1;
  const escalar = (t: number) => clamp((t ?? 0) * f, 0, duracionFinal);

  // ---- Fuentes: la base (para subtítulos/títulos) + las pedidas por texto.
  const dirFuentes = path.join(process.cwd(), "public", "fuentes");
  const fuentes: FuenteOverlay[] = [];
  const familiasRegistradas = new Set<string>();
  function registrarFuente(archivo: string, familia: string): string | null {
    if (familiasRegistradas.has(familia)) return familia;
    const ruta = path.join(dirFuentes, path.basename(archivo));
    if (!fs.existsSync(ruta)) return null;
    fuentes.push({
      familia,
      dataUrl: `data:font/ttf;base64,${fs.readFileSync(ruta).toString("base64")}`,
    });
    familiasRegistradas.add(familia);
    return familia;
  }
  if (!registrarFuente(FUENTE_BASE, FAMILIA_BASE)) {
    console.warn(
      `[overlay] Advertencia: falta public/fuentes/${FUENTE_BASE}; la capa usará fuentes del sistema.`
    );
  }

  // ---- Textos superpuestos.
  const textos: TextoOverlay[] = [];
  for (const t of plan.textos ?? []) {
    if (!t?.texto?.trim()) continue;
    const desde = escalar(t.desde);
    const hasta = Math.max(desde, escalar(t.hasta));
    if (hasta - desde < 0.05) continue;
    let familia: string | null = null;
    if (t.fuente) {
      const nombre = path.basename(t.fuente);
      familia = registrarFuente(nombre, `Fuente-${nombre.replace(/\.[^.]+$/, "")}`);
      if (!familia) {
        console.warn(
          `[overlay] Advertencia: la fuente "${t.fuente}" no existe en public/fuentes; se usa la base.`
        );
      }
    }
    textos.push({
      texto: t.texto,
      desde,
      hasta,
      posicion: t.posicion ?? "centro",
      estilo: t.estilo ?? "simple",
      color: t.color ?? "blanco",
      animacion: t.animacion ?? "fundido",
      familia,
    });
  }

  // ---- Subtítulos (cues y palabras karaoke, reescalados y recortados).
  const subtitulos: SubtituloOverlay[] = [];
  for (const cue of plan.subtitulos ?? []) {
    if (!cue?.texto?.trim()) continue;
    const desde = escalar(cue.desde);
    const hasta = Math.max(desde, escalar(cue.hasta));
    if (hasta - desde < 0.05) continue;
    const palabras = (cue.palabras ?? [])
      .map((p) => ({
        palabra: p.palabra,
        desde: clamp(escalar(p.desde), desde, hasta),
        hasta: clamp(escalar(p.hasta), desde, hasta),
      }))
      .filter((p) => p.palabra?.trim() && p.hasta > p.desde);
    subtitulos.push({
      texto: cue.texto,
      desde,
      hasta,
      palabras: palabras.length ? palabras : undefined,
    });
  }

  // ---- Stickers: proyecto (asset_id, prioridad) o biblioteca public/stickers.
  const dirStickers = path.join(process.cwd(), "public", "stickers");
  const stickers: StickerOverlay[] = [];
  for (const st of plan.stickers ?? []) {
    const desde = escalar(st.desde);
    const hasta = Math.max(desde, escalar(st.hasta));
    if (hasta - desde < 0.05) continue;
    let ruta: string | null = null;
    if (st.asset_id) {
      const info = rutasAssets?.[st.asset_id];
      if (info && fs.existsSync(info.ruta)) ruta = info.ruta;
    }
    if (!ruta && st.archivo) {
      const candidata = path.join(dirStickers, path.basename(st.archivo));
      if (fs.existsSync(candidata)) ruta = candidata;
    }
    if (!ruta) {
      console.warn(
        `[overlay] Advertencia: el sticker "${st.asset_id ?? st.archivo}" no está disponible; se omite.`
      );
      continue;
    }
    stickers.push({
      src: archivoADataUrl(ruta, "image/png"),
      desde,
      hasta,
      posicion: st.posicion ?? "arriba-derecha",
      escala: clamp(st.escala || 0.2, 0.1, 0.35),
      animacion: st.animacion ?? "fundido",
    });
  }

  return {
    duracion: duracionFinal,
    barraProgreso: Boolean(plan.barra_progreso),
    textos,
    subtitulos,
    subtitulosEstilo: plan.subtitulos_estilo === "karaoke" ? "karaoke" : "clasico",
    stickers,
    fuentes,
  };
}

// Bundle de webpack de remotion/index.ts, cacheado por proceso (la primera
// vez tarda; los renders siguientes lo reutilizan). Si el bundle falla se
// limpia la caché para poder reintentar.
let bundlePromesa: Promise<string> | null = null;

function rutaEntrada(): string {
  return path.join(process.cwd(), "remotion", "index.ts");
}

async function obtenerBundle(): Promise<string> {
  // Import dinámico: así ni Next ni tsx cargan @remotion/bundler hasta que
  // de verdad se renderiza un overlay.
  const { bundle } = await import("@remotion/bundler");
  if (!bundlePromesa) {
    bundlePromesa = bundle({ entryPoint: rutaEntrada() }).catch((e) => {
      bundlePromesa = null;
      throw e;
    });
  }
  return bundlePromesa;
}

// Renderiza la capa de gráficos como un .mov con canal alpha (ProRes 4444)
// de `duracionSegundos` en `salidaMov`.
export async function renderOverlayPro(
  props: OverlayProProps,
  duracionSegundos: number,
  salidaMov: string
): Promise<void> {
  // Verificar SIEMPRE la entrada (aunque haya bundle cacheado): si el módulo
  // remotion/ no está desplegado, hay que caer a la rama clásica.
  if (!fs.existsSync(rutaEntrada())) {
    throw new Error(
      "no existe remotion/index.ts (la capa Remotion no está disponible en este despliegue)"
    );
  }

  const serveUrl = await obtenerBundle();
  const { renderMedia, selectComposition } = await import("@remotion/renderer");

  const inputProps: OverlayProps = { ...props, duracion: duracionSegundos };
  const composition = await selectComposition({
    serveUrl,
    id: "Overlay",
    inputProps,
  });

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames: Math.max(1, Math.round(duracionSegundos * OVERLAY_FPS)),
    },
    serveUrl,
    codec: "prores",
    proResProfile: "4444",
    pixelFormat: "yuva444p10le",
    imageFormat: "png",
    inputProps,
    outputLocation: salidaMov,
    timeoutInMilliseconds: 180000,
    logLevel: "warn",
  });
}
