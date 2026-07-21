"use client";

import { useCallback, useEffect, useState } from "react";
import type { Proyecto } from "@/lib/types";
import Spinner from "@/components/Spinner";
import VistaProyecto from "@/components/VistaProyecto";
import { mensajeDeError } from "@/components/formato";

// ---------------------------------------------------------------------------
// Tipos de la respuesta de GET /api/projects
// ---------------------------------------------------------------------------

// Conteo de assets por tipo que acompaña a cada proyecto en el listado.
export interface ConteoAssets {
  total: number;
  video: number;
  foto: number;
  audio: number;
  musica: number;
  sticker: number;
}

export interface ProyectoConConteo extends Proyecto {
  assets_count: ConteoAssets;
}

function conteoVacio(): ConteoAssets {
  return { total: 0, video: 0, foto: 0, audio: 0, musica: 0, sticker: 0 };
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

// Chips con iconito y cantidad por tipo de asset (solo los que tienen algo).
function ChipsConteo({ conteo }: { conteo: ConteoAssets }) {
  const chips = [
    { icono: "🎬", n: conteo.video, titulo: "Videos" },
    { icono: "🖼️", n: conteo.foto, titulo: "Fotos" },
    { icono: "🎵", n: conteo.musica, titulo: "Música" },
    { icono: "🎧", n: conteo.audio, titulo: "Audios" },
    { icono: "✨", n: conteo.sticker, titulo: "Stickers" },
  ].filter((c) => c.n > 0);

  if (chips.length === 0) {
    return <p className="text-xs italic text-tenue/70">Sin archivos todavía</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c.titulo}
          title={c.titulo}
          className="inline-flex items-center gap-1 rounded-full border border-acento/40 bg-acento/10 px-2 py-0.5 text-[11px] text-violet-200"
        >
          <span aria-hidden="true">{c.icono}</span> {c.n}
        </span>
      ))}
    </div>
  );
}

// Esqueleto de carga con tarjetas fantasma (mismo estilo que el de videos).
function EsqueletoProyectos() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-borde bg-surface p-5"
        >
          <div className="h-5 w-2/3 rounded bg-surface-2" />
          <div className="mt-3 h-4 w-full rounded bg-surface-2" />
          <div className="mt-4 flex gap-2">
            <div className="h-5 w-12 rounded-full bg-surface-2" />
            <div className="h-5 w-12 rounded-full bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel de proyectos: grid de tarjetas + creación inline + vista a pantalla
// completa del proyecto seleccionado.
// ---------------------------------------------------------------------------

