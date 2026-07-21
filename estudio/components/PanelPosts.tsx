"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormatoPost, PostDiseno, Proyecto } from "@/lib/types";
import Spinner from "@/components/Spinner";
import VistaPost from "@/components/VistaPost";
import { mensajeDeError } from "@/components/formato";

// ---------------------------------------------------------------------------
// Apartado "Post": la IA DISEÑA posts (carruseles o imagen única) con las
// fotos del proyecto + elementos (textos, formas, stickers). Filosofía
// "diseño como JSON": la IA genera un PostDesignPlan y Remotion renderiza
// cada slide a PNG. Aquí: grid de posts + formulario de creación + polling
// mientras haya alguno procesando. Clic en tarjeta → VistaPost a pantalla
// completa.
// ---------------------------------------------------------------------------

// Metadatos de cada formato: proporción del lienzo e icono para la UI.
interface FormatoDef {
  valor: FormatoPost;
  etiqueta: string;
  icono: string;
  descripcion: string;
  // Relación de aspecto (ancho / alto) para las miniaturas.
  ratio: string; // clase de tailwind aspect-[...]
  medidas: string;
}

export const FORMATOS: readonly FormatoDef[] = [
  {
    valor: "cuadrado_1_1",
    etiqueta: "Cuadrado",
    icono: "⬜",
    descripcion: "Feed clásico de Instagram (1080×1080).",
    ratio: "aspect-square",
    medidas: "1080×1080",
  },
  {
    valor: "vertical_4_5",
    etiqueta: "Vertical",
    icono: "📱",
    descripcion: "Ocupa más pantalla en el feed (1080×1350).",
    ratio: "aspect-[4/5]",
    medidas: "1080×1350",
  },
  {
    valor: "historia_9_16",
    etiqueta: "Historia",
    icono: "📖",
    descripcion: "Pantalla completa para stories/reels (1080×1920).",
    ratio: "aspect-[9/16]",
    medidas: "1080×1920",
  },
];

export function defFormato(formato: FormatoPost): FormatoDef {
  return FORMATOS.find((f) => f.valor === formato) ?? FORMATOS[0];
}

// Proyecto mínimo para poblar el selector (GET /api/projects).
interface ProyectoLite extends Proyecto {
  assets_count?: { foto?: number };
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

// Badge de estado con spinner cuando está procesando.
function BadgeEstado({ status }: { status: PostDiseno["status"] }) {
  if (status === "procesando") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
        <Spinner className="h-3 w-3" /> Diseñando…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-300">
        ⚠ Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
      ✓ Listo
    </span>
  );
}

// Esqueleto de carga con tarjetas fantasma.
function EsqueletoPosts() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-borde bg-surface"
        >
          <div className="aspect-square bg-surface-2" />
          <div className="flex items-center justify-between gap-2 p-3">
            <div className="h-4 w-2/3 rounded bg-surface-2" />
            <div className="h-4 w-14 rounded-full bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulario de creación (inline, ocupa una tarjeta del grid o pantalla).
// ---------------------------------------------------------------------------

