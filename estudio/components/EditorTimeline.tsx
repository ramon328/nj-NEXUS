"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  EditJob,
  ExecutableEditPlan,
  SubtituloCue,
  TipoAsset,
} from "@/lib/types";
import {
  ANIMACIONES_STICKER,
  ANIMACIONES_TEXTO,
  COLORES_TEXTO,
  COLORES_TEXTO_UI,
  ESTILOS_TEXTO,
  FILTROS,
  POSICIONES_STICKER,
  POSICIONES_TEXTO,
  REENCUADRES,
  ROTACIONES,
  SUBTITULOS_ESTILO,
  TIPOS_ZOOM,
  TRANSICIONES,
  type Opcion,
} from "@/lib/editorConstantes";
import Spinner from "@/components/Spinner";
import { formatearDuracion, mensajeDeError } from "@/components/formato";

// ---------------------------------------------------------------------------
// Tipos auxiliares del editor
// ---------------------------------------------------------------------------

// Pistas disponibles. Cada elemento se identifica por su pista + índice.
type Pista = "segmento" | "subtitulo" | "texto" | "sticker";

interface Seleccion {
  pista: Pista;
  indice: number;
}

// Catálogo de medios que se cargan de /api/medios para poblar los selectores.
interface Medios {
  musica: string[];
  stickers: string[];
  fuentes: string[];
  efectos: string[];
}

// Aliases cómodos a los tipos anidados del plan (evita repetir el índice).
type Segmento = ExecutableEditPlan["segmentos"][number];
type TextoPlan = ExecutableEditPlan["textos"][number];
type StickerPlan = ExecutableEditPlan["stickers"][number];

// ---------------------------------------------------------------------------
// Utilidades de tiempo
// ---------------------------------------------------------------------------

// Duración final (en segundos) de un segmento tras aplicar su velocidad.
function duracionFinalSegmento(seg: Segmento): number {
  const bruta = Math.max(0, (seg.hasta ?? 0) - (seg.desde ?? 0));
  const vel = seg.velocidad && seg.velocidad > 0 ? seg.velocidad : 1;
  return bruta / vel;
}

// Duración total del video FINAL: suma de los segmentos ya acelerados.
function duracionTotalPlan(plan: ExecutableEditPlan): number {
  return (plan.segmentos ?? []).reduce(
    (acc, seg) => acc + duracionFinalSegmento(seg),
    0
  );
}

// "m:ss" a partir de segundos (más compacto que formatearDuracion "mm:ss").
function marca(segundos: number): string {
  const total = Math.max(0, segundos);
  const min = Math.floor(total / 60);
  const seg = Math.round(total % 60);
  return `${min}:${String(seg).padStart(2, "0")}`;
}

