"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  EditJob,
  EditStatus,
  EstiloEdicion,
  ExecutableEditPlan,
  VideoAsset,
} from "@/lib/types";
import Spinner from "@/components/Spinner";
import ModalPublicar from "@/components/ModalPublicar";
import EditorTimeline from "@/components/EditorTimeline";
import { mensajeDeError } from "@/components/formato";

// Colores del badge por estado de la edición:
// procesando=ámbar, completado=verde, error=rojo.
const ESTILOS_ESTADO: Record<EditStatus, string> = {
  procesando: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  completado: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  error: "bg-red-500/15 text-red-300 border-red-500/40",
};

const ETIQUETAS_ESTADO: Record<EditStatus, string> = {
  procesando: "Procesando",
  completado: "Completado",
  error: "Error",
};

// Presets de estilo para "Editar con IA". El valor viaja en el body del POST
// /api/ai/edit; la ruta lo antepone a la instrucción como marcador
// "[[estilo:X]]" y ENGINE-B lo usa al generar el plan. "auto" es el default.
const ESTILOS_EDICION: ReadonlyArray<{
  valor: EstiloEdicion;
  etiqueta: string;
  icono: string;
  descripcion: string;
}> = [
  {
    valor: "auto",
    etiqueta: "Automático",
    icono: "✨",
    descripcion: "La IA elige el mejor estilo según el material.",
  },
  {
    valor: "autos",
    etiqueta: "Autos",
    icono: "🚗",
    descripcion: "Enérgico y dinámico, pensado para videos de autos.",
  },
  {
    valor: "punchy",
    etiqueta: "Punchy",
    icono: "⚡",
    descripcion: "Ritmo rápido, cortes secos y textos que enganchan.",
  },
  {
    valor: "cine",
    etiqueta: "Cine",
    icono: "🎬",
    descripcion: "Tomas más largas, transiciones suaves, tono cinematográfico.",
  },
];