function FormularioCrear({
  proyectos,
  cargandoProyectos,
  creando,
  error,
  onCrear,
  onCancelar,
}: {
  proyectos: ProyectoLite[];
  cargandoProyectos: boolean;
  creando: boolean;
  error: string | null;
  onCrear: (datos: {
    projectId?: string;
    titulo: string;
    formato: FormatoPost;
    nSlides: number;
    instruccion: string;
  }) => void;
  onCancelar: () => void;
}) {
  const [projectId, setProjectId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [formato, setFormato] = useState<FormatoPost>("cuadrado_1_1");
  const [nSlides, setNSlides] = useState(5);
  const [instruccion, setInstruccion] = useState("");

  const claseCampo =
    "w-full rounded-xl border border-borde bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-tenue/60 focus:border-acento focus:outline-none focus:ring-1 focus:ring-acento";

  const puedeCrear = instruccion.trim().length > 0 && !creando;

  return (
    <div className="rounded-3xl border border-acento/50 bg-surface/70 p-6 shadow-xl shadow-black/20">
      <div className="mb-5 flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">
          🖼️
        </span>
        <h3 className="text-base font-semibold text-foreground">
          Crear post con IA
        </h3>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!puedeCrear) return;
          onCrear({
            projectId: projectId || undefined,
            titulo: titulo.trim(),
            formato,
            nSlides,
            instruccion: instruccion.trim(),
          });
        }}
        className="grid gap-5 lg:grid-cols-2"
      >
        {/* Proyecto: sus fotos son la materia prima */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-tenue">
            Proyecto (sus fotos son la materia prima)
          </span>
          {cargandoProyectos ? (
            <div className="flex items-center gap-2 rounded-xl border border-borde bg-background/40 px-3 py-2 text-sm text-tenue">
              <Spinner className="h-4 w-4" /> Cargando proyectos…
            </div>
          ) : (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={creando}
              className={claseCampo}
            >
              <option value="">Sin proyecto (solo texto y formas)</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                  {p.assets_count?.foto
                    ? ` (${p.assets_count.foto} fotos)`
                    : ""}
                </option>
              ))}
            </select>
          )}
          {!cargandoProyectos && proyectos.length === 0 && (
            <span className="text-[11px] text-tenue/70">
              No hay proyectos todavía. Puedes diseñar solo con texto y formas.
            </span>
          )}
        </label>

        {/* Título */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-tenue">
            Título (opcional)
          </span>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="ej. Promo Mustang azul"
            disabled={creando}
            className={claseCampo}
          />
        </label>

        {/* Formato con iconos */}
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <span className="text-xs font-medium text-tenue">Formato</span>
          <div className="flex flex-wrap gap-2">
            {FORMATOS.map((f) => {
              const activo = formato === f.valor;
              return (
                <button
                  key={f.valor}
                  type="button"
                  onClick={() => setFormato(f.valor)}
                  disabled={creando}
                  aria-pressed={activo}
                  title={f.descripcion}
                  className={`flex flex-1 min-w-[8rem] flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    activo
                      ? "border-acento bg-acento/15"
                      : "border-borde bg-background/60 hover:border-acento/50 hover:bg-surface-2"
                  }`}
                >
                  <span className="text-sm font-medium text-foreground">
                    <span aria-hidden="true">{f.icono}</span> {f.etiqueta}
                  </span>
                  <span className="text-[11px] text-tenue">{f.medidas}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nº de slides */}
        <label className="flex flex-col gap-1.5 lg:col-span-2">
          <span className="text-xs font-medium text-tenue">
            Número de slides:{" "}
            <span className="font-semibold text-foreground">{nSlides}</span>{" "}
            {nSlides === 1 ? "(imagen única)" : "(carrusel)"}
          </span>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={nSlides}
            onChange={(e) => setNSlides(Number(e.target.value))}
            disabled={creando}
            className="w-full accent-acento"
          />
          <div className="flex justify-between text-[10px] text-tenue/60">
            <span>1</span>
            <span>10</span>
          </div>
        </label>

        {/* Instrucción */}
        <label className="flex flex-col gap-1.5 lg:col-span-2">
          <span className="text-xs font-medium text-tenue">
            Instrucción para la IA
          </span>
          <textarea
            value={instruccion}
            onChange={(e) => setInstruccion(e.target.value)}
            placeholder="ej. carrusel de 5 slides promocionando el Mustang azul, moderno y llamativo, con precio y llamado a agendar prueba de manejo"
            rows={3}
            disabled={creando}
            className={`${claseCampo} resize-y`}
          />
        </label>

        {error && (
          <div className="lg:col-span-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-2 lg:col-span-2">
          <button
            type="submit"
            disabled={!puedeCrear}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creando ? <Spinner /> : <span aria-hidden="true">✨</span>}
            {creando ? "Enviando a la IA…" : "Diseñar post"}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            disabled={creando}
            className="rounded-xl border border-borde px-4 py-2.5 text-sm font-medium text-tenue transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de un post en el grid.
// ---------------------------------------------------------------------------

function TarjetaPost({
  post,
  onAbrir,
  onEliminar,
  eliminando,
}: {
  post: PostDiseno;
  onAbrir: () => void;
  onEliminar: () => void;
  eliminando: boolean;
}) {
  const def = defFormato(post.formato);
  const miniatura = post.slides_urls?.[0] ?? null;
  const nSlides = post.slides_urls?.length ?? 0;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir();
        }
      }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-borde bg-surface/70 transition-colors hover:border-acento/60 focus:outline-none focus:ring-1 focus:ring-acento"
    >
      {/* Miniatura del primer slide */}
      <div
        className={`relative w-full overflow-hidden bg-surface-2 ${def.ratio}`}
      >
        {miniatura ? (
          // eslint-disable-next-line @next/next/no-img-element -- PNG renderizado en Supabase Storage
          <img
            src={miniatura}
            alt={post.titulo || "Post"}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : post.status === "procesando" ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-tenue">
            <Spinner className="h-6 w-6" />
            <span className="text-xs">Diseñando…</span>
          </div>
        ) : post.status === "error" ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-4 text-center text-red-300">
            <span className="text-2xl">⚠</span>
            <span className="text-xs">No se pudo diseñar</span>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-tenue/50">
            🖼️
          </div>
        )}

        {/* Badge de nº de slides (carrusel) */}
        {nSlides > 1 && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
            <span aria-hidden="true">🗂</span> {nSlides}
          </span>
        )}

        {/* Botón eliminar (no abre la vista: detiene la propagación del clic) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEliminar();
          }}
          disabled={eliminando}
          aria-label="Borrar post"
          title="Borrar post"
          className="absolute left-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-sm text-white/90 opacity-0 backdrop-blur-sm transition-all hover:bg-red-600/80 focus:opacity-100 disabled:opacity-100 group-hover:opacity-100"
        >
          {eliminando ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <span aria-hidden="true">🗑</span>
          )}
        </button>
      </div>

      {/* Pie con datos */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold text-foreground">
            {post.titulo || "Post sin título"}
          </h3>
          <BadgeEstado status={post.status} />
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-tenue">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true">{def.icono}</span> {def.etiqueta}
            {nSlides > 0 && ` · ${nSlides} ${nSlides === 1 ? "slide" : "slides"}`}
          </span>
          <span>{formatearFecha(post.created_at)}</span>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Panel principal.
// ---------------------------------------------------------------------------

export default function PanelPosts() {
  // null = todavía no se cargó la lista por primera vez.
  const [posts, setPosts] = useState<PostDiseno[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Proyectos para poblar el selector del formulario.
  const [proyectos, setProyectos] = useState<ProyectoLite[]>([]);
  const [cargandoProyectos, setCargandoProyectos] = useState(true);

  // Formulario de creación.
  const [formAbierto, setFormAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Post abierto en la vista a pantalla completa.
  const [abierto, setAbierto] = useState<PostDiseno | null>(null);

  // Id del post que se está borrando desde su tarjeta (para el spinner).
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  const cargarPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudieron cargar los posts");
      }
      const lista = (data?.disenos ?? []) as PostDiseno[];
      setPosts(lista);
      // Mantener sincronizado el post abierto en la vista.
      setAbierto((prev) =>
        prev ? (lista.find((p) => p.id === prev.id) ?? prev) : prev
      );
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e, "Error inesperado al cargar los posts"));
      setPosts((prev) => prev ?? []);
    }
  }, []);

  const cargarProyectos = useCallback(async () => {
    setCargandoProyectos(true);
    try {
      const res = await fetch("/api/projects");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudieron cargar los proyectos");
      }
      setProyectos((data?.projects ?? []) as ProyectoLite[]);
    } catch {
      // El selector de proyectos es opcional: si falla, se puede diseñar
      // igual solo con texto y formas.
      setProyectos([]);
    } finally {
      setCargandoProyectos(false);
    }
  }, []);

  // Carga inicial (los setState ocurren tras el await del fetch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial
    void cargarPosts();
    void cargarProyectos();
  }, [cargarPosts, cargarProyectos]);

  const hayProcesando = (posts ?? []).some((p) => p.status === "procesando");

  // Sondeo cada 5 segundos MIENTRAS haya algún post procesando.
  const cargarPostsRef = useRef(cargarPosts);
  cargarPostsRef.current = cargarPosts;
  useEffect(() => {
    if (!hayProcesando) return;
    const id = window.setInterval(() => {
      void cargarPostsRef.current();
    }, 5000);
    return () => window.clearInterval(id);
  }, [hayProcesando]);

  // Crea un post (POST /api/posts → 202 { diseno }).
  const crearPost = useCallback(
    async (datos: {
      projectId?: string;
      titulo: string;
      formato: FormatoPost;
      nSlides: number;
      instruccion: string;
    }) => {
      setCreando(true);
      setErrorCrear(null);
      try {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: datos.projectId,
            titulo: datos.titulo || undefined,
            formato: datos.formato,
            nSlides: datos.nSlides,
            instruccion: datos.instruccion,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? "No se pudo crear el post");
        }
        const nuevo = data?.diseno as PostDiseno | undefined;
        if (nuevo) {
          // Aparece de inmediato como procesando; el sondeo lo actualiza.
          setPosts((prev) => [nuevo, ...(prev ?? [])]);
        } else {
          void cargarPosts();
        }
        setFormAbierto(false);
      } catch (e) {
        setErrorCrear(mensajeDeError(e, "Error inesperado al crear el post"));
      } finally {
        setCreando(false);
      }
    },
    [cargarPosts]
  );

  // Borra un post desde la vista (DELETE /api/posts/[id]).
  const handleBorrado = useCallback((id: string) => {
    setPosts((prev) => (prev ?? []).filter((p) => p.id !== id));
    setAbierto((prev) => (prev?.id === id ? null : prev));
  }, []);

  // Borra un post directamente desde su tarjeta del grid (con confirmación).
  const eliminarPost = useCallback(
    async (post: PostDiseno) => {
      if (borrandoId) return;
      const confirmar = window.confirm(
        `¿Borrar el post "${post.titulo || "sin título"}"? Se eliminarán sus imágenes. No se puede deshacer.`
      );
      if (!confirmar) return;
      setBorrandoId(post.id);
      setError(null);
      try {
        const res = await fetch(`/api/posts/${encodeURIComponent(post.id)}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error ?? "No se pudo borrar el post");
        }
        handleBorrado(post.id);
      } catch (e) {
        setError(mensajeDeError(e, "Error inesperado al borrar el post"));
      } finally {
        setBorrandoId(null);
      }
    },
    [borrandoId, handleBorrado]
  );

  // Un nuevo intento (regenerar) devuelve un nuevo diseño: se agrega arriba.
  const handleRegenerado = useCallback((nuevo: PostDiseno) => {
    setPosts((prev) => [nuevo, ...(prev ?? [])]);
    setAbierto(nuevo);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void cargarPosts()}
            className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1 text-xs font-medium transition-colors hover:bg-red-500/20"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Cabecera del panel + botón crear */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tenue">
          {posts === null
            ? "Cargando posts…"
            : `${posts.length} ${
                posts.length === 1 ? "post" : "posts"
              } · la IA diseña carruseles o imágenes únicas con las fotos del proyecto`}
        </p>
        {!formAbierto && (
          <button
            type="button"
            onClick={() => {
              setErrorCrear(null);
              setFormAbierto(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <span aria-hidden="true">➕</span> Crear post
          </button>
        )}
      </div>

      {/* Formulario de creación inline */}
      {formAbierto && (
        <FormularioCrear
          proyectos={proyectos}
          cargandoProyectos={cargandoProyectos}
          creando={creando}
          error={errorCrear}
          onCrear={(datos) => void crearPost(datos)}
          onCancelar={() => {
            setFormAbierto(false);
            setErrorCrear(null);
          }}
        />
      )}

      {/* Grid de posts */}
      {posts === null ? (
        <EsqueletoPosts />
      ) : posts.length === 0 ? (
        !formAbierto && (
          <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-borde bg-surface/70 px-8 py-14 text-center shadow-xl shadow-black/30">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-acento/40 bg-acento/10 text-3xl">
              🖼️
            </div>
            <h2 className="mt-5 text-xl font-semibold text-foreground">
              Aún no hay posts
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-tenue">
              La IA diseña carruseles e imágenes únicas usando las fotos de tus
              proyectos, más textos, formas y stickers. Empieza con{" "}
              <span className="font-medium text-foreground">➕ Crear post</span>.
            </p>
            <button
              type="button"
              onClick={() => {
                setErrorCrear(null);
                setFormAbierto(true);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <span aria-hidden="true">➕</span> Crear post
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => (
            <TarjetaPost
              key={post.id}
              post={post}
              onAbrir={() => setAbierto(post)}
              onEliminar={() => void eliminarPost(post)}
              eliminando={borrandoId === post.id}
            />
          ))}
        </div>
      )}

      {/* Vista del post A PANTALLA COMPLETA (no popup) */}
      {abierto && (
        <VistaPost
          key={abierto.id}
          post={abierto}
          onCerrar={() => setAbierto(null)}
          onBorrado={handleBorrado}
          onRegenerado={handleRegenerado}
        />
      )}
    </div>
  );
}
