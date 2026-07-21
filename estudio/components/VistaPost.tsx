"use client";

import { useCallback, useEffect, useState } from "react";
import type { PostDiseno } from "@/lib/types";
import Spinner from "@/components/Spinner";
import { defFormato } from "@/components/PanelPosts";
import { mensajeDeError } from "@/components/formato";

// ---------------------------------------------------------------------------
// Vista de un post A PANTALLA COMPLETA (fixed inset-0, no ventana emergente):
// carrusel grande de los slides con flechas ‹ › y puntos indicadores. Acciones:
// descargar todo (slide-1.png…), regenerar (nuevo intento con la misma config),
// borrar. Estados de carga (procesando) y error visibles.
// ---------------------------------------------------------------------------

// Descarga una URL como archivo con el nombre indicado. Se hace fetch → blob
// para forzar la descarga aunque la imagen sea de otro origen (Supabase).
async function descargarArchivo(url: string, nombre: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`No se pudo descargar (${res.status})`);
  }
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Da un respiro al navegador antes de revocar el object URL.
  setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
}

export default function VistaPost({
  post,
  onCerrar,
  onBorrado,
  onRegenerado,
}: {
  post: PostDiseno;
  onCerrar: () => void;
  onBorrado: (id: string) => void;
  onRegenerado: (nuevo: PostDiseno) => void;
}) {
  const def = defFormato(post.formato);
  const slides = post.slides_urls ?? [];
  const total = slides.length;

  const [indice, setIndice] = useState(0);
  const [descargando, setDescargando] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [aviso, setAviso] = useState<{
    tipo: "info" | "error";
    texto: string;
  } | null>(null);

  const procesando = post.status === "procesando";
  const conError = post.status === "error";

  // Acotar el índice si cambia el número de slides (p. ej. tras un refresh).
  useEffect(() => {
    setIndice((i) => Math.min(i, Math.max(0, total - 1)));
  }, [total]);

  const irA = useCallback(
    (nuevo: number) => {
      if (total === 0) return;
      setIndice(((nuevo % total) + total) % total);
    },
    [total]
  );

  // Navegación con teclado: ← → cambian de slide, Esc cierra.
  useEffect(() => {
    function alTecla(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCerrar();
      } else if (e.key === "ArrowRight") {
        irA(indice + 1);
      } else if (e.key === "ArrowLeft") {
        irA(indice - 1);
      }
    }
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [indice, irA, onCerrar]);

  // Descarga cada PNG del carrusel como slide-1.png, slide-2.png, …
  async function descargarTodo() {
    if (descargando || total === 0) return;
    setDescargando(true);
    setAviso(null);
    let fallos = 0;
    for (let i = 0; i < slides.length; i++) {
      try {
        await descargarArchivo(slides[i], `slide-${i + 1}.png`);
      } catch {
        fallos++;
      }
    }
    setDescargando(false);
    if (fallos > 0) {
      setAviso({
        tipo: "error",
        texto: `No se pudieron descargar ${fallos} de ${total} imágenes.`,
      });
    } else {
      setAviso({
        tipo: "info",
        texto:
          total === 1
            ? "Imagen descargada."
            : `${total} imágenes descargadas.`,
      });
    }
  }

  // Regenerar: re-dispara un nuevo diseño con la MISMA configuración
  // (POST /api/posts) → nuevo intento. El nuevo diseño llega como procesando.
  async function regenerar() {
    if (regenerando) return;
    setRegenerando(true);
    setAviso(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: post.project_id ?? undefined,
          titulo: post.titulo || undefined,
          formato: post.formato,
          nSlides: total > 0 ? total : undefined,
          instruccion: post.instruccion ?? undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo regenerar el post");
      }
      const nuevo = data?.diseno as PostDiseno | undefined;
      if (nuevo) {
        onRegenerado(nuevo);
      } else {
        setAviso({
          tipo: "info",
          texto: "Nuevo intento en marcha. Revísalo en la lista de posts.",
        });
      }
    } catch (e) {
      setAviso({
        tipo: "error",
        texto: mensajeDeError(e, "Error inesperado al regenerar el post"),
      });
    } finally {
      setRegenerando(false);
    }
  }

  // Borrar el post (DELETE /api/posts/[id]).
  async function borrar() {
    if (borrando) return;
    const confirmar = window.confirm(
      "¿Borrar este post? Se eliminarán todas sus imágenes. No se puede deshacer."
    );
    if (!confirmar) return;
    setBorrando(true);
    setAviso(null);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(post.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo borrar el post");
      }
      onBorrado(post.id);
    } catch (e) {
      setAviso({
        tipo: "error",
        texto: mensajeDeError(e, "Error inesperado al borrar el post"),
      });
      setBorrando(false);
    }
  }

  const claseBotonAccion =
    "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div
      className="fixed inset-0 z-40 flex h-full w-full flex-col overflow-hidden bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label={`Post ${post.titulo || "sin título"}`}
    >
      {/* Cabecera */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-borde bg-surface/80 px-6 py-4 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-acento to-acento-2 text-lg shadow-lg shadow-acento/30"
          >
            🖼️
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-tight text-foreground">
              {post.titulo || "Post sin título"}
            </h2>
            <p className="truncate text-xs text-tenue">
              <span aria-hidden="true">{def.icono}</span> {def.etiqueta} ·{" "}
              {def.medidas}
              {total > 0 &&
                ` · ${total} ${total === 1 ? "imagen" : "imágenes"}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-borde px-3 py-2 text-sm font-medium text-tenue transition-colors hover:bg-surface-2 hover:text-foreground"
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
      </header>

      {/* Cuerpo */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
          {/* Aviso de acciones (descarga/regenerar/borrar) */}
          {aviso && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                aviso.tipo === "error"
                  ? "border-red-500/40 bg-red-500/10 text-red-300"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {aviso.texto}
            </div>
          )}

          {/* Estado: procesando */}
          {procesando ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-3xl border border-borde bg-surface/40 text-center">
              <Spinner className="h-10 w-10 text-acento-2" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Diseñando tu post…
                </p>
                <p className="mt-1 max-w-md px-6 text-sm text-tenue">
                  La IA está componiendo el diseño y renderizando cada slide.
                  Esto puede tardar un poco; se actualizará solo.
                </p>
              </div>
            </div>
          ) : conError ? (
            /* Estado: error */
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-3xl border border-red-500/40 bg-red-500/5 px-6 text-center">
              <span className="text-4xl" aria-hidden="true">
                ⚠
              </span>
              <p className="text-lg font-semibold text-foreground">
                No se pudo diseñar el post
              </p>
              <p className="max-w-lg text-sm text-red-300">
                {post.error ?? "La IA no devolvió un diseño válido."}
              </p>
              <button
                type="button"
                onClick={() => void regenerar()}
                disabled={regenerando}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {regenerando ? <Spinner /> : <span aria-hidden="true">🔄</span>}
                {regenerando ? "Reintentando…" : "Reintentar"}
              </button>
            </div>
          ) : total === 0 ? (
            /* Completado pero sin imágenes (caso raro) */
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-borde bg-surface/40 text-center text-sm text-tenue">
              <span className="text-3xl" aria-hidden="true">
                🖼️
              </span>
              Este post no tiene imágenes renderizadas.
            </div>
          ) : (
            /* Carrusel de slides */
            <>
              <div className="flex flex-col items-center gap-4">
                <div className="relative flex w-full items-center justify-center">
                  {/* Flecha anterior */}
                  {total > 1 && (
                    <button
                      type="button"
                      onClick={() => irA(indice - 1)}
                      aria-label="Slide anterior"
                      className="absolute left-0 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-borde bg-surface/80 text-foreground backdrop-blur-md transition-colors hover:border-acento/60 hover:bg-acento/20 sm:-left-4"
                    >
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M15 6l-6 6 6 6" />
                      </svg>
                    </button>
                  )}

                  {/* Imagen del slide actual con su proporción real */}
                  <div
                    className={`relative w-full max-w-[min(100%,28rem)] overflow-hidden rounded-2xl border border-borde bg-black shadow-2xl shadow-black/50 ${def.ratio}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- PNG renderizado en Supabase Storage */}
                    <img
                      src={slides[indice]}
                      alt={`Slide ${indice + 1} de ${total}`}
                      className="h-full w-full object-contain"
                    />
                    {total > 1 && (
                      <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                        {indice + 1} / {total}
                      </span>
                    )}
                  </div>

                  {/* Flecha siguiente */}
                  {total > 1 && (
                    <button
                      type="button"
                      onClick={() => irA(indice + 1)}
                      aria-label="Slide siguiente"
                      className="absolute right-0 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-borde bg-surface/80 text-foreground backdrop-blur-md transition-colors hover:border-acento/60 hover:bg-acento/20 sm:-right-4"
                    >
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Puntos indicadores */}
                {total > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => irA(i)}
                        aria-label={`Ir al slide ${i + 1}`}
                        aria-current={i === indice ? "true" : undefined}
                        className={`h-2.5 rounded-full transition-all ${
                          i === indice
                            ? "w-6 bg-acento-2"
                            : "w-2.5 bg-tenue/40 hover:bg-tenue/70"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Tira de miniaturas (scroll horizontal tipo Instagram) */}
                {total > 1 && (
                  <div className="flex w-full gap-2 overflow-x-auto pb-2">
                    {slides.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => irA(i)}
                        aria-label={`Slide ${i + 1}`}
                        className={`relative shrink-0 overflow-hidden rounded-lg border transition-colors ${def.ratio} h-20 ${
                          i === indice
                            ? "border-acento"
                            : "border-borde opacity-70 hover:opacity-100"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura del carrusel */}
                        <img
                          src={url}
                          alt={`Miniatura del slide ${i + 1}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Barra de acciones (siempre visible salvo mientras procesa) */}
      {!procesando && (
        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-borde bg-surface/80 px-6 py-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void descargarTodo()}
              disabled={descargando || total === 0}
              className={`${claseBotonAccion} border-acento/50 bg-acento/10 text-violet-200 hover:bg-acento/20`}
            >
              {descargando ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <span aria-hidden="true">⬇️</span>
              )}
              {descargando ? "Descargando…" : "Descargar todo"}
            </button>
            <button
              type="button"
              onClick={() => void regenerar()}
              disabled={regenerando}
              className={`${claseBotonAccion} border-borde text-tenue hover:border-acento/50 hover:bg-surface-2 hover:text-foreground`}
            >
              {regenerando ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <span aria-hidden="true">🔄</span>
              )}
              {regenerando ? "Regenerando…" : "Regenerar"}
            </button>
            <button
              type="button"
              onClick={() => void borrar()}
              disabled={borrando}
              className={`${claseBotonAccion} border-borde text-tenue hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300`}
            >
              {borrando ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <span aria-hidden="true">🗑</span>
              )}
              {borrando ? "Borrando…" : "Borrar"}
            </button>
          </div>

          {/* Publicar en Instagram: deshabilitado, próximamente */}
          <button
            type="button"
            disabled
            title="Próximamente: falta conectar la cuenta de Instagram"
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-xl border border-borde bg-surface-2/40 px-3.5 py-2 text-sm font-medium text-tenue/60"
          >
            <span aria-hidden="true">📸</span> Publicar en Instagram
            <span className="ml-1 rounded-full border border-borde px-1.5 py-0.5 text-[10px] text-tenue/60">
              próximamente
            </span>
          </button>
        </footer>
      )}
    </div>
  );
}