// "m:ss.cs" con centésimas — el lector de tiempo grande del editor.
function marcaCs(segundos: number): string {
  const total = Math.max(0, segundos);
  const min = Math.floor(total / 60);
  const seg = Math.floor(total % 60);
  const cs = Math.floor((total * 100) % 100);
  return `${min}:${String(seg).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

// Redondea a 0.1s (para "usar tiempo actual" en desde/hasta).
function aDecima(segundos: number): number {
  return Math.round(Math.max(0, segundos) * 10) / 10;
}

// Recorta un texto para que quepa dentro de un bloque de la línea de tiempo.
function recortar(texto: string, largo = 28): string {
  const limpio = (texto ?? "").trim();
  if (limpio.length <= largo) return limpio;
  return `${limpio.slice(0, largo - 1)}…`;
}

// Quita la extensión de un nombre de archivo ("fuego.png" -> "fuego").
function sinExtension(nombre: string): string {
  return (nombre ?? "").replace(/\.[^.]+$/, "");
}

// Paleta de colores para diferenciar los bloques de segmentos.
const COLORES_SEGMENTO = [
  "from-violet-600/80 to-violet-500/60 border-violet-400/50",
  "from-fuchsia-600/80 to-fuchsia-500/60 border-fuchsia-400/50",
  "from-sky-600/80 to-sky-500/60 border-sky-400/50",
  "from-emerald-600/80 to-emerald-500/60 border-emerald-400/50",
  "from-amber-600/80 to-amber-500/60 border-amber-400/50",
  "from-rose-600/80 to-rose-500/60 border-rose-400/50",
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function EditorTimeline({
  edit,
  onCerrar,
  onRerenderizado,
  assets,
}: {
  edit: EditJob;
  onCerrar: () => void;
  onRerenderizado: (editActualizado: EditJob) => void;
  // Assets del proyecto (opcional; solo para ediciones de proyecto). Sirve
  // para mostrar el nombre del asset en los bloques de la pista Video.
  assets?: { id: string; nombre: string; tipo?: TipoAsset }[];
}) {
  // Copia editable del plan. Si por algún motivo llega sin plan, no montamos.
  const [plan, setPlan] = useState<ExecutableEditPlan | null>(edit.plan);

  // URL del preview: parte del último render y se actualiza al re-renderizar.
  const [previewUrl, setPreviewUrl] = useState<string | null>(edit.output_url);

  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [medios, setMedios] = useState<Medios | null>(null);

  const [renderizando, setRenderizando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [aviso, setAviso] = useState<{
    tipo: "info" | "error" | "ok";
    texto: string;
  } | null>(null);

  // Guarda el timer de polling para poder limpiarlo al desmontar.
  const pollingRef = useRef<number | null>(null);

  // Contador incremental para "cache-bustear" la URL del preview tras cada
  // render (evita usar Date.now() en el cuerpo del componente).
  const versionRef = useRef(0);

  // --- Scrubbing / cabezal de reproducción -------------------------------
  // El <video> del preview reproduce el ÚLTIMO render; su duración real puede
  // diferir de la "ingenua" (suma de segmentos). El playhead va atado a la
  // duración REAL del video; los bloques usan la ingenua (durTotal).
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [tiempoActual, setTiempoActual] = useState(0);
  const [durVideo, setDurVideo] = useState(0); // duración real del <video>
  const [reproduciendo, setReproduciendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  // Carga del catálogo de medios (una sola vez).
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const res = await fetch("/api/medios");
        const data = (await res.json().catch(() => null)) as Medios | null;
        if (vivo && data) {
          setMedios({
            musica: data.musica ?? [],
            stickers: data.stickers ?? [],
            fuentes: data.fuentes ?? [],
            efectos: data.efectos ?? [],
          });
        }
      } catch {
        if (vivo) setMedios({ musica: [], stickers: [], fuentes: [], efectos: [] });
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // Limpieza del polling al desmontar el editor.
  useEffect(() => {
    return () => {
      if (pollingRef.current !== null) window.clearInterval(pollingRef.current);
    };
  }, []);

  const durTotal = useMemo(
    () => (plan ? Math.max(0.001, duracionTotalPlan(plan)) : 0.001),
    [plan]
  );

  // Offset (en la línea FINAL) donde empieza cada segmento. El segmento i
  // ocupa [offset[i], offset[i] + duracionFinal[i]). Sirve para pintar los
  // bloques de video sobre el mismo eje que textos/subtítulos/stickers.
  const offsetsSegmentos = useMemo(() => {
    const res: number[] = [];
    let acc = 0;
    for (const seg of plan?.segmentos ?? []) {
      res.push(acc);
      acc += duracionFinalSegmento(seg);
    }
    return res;
  }, [plan]);

  // Muta el plan con un actualizador inmutable.
  const actualizarPlan = useCallback(
    (fn: (previo: ExecutableEditPlan) => ExecutableEditPlan) => {
      setPlan((previo) => (previo ? fn(previo) : previo));
    },
    []
  );

  // Nombre corto (sin extensión) de cada asset del proyecto, por id. Vacío
  // en el modo clásico (ediciones de un solo video, sin prop assets).
  const nombresAssets = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const a of assets ?? []) {
      mapa.set(a.id, sinExtension(a.nombre) || a.nombre);
    }
    return mapa;
  }, [assets]);

  // Eje de referencia del playhead: la duración REAL del video si ya se
  // conoce; si no (aún sin metadata o sin preview), cae a la ingenua.
  const durReferencia = durVideo > 0 ? durVideo : durTotal;

  // Marcas finas de la regla: una etiqueta cada ~1s escalando el paso según
  // el ancho disponible para no saturar (cada 1/2/5/10 s).
  const marcasFinas = useMemo(() => {
    const total = Math.max(0.001, durTotal);
    // Paso "bonito" para las etiquetas según la duración.
    const paso =
      total <= 12 ? 1 : total <= 30 ? 2 : total <= 90 ? 5 : 10;
    const res: { t: number; etiqueta: boolean }[] = [];
    // Marca menor cada ~1s; etiqueta cada "paso".
    const menor = total <= 30 ? 1 : total <= 90 ? 2 : 5;
    for (let t = 0; t <= total + 0.0001; t += menor) {
      const redondeado = Math.round(t * 100) / 100;
      res.push({
        t: redondeado,
        etiqueta: Math.abs(redondeado % paso) < 0.001,
      });
    }
    return res;
  }, [durTotal]);

  // Fija el tiempo del video (y del estado) a un segundo dado, con clamp.
  const buscar = useCallback(
    (segundo: number) => {
      const ref = durReferencia > 0 ? durReferencia : durTotal;
      const t = Math.max(0, Math.min(ref, segundo));
      setTiempoActual(t);
      const v = videoRef.current;
      if (v) {
        try {
          v.currentTime = t;
        } catch {
          // El video puede no estar listo para buscar todavía.
        }
      }
    },
    [durReferencia, durTotal]
  );

  // Convierte una posición X de puntero (px de pantalla) en un segundo del
  // eje de referencia, usando el ancho real de la zona de pistas.
  const xASegundo = useCallback(
    (clientX: number): number => {
      const cont = timelineRef.current;
      if (!cont) return 0;
      const rect = cont.getBoundingClientRect();
      const frac = (clientX - rect.left) / Math.max(1, rect.width);
      const ref = durReferencia > 0 ? durReferencia : durTotal;
      return Math.max(0, Math.min(ref, frac * ref));
    },
    [durReferencia, durTotal]
  );

  // Sincroniza el estado con los eventos del <video> del preview.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      // Mientras se arrastra, el estado manda; ignoramos el timeupdate.
      if (!arrastrando) setTiempoActual(v.currentTime);
    };
    const onMeta = () => setDurVideo(v.duration || 0);
    const onPlay = () => setReproduciendo(true);
    const onPause = () => setReproduciendo(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onPause);
    // Sincroniza el valor inicial si ya hay metadata.
    if (v.readyState >= 1 && v.duration) setDurVideo(v.duration);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onPause);
    };
  }, [arrastrando, previewUrl]);

  // Arrastre del cabezal: listeners globales mientras se sostiene el ratón.
  useEffect(() => {
    if (!arrastrando) return;
    const onMove = (e: MouseEvent) => buscar(xASegundo(e.clientX));
    const onUp = () => setArrastrando(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [arrastrando, buscar, xASegundo]);

  // -------- Controles de transporte del preview --------
  const alternarPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  }, []);
  const irAInicio = useCallback(() => buscar(0), [buscar]);
  const saltar = useCallback(
    (delta: number) => buscar(tiempoActual + delta),
    [buscar, tiempoActual]
  );

  if (!plan) {
    return (
      <div className="p-6 text-sm text-tenue">
        Esta edición no tiene un plan editable.
        <button
          type="button"
          onClick={onCerrar}
          className="ml-2 underline hover:text-foreground"
        >
          Cerrar
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Acciones sobre elementos
  // -------------------------------------------------------------------------

  function agregarTexto() {
    actualizarPlan((p) => {
      const nuevo: TextoPlan = {
        texto: "Nuevo texto",
        desde: 0,
        hasta: Math.min(3, durTotal),
        posicion: "centro",
        estilo: "simple",
        fuente: null,
        color: "blanco",
        animacion: "fundido",
      };
      return { ...p, textos: [...(p.textos ?? []), nuevo] };
    });
    setSeleccion({ pista: "texto", indice: (plan?.textos ?? []).length });
  }

  function agregarSubtitulo() {
    actualizarPlan((p) => {
      const nuevo: SubtituloCue = {
        texto: "Subtítulo",
        desde: 0,
        hasta: Math.min(2, durTotal),
      };
      return { ...p, subtitulos: [...(p.subtitulos ?? []), nuevo] };
    });
    setSeleccion({
      pista: "subtitulo",
      indice: (plan?.subtitulos ?? []).length,
    });
  }

  function agregarSticker() {
    const archivoPorDefecto = medios?.stickers?.[0] ?? "";
    actualizarPlan((p) => {
      const nuevo: StickerPlan = {
        archivo: archivoPorDefecto,
        desde: 0,
        hasta: Math.min(3, durTotal),
        posicion: "arriba-derecha",
        escala: 0.2,
        animacion: "fundido",
      };
      return { ...p, stickers: [...(p.stickers ?? []), nuevo] };
    });
    setSeleccion({ pista: "sticker", indice: (plan?.stickers ?? []).length });
  }

  function eliminarSeleccionado() {
    if (!seleccion) return;
    const { pista, indice } = seleccion;
    actualizarPlan((p) => {
      if (pista === "segmento") {
        // No permitimos quedarnos sin ningún segmento.
        if ((p.segmentos ?? []).length <= 1) return p;
        return {
          ...p,
          segmentos: p.segmentos.filter((_, i) => i !== indice),
        };
      }
      if (pista === "texto") {
        return { ...p, textos: (p.textos ?? []).filter((_, i) => i !== indice) };
      }
      if (pista === "sticker") {
        return {
          ...p,
          stickers: (p.stickers ?? []).filter((_, i) => i !== indice),
        };
      }
      // subtitulo
      return {
        ...p,
        subtitulos: (p.subtitulos ?? []).filter((_, i) => i !== indice),
      };
    });
    setSeleccion(null);
  }

  // -------------------------------------------------------------------------
  // Generar subtítulos con IA (POST /api/ai/transcribe)
  // -------------------------------------------------------------------------

  async function generarSubtitulos() {
    setTranscribiendo(true);
    setAviso(null);
    try {
      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editId: edit.id }),
      });
      if (res.status === 503) {
        setAviso({
          tipo: "info",
          texto:
            "La transcripción automática no está disponible en este momento. Puedes agregar subtítulos a mano con “➕ Subtítulo”.",
        });
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudieron generar los subtítulos");
      }
      const cues = (data?.subtitulos ?? []) as SubtituloCue[];
      actualizarPlan((p) => ({ ...p, subtitulos: cues }));
      setSeleccion(null);
      setAviso({
        tipo: "ok",
        texto: `Se generaron ${cues.length} ${
          cues.length === 1 ? "subtítulo" : "subtítulos"
        }. Revísalos y pulsa “Guardar y renderizar”.`,
      });
    } catch (e) {
      setAviso({
        tipo: "error",
        texto: mensajeDeError(e, "Error al generar los subtítulos"),
      });
    } finally {
      setTranscribiendo(false);
    }
  }

  // -------------------------------------------------------------------------
  // Guardar y renderizar (POST /api/edits/rerender + polling)
  // -------------------------------------------------------------------------

  async function guardarYRenderizar() {
    if (renderizando) return;
    setRenderizando(true);
    setAviso({ tipo: "info", texto: "Renderizando…" });
    try {
      const res = await fetch("/api/edits/rerender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editId: edit.id, plan }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo iniciar el re-render");
      }
      // Polling a la lista de ediciones del video hasta que ESTA edición
      // vuelva a 'completado' o 'error'.
      if (pollingRef.current !== null) window.clearInterval(pollingRef.current);
      pollingRef.current = window.setInterval(() => {
        void sondearEstado();
      }, 5000);
    } catch (e) {
      setRenderizando(false);
      setAviso({
        tipo: "error",
        texto: mensajeDeError(e, "Error al re-renderizar"),
      });
    }
  }

  async function sondearEstado() {
    try {
      // La edición puede pertenecer a un proyecto (project_id) o a un video
      // suelto (video_id, modo clásico): se consulta la lista que corresponda.
      const consulta = edit.project_id
        ? `projectId=${encodeURIComponent(edit.project_id)}`
        : `videoId=${encodeURIComponent(edit.video_id ?? "")}`;
      const res = await fetch(`/api/edits?${consulta}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) return;
      const lista = (data?.edits ?? []) as EditJob[];
      const actual = lista.find((e) => e.id === edit.id);
      if (!actual) return;
      if (actual.status === "completado") {
        detenerPolling();
        setRenderizando(false);
        // cache-busting para que el <video> recargue el nuevo render.
        if (actual.output_url) {
          versionRef.current += 1;
          const sep = actual.output_url.includes("?") ? "&" : "?";
          setPreviewUrl(`${actual.output_url}${sep}v=${versionRef.current}`);
        }
        if (actual.plan) setPlan(actual.plan);
        setAviso({ tipo: "ok", texto: "¡Listo! Nuevo video renderizado." });
        onRerenderizado(actual);
      } else if (actual.status === "error") {
        detenerPolling();
        setRenderizando(false);
        setAviso({
          tipo: "error",
          texto: actual.error ?? "El re-render terminó con error.",
        });
        onRerenderizado(actual);
      }
    } catch {
      // Reintenta en el siguiente tick del intervalo.
    }
  }

  function detenerPolling() {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  // -------------------------------------------------------------------------
  // Datos derivados para la línea de tiempo
  // -------------------------------------------------------------------------

  // Ancho mínimo de la línea de tiempo: crece con la duración para que sea
  // scrolleable y los bloques cortos sigan siendo clicables.
  const anchoTimeline = Math.max(720, Math.round(durTotal * 90));

  const seleccionado = (pista: Pista, indice: number) =>
    seleccion?.pista === pista && seleccion?.indice === indice;

  // Clic en el fondo de una pista → posicionarse en ese segundo (y permitir
  // arrastrar el cabezal directamente desde ahí).
  const seekDesdePista = (clientX: number) => {
    buscar(xASegundo(clientX));
    setArrastrando(true);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-foreground">
      {/* Barra superior del editor */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-borde bg-surface/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">
            ✏️
          </span>
          <h3 className="text-sm font-semibold">Editor de video</h3>
          <span className="rounded-full border border-borde bg-surface-2 px-2 py-0.5 text-[11px] text-tenue">
            {formatearDuracion(durTotal)} · {plan.segmentos.length}{" "}
            {plan.segmentos.length === 1 ? "segmento" : "segmentos"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={guardarYRenderizar}
            disabled={renderizando || transcribiendo}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {renderizando ? <Spinner /> : <span aria-hidden="true">💾</span>}
            {renderizando ? "Renderizando…" : "Guardar y renderizar"}
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="inline-flex items-center gap-1.5 rounded-xl border border-borde px-3 py-2 text-sm font-medium text-tenue transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            Cerrar
          </button>
        </div>
      </header>

      {/* Aviso de estado (renderizando, error, ok, info) */}
      {aviso && (
        <div
          className={`shrink-0 border-b px-4 py-2 text-sm ${
            aviso.tipo === "error"
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : aviso.tipo === "ok"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {(renderizando || transcribiendo) && aviso.tipo === "info" && (
              <Spinner className="h-4 w-4" />
            )}
            {aviso.texto}
          </span>
        </div>
      )}

      {/* Cuerpo: preview + timeline a la izquierda, propiedades a la derecha */}
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_20rem] grid-rows-[minmax(0,1fr)_auto] [grid-template-areas:'main_props'_'timeline_timeline']">
        {/* Columna principal: preview + controles (con su propio scroll) */}
        <div className="[grid-area:main] flex min-h-0 min-w-0 flex-col overflow-y-auto">
          {/* Preview */}
          <div className="flex flex-col items-center gap-3 border-b border-borde bg-surface/40 p-4">
            {previewUrl ? (
              <video
                key={previewUrl}
                ref={videoRef}
                controls
                playsInline
                preload="metadata"
                src={previewUrl}
                className="max-h-64 rounded-xl border border-borde bg-black"
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center rounded-xl border border-borde bg-black/60 text-sm text-tenue">
                Sin preview todavía
              </div>
            )}

            {/* Lector de tiempo + transporte */}
            <div className="flex w-full flex-col items-center gap-2">
              <div className="flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-2xl font-semibold text-foreground">
                  {marcaCs(tiempoActual)}
                </span>
                <span className="text-sm text-tenue">
                  / {marcaCs(durReferencia)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <BotonTransporte
                  onClick={irAInicio}
                  disabled={!previewUrl}
                  titulo="Ir al inicio"
                >
                  ⏮
                </BotonTransporte>
                <BotonTransporte
                  onClick={() => saltar(-0.5)}
                  disabled={!previewUrl}
                  titulo="Atrás 0,5 s"
                >
                  −0,5s
                </BotonTransporte>
                <BotonTransporte
                  onClick={alternarPlay}
                  disabled={!previewUrl}
                  titulo={reproduciendo ? "Pausar" : "Reproducir"}
                  destacado
                >
                  {reproduciendo ? "⏸" : "▶"}
                </BotonTransporte>
                <BotonTransporte
                  onClick={() => saltar(0.5)}
                  disabled={!previewUrl}
                  titulo="Adelante 0,5 s"
                >
                  +0,5s
                </BotonTransporte>
              </div>
              <p className="text-[11px] text-tenue">
                Duración estimada del plan: {formatearDuracion(durTotal)}
              </p>
            </div>
          </div>

          {/* Controles globales */}
          <ControlesGlobales
            plan={plan}
            medios={medios}
            actualizarPlan={actualizarPlan}
          />

          {/* Botones de elementos */}
          <div className="flex flex-wrap items-center gap-2 border-b border-borde px-4 py-3">
            <BotonHerramienta onClick={agregarTexto} icono="🔤">
              Texto
            </BotonHerramienta>
            <BotonHerramienta onClick={agregarSubtitulo} icono="💬">
              Subtítulo
            </BotonHerramienta>
            <BotonHerramienta onClick={agregarSticker} icono="✨">
              Sticker
            </BotonHerramienta>
            <button
              type="button"
              onClick={eliminarSeleccionado}
              disabled={!seleccion}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">🗑</span> Eliminar seleccionado
            </button>
            <button
              type="button"
              onClick={generarSubtitulos}
              disabled={transcribiendo || renderizando}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-acento/40 bg-acento/10 px-3 py-1.5 text-sm text-violet-200 transition-colors hover:bg-acento/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {transcribiendo ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <span aria-hidden="true">💬</span>
              )}
              {transcribiendo ? "Transcribiendo…" : "Generar subtítulos con IA"}
            </button>
          </div>
        </div>

        {/* TIMELINE — franja fija al fondo, ancho completo, siempre visible */}
        <div className="[grid-area:timeline] min-h-0 max-h-[42vh] overflow-auto border-t border-borde p-4">
            <div style={{ width: anchoTimeline }} className="relative min-w-full">
              {/* Regla de tiempo (clic para posicionarse) */}
              <div className="flex items-stretch">
                <div className="w-28 shrink-0" />
                <div
                  ref={timelineRef}
                  onMouseDown={(e) => {
                    // Clic en la regla: busca ese segundo (además de permitir
                    // arrastrar desde aquí como una barra de scrubbing).
                    buscar(xASegundo(e.clientX));
                    setArrastrando(true);
                  }}
                  className="relative h-6 flex-1 cursor-col-resize select-none border-b border-borde"
                  title="Clic o arrastra para elegir el segundo"
                >
                  {marcasFinas.map((m, i) => (
                    <div
                      key={i}
                      className="pointer-events-none absolute top-0 flex h-full flex-col items-start"
                      style={{ left: `${(m.t / durReferencia) * 100}%` }}
                    >
                      <span
                        className={`w-px ${m.etiqueta ? "h-3 bg-tenue" : "h-1.5 bg-borde"}`}
                      />
                      {m.etiqueta && (
                        <span className="mt-0.5 -translate-x-1/2 pl-1 text-[10px] text-tenue">
                          {marca(m.t)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CABEZAL DE REPRODUCCIÓN (playhead): línea roja vertical sobre
                  todas las pistas. Empieza tras la columna de etiquetas (w-28
                  = 7rem) y se posiciona por fracción de la duración real. */}
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-20"
                style={{ left: "7rem", right: 0 }}
              >
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${Math.max(0, Math.min(100, (tiempoActual / durReferencia) * 100))}%`,
                  }}
                >
                  {/* Tirador arrastrable en la parte superior */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setArrastrando(true);
                    }}
                    title="Arrastra el cabezal"
                    className="pointer-events-auto absolute -top-1 -translate-x-1/2 cursor-col-resize"
                  >
                    <svg
                      className="h-3 w-3 text-red-500 drop-shadow"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M1 1h10v5L6 11 1 6z" />
                    </svg>
                  </button>
                  {/* Línea vertical */}
                  <span className="absolute top-0 bottom-0 -translate-x-1/2 w-0.5 bg-red-500/90" />
                </div>
              </div>

              {/* Pista: Video (segmentos) */}
              <Pista etiqueta="🎬 Video" onSeek={seekDesdePista}>
                {plan.segmentos.map((seg, i) => {
                  const inicio = offsetsSegmentos[i] ?? 0;
                  const largo = duracionFinalSegmento(seg);
                  const color =
                    COLORES_SEGMENTO[i % COLORES_SEGMENTO.length];
                  // Si el segmento viene de un asset del proyecto, mostramos
                  // su nombre corto (si lo conocemos) en vez de los tiempos.
                  const nombreAsset = seg.asset_id
                    ? nombresAssets.get(seg.asset_id)
                    : undefined;
                  return (
                    <BloqueTimeline
                      key={i}
                      left={(inicio / durTotal) * 100}
                      width={(largo / durTotal) * 100}
                      seleccionado={seleccionado("segmento", i)}
                      onClick={() =>
                        setSeleccion({ pista: "segmento", indice: i })
                      }
                      className={`bg-gradient-to-b ${color}`}
                    >
                      <span className="truncate">
                        {nombreAsset
                          ? recortar(nombreAsset, 18)
                          : `${marca(seg.desde)}–${marca(seg.hasta)}`}
                      </span>
                      {seg.velocidad !== 1 && (
                        <span className="ml-1 rounded bg-black/30 px-1 text-[9px]">
                          {seg.velocidad}x
                        </span>
                      )}
                    </BloqueTimeline>
                  );
                })}
              </Pista>

              {/* Pista: Subtítulos */}
              <Pista etiqueta="💬 Subtítulos" onSeek={seekDesdePista}>
                {(plan.subtitulos ?? []).map((cue, i) => (
                  <BloqueTimeline
                    key={i}
                    left={(cue.desde / durTotal) * 100}
                    width={((cue.hasta - cue.desde) / durTotal) * 100}
                    seleccionado={seleccionado("subtitulo", i)}
                    onClick={() =>
                      setSeleccion({ pista: "subtitulo", indice: i })
                    }
                    className="bg-gradient-to-b from-cyan-600/80 to-cyan-500/50 border-cyan-400/50"
                  >
                    <span className="truncate">{recortar(cue.texto, 22)}</span>
                  </BloqueTimeline>
                ))}
                {(plan.subtitulos ?? []).length === 0 && (
                  <PistaVacia texto="sin subtítulos" />
                )}
              </Pista>

              {/* Pista: Textos */}
              <Pista etiqueta="🔤 Textos" onSeek={seekDesdePista}>
                {(plan.textos ?? []).map((t, i) => (
                  <BloqueTimeline
                    key={i}
                    left={(t.desde / durTotal) * 100}
                    width={((t.hasta - t.desde) / durTotal) * 100}
                    seleccionado={seleccionado("texto", i)}
                    onClick={() => setSeleccion({ pista: "texto", indice: i })}
                    className="bg-gradient-to-b from-indigo-600/80 to-indigo-500/50 border-indigo-400/50"
                  >
                    <span className="truncate">{recortar(t.texto, 22)}</span>
                  </BloqueTimeline>
                ))}
                {(plan.textos ?? []).length === 0 && (
                  <PistaVacia texto="sin textos" />
                )}
              </Pista>

              {/* Pista: Stickers */}
              <Pista etiqueta="✨ Stickers" onSeek={seekDesdePista}>
                {(plan.stickers ?? []).map((s, i) => (
                  <BloqueTimeline
                    key={i}
                    left={(s.desde / durTotal) * 100}
                    width={((s.hasta - s.desde) / durTotal) * 100}
                    seleccionado={seleccionado("sticker", i)}
                    onClick={() =>
                      setSeleccion({ pista: "sticker", indice: i })
                    }
                    className="bg-gradient-to-b from-pink-600/80 to-pink-500/50 border-pink-400/50"
                  >
                    <span className="truncate">
                      {sinExtension(s.archivo) || "sticker"}
                    </span>
                  </BloqueTimeline>
                ))}
                {(plan.stickers ?? []).length === 0 && (
                  <PistaVacia texto="sin stickers" />
                )}
              </Pista>

              {/* Pista: Música (barra completa) */}
              <Pista etiqueta="🎵 Música" altura="h-8" onSeek={seekDesdePista}>
                <div
                  className={`pointer-events-none absolute inset-y-1 left-0 right-0 flex items-center gap-2 rounded-md border px-2 text-[11px] ${
                    plan.musica?.archivo
                      ? "border-teal-400/40 bg-gradient-to-r from-teal-600/40 to-teal-500/20 text-teal-100"
                      : "border-borde bg-surface-2/60 text-tenue"
                  }`}
                >
                  <span aria-hidden="true">🎵</span>
                  <span className="truncate">
                    {plan.musica?.archivo
                      ? sinExtension(plan.musica.archivo)
                      : "sin música"}
                  </span>
                </div>
              </Pista>

              {/* Pista: Efectos (marcadores puntuales) */}
              <Pista etiqueta="⚡ Efectos" onSeek={seekDesdePista}>
                {(plan.efectos_sonido ?? []).map((fx, i) => (
                  <Marcador
                    key={`fx-${i}`}
                    left={(fx.en_segundo / durTotal) * 100}
                    etiqueta={sinExtension(fx.archivo)}
                    color="bg-amber-400"
                  />
                ))}
                {plan.whoosh_en_transiciones &&
                  offsetsSegmentos.slice(1).map((off, i) => (
                    <Marcador
                      key={`wh-${i}`}
                      left={(off / durTotal) * 100}
                      etiqueta="whoosh"
                      color="bg-fuchsia-400"
                    />
                  ))}
                {(plan.efectos_sonido ?? []).length === 0 &&
                  !plan.whoosh_en_transiciones && (
                    <PistaVacia texto="sin efectos" />
                  )}
              </Pista>
            </div>
          </div>

        {/* Panel de propiedades */}
        <aside className="[grid-area:props] min-h-0 overflow-y-auto border-t border-borde bg-surface/60 p-4 lg:border-l lg:border-t-0">
          <PanelPropiedades
            plan={plan}
            seleccion={seleccion}
            medios={medios}
            actualizarPlan={actualizarPlan}
            tiempoActual={tiempoActual}
          />
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes de la línea de tiempo
// ---------------------------------------------------------------------------

function Pista({
  etiqueta,
  children,
  altura = "h-10",
  onSeek,
}: {
  etiqueta: string;
  children: ReactNode;
  altura?: string;
  // Clic en el fondo de la pista → posicionarse en ese segundo.
  onSeek?: (clientX: number) => void;
}) {
  return (
    <div className="mt-2 flex items-stretch">
      <div className="flex w-28 shrink-0 items-center pr-2 text-xs font-medium text-tenue">
        {etiqueta}
      </div>
      <div
        onMouseDown={onSeek ? (e) => onSeek(e.clientX) : undefined}
        className={`relative flex-1 rounded-md border border-borde/60 bg-surface-2/30 ${altura} ${
          onSeek ? "cursor-col-resize" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function PistaVacia({ texto }: { texto: string }) {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center pl-2 text-[11px] italic text-tenue/60">
      {texto}
    </span>
  );
}

function BloqueTimeline({
  left,
  width,
  seleccionado,
  onClick,
  className,
  children,
}: {
  left: number;
  width: number;
  seleccionado: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Evita que el mousedown burbujee al fondo de la pista y dispare un
      // "seek": clicar un bloque solo lo selecciona.
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        left: `${Math.max(0, Math.min(100, left))}%`,
        width: `${Math.max(2, Math.min(100, width))}%`,
      }}
      className={`absolute inset-y-1 flex items-center overflow-hidden rounded-md border px-1.5 text-[11px] font-medium text-white shadow-sm transition-all hover:brightness-110 ${className ?? ""} ${
        seleccionado ? "ring-2 ring-white ring-offset-1 ring-offset-background" : ""
      }`}
      title="Clic para editar"
    >
      {children}
    </button>
  );
}

function Marcador({
  left,
  etiqueta,
  color,
}: {
  left: number;
  etiqueta: string;
  color: string;
}) {
  return (
    <div
      className="absolute inset-y-0 flex flex-col items-center"
      style={{ left: `${Math.max(0, Math.min(100, left))}%` }}
    >
      <span className={`h-full w-0.5 ${color}`} />
      <span className="absolute -top-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-black/50 px-1 text-[9px] text-white">
        {etiqueta}
      </span>
    </div>
  );
}

function BotonTransporte({
  onClick,
  titulo,
  children,
  disabled,
  destacado,
}: {
  onClick: () => void;
  titulo: string;
  children: ReactNode;
  disabled?: boolean;
  destacado?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={titulo}
      aria-label={titulo}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        destacado
          ? "border-acento/50 bg-acento/20 text-foreground hover:bg-acento/30"
          : "border-borde bg-surface-2/60 text-tenue hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function BotonHerramienta({
  onClick,
  icono,
  children,
}: {
  onClick: () => void;
  icono: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-borde bg-surface-2/60 px-3 py-1.5 text-sm text-foreground transition-colors hover:border-acento/50 hover:bg-surface-2"
    >
      <span aria-hidden="true">{icono}</span> {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Controles globales (barra bajo el preview)
// ---------------------------------------------------------------------------

function ControlesGlobales({
  plan,
  medios,
  actualizarPlan,
}: {
  plan: ExecutableEditPlan;
  medios: Medios | null;
  actualizarPlan: (fn: (p: ExecutableEditPlan) => ExecutableEditPlan) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-borde px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
      {/* Filtro */}
      <CampoSelect
        etiqueta="🎨 Filtro"
        valor={plan.filtro}
        opciones={FILTROS}
        onChange={(v) =>
          actualizarPlan((p) => ({ ...p, filtro: v as ExecutableEditPlan["filtro"] }))
        }
      />

      {/* Transición: tipo + duración */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-tenue">
          🔄 Transición
        </span>
        <div className="flex gap-2">
          <select
            value={plan.transicion?.tipo ?? "ninguna"}
            onChange={(e) =>
              actualizarPlan((p) => ({
                ...p,
                transicion: {
                  tipo: e.target.value as ExecutableEditPlan["transicion"]["tipo"],
                  duracion: p.transicion?.duracion ?? 0.5,
                },
              }))
            }
            className={claseSelect}
          >
            {TRANSICIONES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.etiqueta}
              </option>
            ))}
          </select>
          <input
            type="number"
            step={0.1}
            min={0.3}
            max={1}
            value={plan.transicion?.duracion ?? 0.5}
            onChange={(e) =>
              actualizarPlan((p) => ({
                ...p,
                transicion: {
                  tipo: p.transicion?.tipo ?? "ninguna",
                  duracion: Number(e.target.value),
                },
              }))
            }
            className={`${claseInput} w-16`}
            title="Duración (s)"
          />
        </div>
      </div>

      {/* Música */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-tenue">
          🎵 Música
        </span>
        <select
          value={plan.musica?.archivo ?? ""}
          onChange={(e) =>
            actualizarPlan((p) => ({
              ...p,
              musica: {
                archivo: e.target.value || null,
                volumen: p.musica?.volumen ?? 0.5,
                volumen_original: p.musica?.volumen_original ?? 1,
              },
            }))
          }
          className={claseSelect}
        >
          <option value="">Sin música</option>
          {(medios?.musica ?? []).map((m) => (
            <option key={m} value={m}>
              {sinExtension(m)}
            </option>
          ))}
        </select>
      </div>

      {/* Volumen música */}
      <CampoRange
        etiqueta={`Volumen música · ${Math.round((plan.musica?.volumen ?? 0) * 100)}%`}
        valor={plan.musica?.volumen ?? 0.5}
        onChange={(v) =>
          actualizarPlan((p) => ({
            ...p,
            musica: {
              archivo: p.musica?.archivo ?? null,
              volumen: v,
              volumen_original: p.musica?.volumen_original ?? 1,
            },
          }))
        }
      />

      {/* Volumen original */}
      <CampoRange
        etiqueta={`Volumen original · ${Math.round((plan.musica?.volumen_original ?? 0) * 100)}%`}
        valor={plan.musica?.volumen_original ?? 1}
        onChange={(v) =>
          actualizarPlan((p) => ({
            ...p,
            musica: {
              archivo: p.musica?.archivo ?? null,
              volumen: p.musica?.volumen ?? 0.5,
              volumen_original: v,
            },
          }))
        }
      />

      {/* Estilo de subtítulos: clásico (bloque) vs karaoke (palabra a palabra) */}
      <CampoSelect
        etiqueta="💬 Estilo subtítulos"
        valor={plan.subtitulos_estilo ?? "clasico"}
        opciones={SUBTITULOS_ESTILO}
        onChange={(v) =>
          actualizarPlan((p) => ({
            ...p,
            subtitulos_estilo:
              v as NonNullable<ExecutableEditPlan["subtitulos_estilo"]>,
          }))
        }
      />

      {/* Whoosh en transiciones */}
      <label className="flex items-center gap-2 self-end text-sm text-foreground">
        <input
          type="checkbox"
          checked={Boolean(plan.whoosh_en_transiciones)}
          onChange={(e) =>
            actualizarPlan((p) => ({
              ...p,
              whoosh_en_transiciones: e.target.checked,
            }))
          }
          className="h-4 w-4 accent-acento"
        />
        ⚡ Whoosh en transiciones
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel de propiedades del elemento seleccionado
// ---------------------------------------------------------------------------

function PanelPropiedades({
  plan,
  seleccion,
  medios,
  actualizarPlan,
  tiempoActual,
}: {
  plan: ExecutableEditPlan;
  seleccion: Seleccion | null;
  medios: Medios | null;
  actualizarPlan: (fn: (p: ExecutableEditPlan) => ExecutableEditPlan) => void;
  // Segundo del cabezal de reproducción, para los botones "usar tiempo actual".
  tiempoActual: number;
}) {
  if (!seleccion) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-tenue">
        <span aria-hidden="true" className="text-2xl">
          👆
        </span>
        <p>Haz clic en un bloque de la línea de tiempo para editarlo.</p>
      </div>
    );
  }

  const { pista, indice } = seleccion;

  if (pista === "segmento") {
    const seg = plan.segmentos[indice];
    if (!seg) return null;
    const set = <K extends keyof Segmento>(campo: K, valor: Segmento[K]) =>
      actualizarPlan((p) => ({
        ...p,
        segmentos: p.segmentos.map((s, i) =>
          i === indice ? { ...s, [campo]: valor } : s
        ),
      }));
    return (
      <PropiedadesLayout titulo={`🎬 Segmento ${indice + 1}`}>
        {/* Recorte en el video ORIGINAL (no en la línea final). */}
        <TiemposConCabezal
          desde={seg.desde}
          hasta={seg.hasta}
          tiempoActual={tiempoActual}
          onDesde={(v) => set("desde", v)}
          onHasta={(v) => set("hasta", v)}
        />
        <CampoNumber
          etiqueta="Velocidad"
          valor={seg.velocidad}
          step={0.1}
          min={0.5}
          max={2}
          onChange={(v) => set("velocidad", v)}
        />
        {/* Movimiento de cámara (Ken Burns) para dar vida a tomas fijas. */}
        <CampoSelect
          etiqueta="Movimiento de cámara"
          valor={seg.zoom ?? "ninguno"}
          opciones={TIPOS_ZOOM}
          onChange={(v) => set("zoom", v as NonNullable<Segmento["zoom"]>)}
        />
        {/* Reencuadre al pasar de horizontal a 9:16. */}
        <CampoSelect
          etiqueta="Reencuadre (9:16)"
          valor={seg.reencuadre ?? "centro"}
          opciones={REENCUADRES}
          onChange={(v) =>
            set("reencuadre", v as NonNullable<Segmento["reencuadre"]>)
          }
        />
        {/* Rotación (grados). El select devuelve string → a número. */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-tenue">
            Rotación
          </span>
          <select
            value={String(seg.rotacion ?? 0)}
            onChange={(e) =>
              set(
                "rotacion",
                Number(e.target.value) as NonNullable<Segmento["rotacion"]>
              )
            }
            className={claseSelect}
          >
            {ROTACIONES.map((o) => (
              <option key={o.valor} value={String(o.valor)}>
                {o.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </PropiedadesLayout>
    );
  }

  if (pista === "subtitulo") {
    const cue = (plan.subtitulos ?? [])[indice];
    if (!cue) return null;
    const set = (campo: keyof SubtituloCue, valor: string | number) =>
      actualizarPlan((p) => ({
        ...p,
        subtitulos: (p.subtitulos ?? []).map((c, i) =>
          i === indice ? { ...c, [campo]: valor } : c
        ),
      }));
    return (
      <PropiedadesLayout titulo={`💬 Subtítulo ${indice + 1}`}>
        <CampoTexto etiqueta="Texto" valor={cue.texto} onChange={(v) => set("texto", v)} />
        <TiemposConCabezal
          desde={cue.desde}
          hasta={cue.hasta}
          tiempoActual={tiempoActual}
          onDesde={(v) => set("desde", v)}
          onHasta={(v) => set("hasta", v)}
        />
      </PropiedadesLayout>
    );
  }

  if (pista === "texto") {
    const t = (plan.textos ?? [])[indice];
    if (!t) return null;
    const set = <K extends keyof TextoPlan>(campo: K, valor: TextoPlan[K]) =>
      actualizarPlan((p) => ({
        ...p,
        textos: (p.textos ?? []).map((x, i) =>
          i === indice ? { ...x, [campo]: valor } : x
        ),
      }));
    return (
      <PropiedadesLayout titulo={`🔤 Texto ${indice + 1}`}>
        <CampoTexto etiqueta="Texto" valor={t.texto} onChange={(v) => set("texto", v)} />
        <TiemposConCabezal
          desde={t.desde}
          hasta={t.hasta}
          tiempoActual={tiempoActual}
          onDesde={(v) => set("desde", v)}
          onHasta={(v) => set("hasta", v)}
        />
        <CampoSelect
          etiqueta="Posición"
          valor={t.posicion}
          opciones={POSICIONES_TEXTO}
          onChange={(v) => set("posicion", v as TextoPlan["posicion"])}
        />
        <CampoSelect
          etiqueta="Estilo"
          valor={t.estilo}
          opciones={ESTILOS_TEXTO}
          onChange={(v) => set("estilo", v as TextoPlan["estilo"])}
        />
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-tenue">
            Fuente
          </span>
          <select
            value={t.fuente ?? ""}
            onChange={(e) => set("fuente", (e.target.value || null) as TextoPlan["fuente"])}
            className={claseSelect}
          >
            <option value="">Fuente del sistema</option>
            {(medios?.fuentes ?? []).map((f) => (
              <option key={f} value={f}>
                {sinExtension(f)}
              </option>
            ))}
          </select>
        </div>
        {/* Color con muestras */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-tenue">
            Color
          </span>
          <div className="flex flex-wrap gap-2">
            {COLORES_TEXTO.map((c) => (
              <button
                key={c.valor}
                type="button"
                title={c.etiqueta}
                onClick={() => set("color", c.valor)}
                className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                  t.color === c.valor
                    ? "border-white ring-2 ring-acento"
                    : "border-borde"
                }`}
                style={{ backgroundColor: COLORES_TEXTO_UI[c.valor] }}
              />
            ))}
          </div>
        </div>
        <CampoSelect
          etiqueta="Animación"
          valor={t.animacion ?? "fundido"}
          opciones={ANIMACIONES_TEXTO}
          onChange={(v) => set("animacion", v as NonNullable<TextoPlan["animacion"]>)}
        />
      </PropiedadesLayout>
    );
  }

  // sticker
  const s = (plan.stickers ?? [])[indice];
  if (!s) return null;
  const set = <K extends keyof StickerPlan>(campo: K, valor: StickerPlan[K]) =>
    actualizarPlan((p) => ({
      ...p,
      stickers: (p.stickers ?? []).map((x, i) =>
        i === indice ? { ...x, [campo]: valor } : x
      ),
    }));
  return (
    <PropiedadesLayout titulo={`✨ Sticker ${indice + 1}`}>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-tenue">
          Archivo
        </span>
        <div className="flex items-center gap-2">
          {s.archivo && (
            // Miniatura del sticker seleccionado.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/stickers/${s.archivo}`}
              alt={sinExtension(s.archivo)}
              className="h-10 w-10 shrink-0 rounded border border-borde bg-black/40 object-contain p-0.5"
            />
          )}
          <select
            value={s.archivo}
            onChange={(e) => set("archivo", e.target.value)}
            className={claseSelect}
          >
            {(medios?.stickers ?? []).map((st) => (
              <option key={st} value={st}>
                {sinExtension(st)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <TiemposConCabezal
        desde={s.desde}
        hasta={s.hasta}
        tiempoActual={tiempoActual}
        onDesde={(v) => set("desde", v)}
        onHasta={(v) => set("hasta", v)}
      />
      <CampoSelect
        etiqueta="Posición"
        valor={s.posicion}
        opciones={POSICIONES_STICKER}
        onChange={(v) => set("posicion", v as StickerPlan["posicion"])}
      />
      <CampoRange
        etiqueta={`Escala · ${s.escala.toFixed(2)}`}
        valor={s.escala}
        min={0.1}
        max={0.35}
        step={0.01}
        onChange={(v) => set("escala", v)}
      />
      <CampoSelect
        etiqueta="Animación"
        valor={s.animacion ?? "fundido"}
        opciones={ANIMACIONES_STICKER}
        onChange={(v) => set("animacion", v as NonNullable<StickerPlan["animacion"]>)}
      />
    </PropiedadesLayout>
  );
}

// Bloque "Desde / Hasta" con los botones ⏱ para fijar cada extremo al
// segundo actual del cabezal de reproducción (redondeado a 0,1 s). Es la
// pieza que convierte el scrubbing en una herramienta de marcado real.
function TiemposConCabezal({
  desde,
  hasta,
  tiempoActual,
  onDesde,
  onHasta,
}: {
  desde: number;
  hasta: number;
  tiempoActual: number;
  onDesde: (v: number) => void;
  onHasta: (v: number) => void;
}) {
  const ahora = aDecima(tiempoActual);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-borde/60 bg-surface-2/20 p-2">
      <div className="grid grid-cols-2 gap-2">
        <CampoNumber etiqueta="Desde (s)" valor={desde} onChange={onDesde} />
        <CampoNumber etiqueta="Hasta (s)" valor={hasta} onChange={onHasta} />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDesde(ahora)}
          title={`Fijar inicio en ${marcaCs(tiempoActual)}`}
          className="flex-1 rounded-md border border-borde bg-surface-2/60 px-2 py-1 text-[11px] text-tenue transition-colors hover:border-acento/50 hover:text-foreground"
        >
          ⏱ Inicio = {marcaCs(tiempoActual)}
        </button>
        <button
          type="button"
          onClick={() => onHasta(ahora)}
          title={`Fijar fin en ${marcaCs(tiempoActual)}`}
          className="flex-1 rounded-md border border-borde bg-surface-2/60 px-2 py-1 text-[11px] text-tenue transition-colors hover:border-acento/50 hover:text-foreground"
        >
          ⏱ Fin = {marcaCs(tiempoActual)}
        </button>
      </div>
    </div>
  );
}

function PropiedadesLayout({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
        {titulo}
      </h4>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campos reutilizables
// ---------------------------------------------------------------------------

const claseInput =
  "rounded-lg border border-borde bg-background/60 px-2.5 py-1.5 text-sm text-foreground focus:border-acento focus:outline-none focus:ring-1 focus:ring-acento";
const claseSelect = `${claseInput} w-full`;

function CampoTexto({
  etiqueta,
  valor,
  onChange,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-tenue">
        {etiqueta}
      </span>
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`${claseInput} w-full`}
      />
    </label>
  );
}

function CampoNumber({
  etiqueta,
  valor,
  onChange,
  step = 0.5,
  min,
  max,
}: {
  etiqueta: string;
  valor: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-tenue">
        {etiqueta}
      </span>
      <input
        type="number"
        value={valor}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${claseInput} w-full`}
      />
    </label>
  );
}

function CampoRange({
  etiqueta,
  valor,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
}: {
  etiqueta: string;
  valor: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-tenue">
        {etiqueta}
      </span>
      <input
        type="range"
        value={valor}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-acento"
      />
    </label>
  );
}

function CampoSelect<T extends string>({
  etiqueta,
  valor,
  opciones,
  onChange,
}: {
  etiqueta: string;
  valor: T;
  opciones: Opcion<T>[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-tenue">
        {etiqueta}
      </span>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={claseSelect}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}