export default function PanelProyectos() {
  // null = todavía no se cargó la lista por primera vez.
  const [proyectos, setProyectos] = useState<ProyectoConConteo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Formulario inline de creación.
  const [formAbierto, setFormAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Id del proyecto que se está borrando (para deshabilitar su botón).
  const [borrandoId, setBorrandoId] = useState<string | null>(null);

  // Proyecto abierto en la vista a pantalla completa.
  const [abierto, setAbierto] = useState<ProyectoConConteo | null>(null);

  const cargarProyectos = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudieron cargar los proyectos");
      }
      setProyectos((data?.projects ?? []) as ProyectoConConteo[]);
      setError(null);
    } catch (e) {
      setError(mensajeDeError(e, "Error inesperado al cargar los proyectos"));
      // Salir del estado inicial aunque falle, para no dejar el esqueleto.
      setProyectos((prev) => prev ?? []);
    }
  }, []);

  // Carga inicial al montar. El setState ocurre tras el await del fetch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial
    void cargarProyectos();
  }, [cargarProyectos]);

  // Crea el proyecto con el formulario inline.
  async function crearProyecto() {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setErrorCrear("Escribe un nombre para el proyecto");
      return;
    }
    setCreando(true);
    setErrorCrear(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreLimpio,
          descripcion: descripcion.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo crear el proyecto");
      }
      const nuevo = data?.project as Proyecto | undefined;
      if (nuevo) {
        setProyectos((prev) => [
          { ...nuevo, assets_count: conteoVacio() },
          ...(prev ?? []),
        ]);
      } else {
        void cargarProyectos();
      }
      setNombre("");
      setDescripcion("");
      setFormAbierto(false);
    } catch (e) {
      setErrorCrear(mensajeDeError(e, "Error inesperado al crear el proyecto"));
    } finally {
      setCreando(false);
    }
  }

  // Borra un proyecto (con confirmación): archivos + assets + ediciones.
  async function borrarProyecto(proyecto: ProyectoConConteo) {
    if (borrandoId) return;
    const confirmar = window.confirm(
      `¿Borrar el proyecto "${proyecto.nombre}"? Se eliminarán todos sus archivos y ediciones. No se puede deshacer.`
    );
    if (!confirmar) return;
    setBorrandoId(proyecto.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(proyecto.id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo borrar el proyecto");
      }
      setProyectos((prev) => (prev ?? []).filter((p) => p.id !== proyecto.id));
      setAbierto((prev) => (prev?.id === proyecto.id ? null : prev));
    } catch (e) {
      setError(mensajeDeError(e, "Error inesperado al borrar el proyecto"));
    } finally {
      setBorrandoId(null);
    }
  }

  const claseCampo =
    "w-full rounded-xl border border-borde bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-tenue/60 focus:border-acento focus:outline-none focus:ring-1 focus:ring-acento";

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void cargarProyectos()}
            className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1 text-xs font-medium transition-colors hover:bg-red-500/20"
          >
            Reintentar
          </button>
        </div>
      )}

      {proyectos === null ? (
        <EsqueletoProyectos />
      ) : (
        <>
          <p className="text-sm text-tenue">
            {proyectos.length}{" "}
            {proyectos.length === 1 ? "proyecto" : "proyectos"} · sube videos,
            fotos y música y deja que la IA edite un video con todo el material
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Tarjeta de creación: botón o formulario inline */}
            {formAbierto ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-acento/50 bg-surface/70 p-5">
                <h3 className="text-sm font-semibold text-foreground">
                  ➕ Nuevo proyecto
                </h3>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del proyecto"
                  disabled={creando}
                  className={claseCampo}
                  autoFocus
                />
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción (opcional)"
                  rows={2}
                  disabled={creando}
                  className={`${claseCampo} resize-y`}
                />
                {errorCrear && (
                  <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {errorCrear}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void crearProyecto()}
                    disabled={creando}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creando && <Spinner />}
                    {creando ? "Creando..." : "Crear"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormAbierto(false);
                      setErrorCrear(null);
                    }}
                    disabled={creando}
                    className="rounded-xl border border-borde px-4 py-2 text-sm font-medium text-tenue transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setFormAbierto(true)}
                className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-borde bg-surface/40 p-5 text-tenue transition-colors hover:border-acento/60 hover:bg-acento/5 hover:text-foreground"
              >
                <span aria-hidden="true" className="text-2xl">
                  ➕
                </span>
                <span className="text-sm font-medium">Crear proyecto</span>
              </button>
            )}

            {/* Tarjetas de proyectos */}
            {proyectos.map((proyecto) => (
              <article
                key={proyecto.id}
                role="button"
                tabIndex={0}
                onClick={() => setAbierto(proyecto)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setAbierto(proyecto);
                  }
                }}
                className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-borde bg-surface/70 p-5 transition-colors hover:border-acento/60 focus:outline-none focus:ring-1 focus:ring-acento"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="text-lg">
                      📁
                    </span>
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {proyecto.nombre}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void borrarProyecto(proyecto);
                    }}
                    disabled={borrandoId === proyecto.id}
                    title="Borrar proyecto"
                    aria-label={`Borrar el proyecto ${proyecto.nombre}`}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-borde text-tenue transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {borrandoId === proyecto.id ? (
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

                {proyecto.descripcion && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-tenue">
                    {proyecto.descripcion}
                  </p>
                )}

                <ChipsConteo conteo={proyecto.assets_count ?? conteoVacio()} />

                <p className="mt-auto text-[11px] text-tenue/70">
                  Creado el {formatearFecha(proyecto.created_at)}
                </p>
              </article>
            ))}
          </div>

          {proyectos.length === 0 && !formAbierto && (
            <p className="text-center text-sm text-tenue">
              Todavía no hay proyectos. Crea el primero con el botón{" "}
              <span className="font-medium text-foreground">
                ➕ Crear proyecto
              </span>
              .
            </p>
          )}
        </>
      )}

      {/* Vista del proyecto A PANTALLA COMPLETA (no popup) */}
      {abierto && (
        <VistaProyecto
          key={abierto.id}
          proyecto={abierto}
          onCerrar={() => {
            setAbierto(null);
            // Refresca los conteos de assets al volver al listado.
            void cargarProyectos();
          }}
        />
      )}
    </div>
  );
}