// Badge de estado de una edición (con spinner animado mientras procesa).
function BadgeEdicion({ estado }: { estado: EditStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${ESTILOS_ESTADO[estado]}`}
    >
      {estado === "procesando" ? (
        <Spinner className="h-3 w-3" />
      ) : (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      )}
      {ETIQUETAS_ESTADO[estado]}
    </span>
  );
}

// Fecha corta legible en español, ej. "01 jul, 14:30".
function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function etiquetaFormato(formato: ExecutableEditPlan["formato"]): string {
  return formato === "vertical_9_16" ? "Vertical 9:16" : "Formato original";
}

// Quita la extensión de un nombre de archivo, ej. "fuego.png" -> "fuego".
function sinExtension(nombre: string): string {
  return nombre.replace(/\.[^.]+$/, "");
}

// Chips informativos de los campos v2 del plan (filtro, transición, música y
// stickers). Las ediciones antiguas pueden no traer estos campos, por eso
// SIEMPRE se accede con optional chaining.
function ChipsPlanV2({ plan }: { plan: ExecutableEditPlan }) {
  const chips: string[] = [];

  if (plan?.filtro && plan.filtro !== "ninguno") {
    chips.push(`🎨 Filtro: ${plan.filtro}`);
  }

  if (plan?.transicion?.tipo && plan.transicion.tipo !== "ninguna") {
    chips.push(`🔄 Transición: ${plan.transicion.tipo}`);
  }

  if (plan?.musica?.archivo) {
    const volumen = Math.round((plan.musica.volumen ?? 0) * 100);
    chips.push(
      `🎵 Música: ${sinExtension(plan.musica.archivo)} · vol ${volumen}%`
    );
  }

  const stickers = plan?.stickers ?? [];
  if (stickers.length > 0) {
    const nombres = stickers.map((s) => sinExtension(s.archivo)).join(", ");
    chips.push(
      `✨ ${stickers.length} ${stickers.length === 1 ? "sticker" : "stickers"}: ${nombres}`
    );
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-full border border-acento/40 bg-acento/10 px-2.5 py-1 text-xs text-violet-200"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

// Tarjeta de una edición: badge de estado, instrucción, plan resumido,
// reproductor del resultado y acciones (editor, descarga, publicar, borrar).
// Se reutiliza aquí (ediciones de un video) y en VistaProyecto (ediciones
// de un proyecto).
export function TarjetaEdicion({
  edit,
  borrando,
  onBorrar,
  onAbrirEditor,
  onPublicar,
}: {
  edit: EditJob;
  borrando: boolean;
  onBorrar: () => void;
  onAbrirEditor: () => void;
  onPublicar: () => void;
}) {
  return (
    <div className="rounded-xl border border-borde bg-surface-2/40 p-4">
      {/* Cabecera de la tarjeta */}
      <div className="flex items-center justify-between gap-3">
        <BadgeEdicion estado={edit.status} />
        <div className="flex items-center gap-2">
          <span className="text-xs text-tenue">
            {formatearFecha(edit.created_at)}
          </span>
          <button
            type="button"
            onClick={onBorrar}
            disabled={borrando}
            title="Borrar edición"
            aria-label="Borrar edición"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-borde text-tenue transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {borrando ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Instrucción usada */}
      {edit.instruccion && (
        <p className="mt-2 text-sm italic text-foreground">
          &ldquo;{edit.instruccion}&rdquo;
        </p>
      )}

      {/* Mensaje de error del trabajo */}
      {edit.status === "error" && edit.error && (
        <p className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {edit.error}
        </p>
      )}

      {/* Plan de edición generado por la IA */}
      {edit.plan && (
        <div className="mt-3 rounded-lg border border-borde bg-background/50 px-3 py-2">
          <p className="text-sm text-foreground">{edit.plan.resumen}</p>
          <p className="mt-1.5 text-xs text-tenue">
            {edit.plan.segmentos.length}{" "}
            {edit.plan.segmentos.length === 1 ? "segmento" : "segmentos"} ·{" "}
            {etiquetaFormato(edit.plan.formato)} · {edit.plan.textos.length}{" "}
            {edit.plan.textos.length === 1
              ? "texto en pantalla"
              : "textos en pantalla"}
          </p>
          {/* Chips de los campos v2 del plan (si existen) */}
          <ChipsPlanV2 plan={edit.plan} />
        </div>
      )}

      {/* Video final: reproductor, descarga y publicación */}
      {edit.status === "completado" && edit.output_url && (
        <div className="mt-3 flex flex-col gap-3">
          <video
            controls
            playsInline
            preload="metadata"
            src={edit.output_url}
            className="max-h-80 w-full rounded-xl border border-borde bg-black"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onAbrirEditor}
              disabled={!edit.plan}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-acento/50 bg-acento/10 px-4 py-2 text-sm font-semibold text-violet-200 transition-colors hover:bg-acento/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true">✏️</span> Abrir editor
            </button>
            <a
              href={edit.output_url}
              download
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-borde px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-acento/50 hover:bg-surface-2"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Descargar MP4
            </a>
            <button
              type="button"
              onClick={onPublicar}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Publicar en Instagram
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Pestaña "Editar con IA": lanza una edición real del video (descarga,
// análisis con IA y render con ffmpeg) y muestra el historial de ediciones.
export default function PanelEditarIA({ video }: { video: VideoAsset }) {
  const [instruccion, setInstruccion] = useState("");
  // Estilo de edición elegido en la UI ("auto" = la IA decide, por defecto).
  const [estilo, setEstilo] = useState<EstiloEdicion>("auto");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // null = todavía no se cargó la lista por primera vez
  const [edits, setEdits] = useState<EditJob[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);

  // Publicación en Instagram de una edición completada
  const [editParaPublicar, setEditParaPublicar] = useState<EditJob | null>(
    null
  );
  const [resultadoPublicacion, setResultadoPublicacion] = useState<{
    ok: boolean;
    mensaje: string;
  } | null>(null);

  // Edición abierta en el editor visual (modal a pantalla casi completa).
  const [editEnEditor, setEditEnEditor] = useState<EditJob | null>(null);

  // Id de la edición que se está borrando (para deshabilitar su botón).
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  // Carga la lista de ediciones del video.
  const cargarEdiciones = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/edits?videoId=${encodeURIComponent(video.id)}`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudieron cargar las ediciones");
      }
      setEdits((data?.edits ?? []) as EditJob[]);
      setErrorLista(null);
    } catch (e) {
      setErrorLista(
        mensajeDeError(e, "Error inesperado al cargar las ediciones")
      );
      // Si nunca se cargó nada, dejamos la lista vacía para salir del estado inicial
      setEdits((prev) => prev ?? []);
    }
  }, [video.id]);

  // Carga inicial al montar (o al cambiar de video). Igual que en Dashboard:
  // el setState ocurre tras el await del fetch, no de forma síncrona.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial
    void cargarEdiciones();
  }, [cargarEdiciones]);

  const hayProcesando = (edits ?? []).some((e) => e.status === "procesando");

  // Sondeo cada 5 segundos MIENTRAS exista alguna edición procesando.
  useEffect(() => {
    if (!hayProcesando) return;
    const id = window.setInterval(() => {
      void cargarEdiciones();
    }, 5000);
    return () => window.clearInterval(id);
  }, [hayProcesando, cargarEdiciones]);

  // Lanza una nueva edición con IA (respuesta 202 con el trabajo creado).
  async function editarConIA() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          instruccion: instruccion.trim() || undefined,
          estilo,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo iniciar la edición");
      }
      const nuevo = data?.edit as EditJob | undefined;
      if (nuevo) {
        // Lo agregamos de inmediato; el sondeo lo mantendrá actualizado.
        setEdits((prev) => [nuevo, ...(prev ?? [])]);
      } else {
        void cargarEdiciones();
      }
    } catch (e) {
      setError(mensajeDeError(e, "Error inesperado al iniciar la edición"));
    } finally {
      setEnviando(false);
    }
  }

  // Borra una edición: elimina su archivo de Storage + la fila (DELETE
  // /api/edits/[id]) y, si sale bien, la quita de la lista local.
  async function borrarEdicion(edit: EditJob) {
    if (borrandoId) return;
    const confirmar = window.confirm(
      "¿Borrar esta edición? Se eliminará el video renderizado. No se puede deshacer."
    );
    if (!confirmar) return;
    setBorrandoId(edit.id);
    setError(null);
    try {
      const res = await fetch(`/api/edits/${encodeURIComponent(edit.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo borrar la edición");
      }
      setEdits((prev) => (prev ?? []).filter((e) => e.id !== edit.id));
      // Si estaba abierta en el editor, ciérralo.
      setEditEnEditor((abierto) => (abierto?.id === edit.id ? null : abierto));
    } catch (e) {
      setError(mensajeDeError(e, "Error inesperado al borrar la edición"));
    } finally {
      setBorrandoId(null);
    }
  }

  // El editor visual re-renderizó: reemplaza la edición en la lista local con
  // la versión actualizada (nuevo output_url/plan/estado).
  function alRerenderizar(editActualizado: EditJob) {
    setEdits((prev) =>
      (prev ?? []).map((e) => (e.id === editActualizado.id ? editActualizado : e))
    );
    setEditEnEditor((abierto) =>
      abierto?.id === editActualizado.id ? editActualizado : abierto
    );
  }

  const claseCampo =
    "w-full rounded-xl border border-borde bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-tenue/60 focus:border-acento focus:outline-none focus:ring-1 focus:ring-acento";

  return (
    <div className="flex flex-col gap-5">
      {/* Entrada para la IA */}
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-tenue">
          Instrucción para la IA (opcional)
          <textarea
            value={instruccion}
            onChange={(e) => setInstruccion(e.target.value)}
            placeholder="Ej: hazlo de 30 segundos, ritmo rápido, con textos que enganchen"
            rows={3}
            className={`${claseCampo} resize-y`}
            disabled={enviando}
          />
        </label>

        {/* Selector de estilo de edición (preset que afina el plan de la IA) */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-tenue">
            Estilo de edición
          </span>
          <div className="flex flex-wrap gap-2">
            {ESTILOS_EDICION.map((opcion) => {
              const activo = estilo === opcion.valor;
              return (
                <button
                  key={opcion.valor}
                  type="button"
                  onClick={() => setEstilo(opcion.valor)}
                  disabled={enviando}
                  aria-pressed={activo}
                  title={opcion.descripcion}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    activo
                      ? "border-acento bg-acento/15 text-violet-200"
                      : "border-borde bg-background/60 text-tenue hover:border-acento/50 hover:bg-surface-2"
                  }`}
                >
                  <span aria-hidden="true">{opcion.icono}</span>
                  {opcion.etiqueta}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={editarConIA}
          disabled={enviando}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? <Spinner /> : <span aria-hidden="true">🎬</span>}
          {enviando ? "Iniciando edición..." : "Editar video con IA"}
        </button>
      </div>

      {/* Aviso persistente mientras haya ediciones en curso */}
      {hayProcesando && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <Spinner className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            La edición puede tardar varios minutos: se descarga el video, la IA
            lo analiza y se renderiza.
          </p>
        </div>
      )}

      {/* Errores al iniciar la edición */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Resultado de la publicación en Instagram */}
      {resultadoPublicacion && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            resultadoPublicacion.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/40 bg-red-500/10 text-red-300"
          }`}
        >
          {resultadoPublicacion.mensaje}
        </div>
      )}

      {/* Historial de ediciones */}
      <div className="flex flex-col gap-3 border-t border-borde pt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
          Ediciones de este video
        </h4>

        {errorLista && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorLista}
          </div>
        )}

        {edits === null ? (
          <div className="flex items-center gap-2 text-sm text-tenue">
            <Spinner /> Cargando ediciones...
          </div>
        ) : edits.length === 0 ? (
          <p className="text-sm text-tenue">
            Todavía no hay ediciones. Escribe una instrucción (o déjala vacía)
            y pulsa &quot;Editar video con IA&quot;.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {edits.map((edit) => (
              <li key={edit.id}>
                <TarjetaEdicion
                  edit={edit}
                  borrando={borrandoId === edit.id}
                  onBorrar={() => void borrarEdicion(edit)}
                  onAbrirEditor={() => setEditEnEditor(edit)}
                  onPublicar={() => {
                    setResultadoPublicacion(null);
                    setEditParaPublicar(edit);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Editor visual a pantalla COMPLETA (vista, no ventana emergente) */}
      {editEnEditor && (
        <div
          className="fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden bg-background"
          role="dialog"
          aria-modal="true"
          aria-label="Editor visual del video"
        >
          <EditorTimeline
            key={editEnEditor.id}
            edit={editEnEditor}
            onCerrar={() => setEditEnEditor(null)}
            onRerenderizado={alRerenderizar}
          />
        </div>
      )}

      {/* Modal de publicación: el caption se escribe dentro del modal */}
      {editParaPublicar?.output_url && (
        <ModalPublicar
          key={editParaPublicar.id}
          abierto
          nombreVideo={video.name}
          caption=""
          hashtags={[]}
          videoId={video.id}
          videoUrl={editParaPublicar.output_url}
          onCancelar={() => setEditParaPublicar(null)}
          onPublicado={(resultado) => {
            setResultadoPublicacion(resultado);
            setEditParaPublicar(null);
          }}
        />
      )}
    </div>
  );
}
