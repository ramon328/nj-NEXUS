"use client";

import { useState } from "react";
import type { GeneratedContent, VideoAsset } from "@/lib/types";
import Spinner from "@/components/Spinner";
import ModalPublicar from "@/components/ModalPublicar";
import { conNumeral, mensajeDeError } from "@/components/formato";

// Pestaña "Contenido": genera caption/descr./hashtags con IA y publica en Instagram.
export default function PanelContenido({
  video,
  onPublicado,
}: {
  video: VideoAsset;
  onPublicado?: () => void;
}) {
  // Entradas opcionales para la IA
  const [tono, setTono] = useState("");
  const [instrucciones, setInstrucciones] = useState("");

  // Resultado de la generación (caption y descripción son editables)
  const [contenido, setContenido] = useState<GeneratedContent | null>(null);
  const [caption, setCaption] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  // Publicación en Instagram
  const [modalAbierto, setModalAbierto] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [resultadoPublicacion, setResultadoPublicacion] = useState<{
    ok: boolean;
    mensaje: string;
  } | null>(null);

  async function generar() {
    setGenerando(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          tono: tono.trim() || undefined,
          instrucciones: instrucciones.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo generar el contenido");
      }
      const nuevo = data?.generation?.content as GeneratedContent | undefined;
      if (!nuevo) throw new Error("La respuesta de la IA llegó vacía");
      setContenido(nuevo);
      setCaption(nuevo.caption ?? "");
      setDescripcion(nuevo.description ?? "");
      setResultadoPublicacion(null);
    } catch (e) {
      setError(mensajeDeError(e, "Error inesperado al generar el contenido"));
    } finally {
      setGenerando(false);
    }
  }

  async function copiarTodo() {
    if (!contenido) return;
    const texto = [
      `Hook: ${contenido.hook}`,
      "",
      caption,
      "",
      descripcion,
      "",
      contenido.hashtags.map(conNumeral).join(" "),
      "",
      `Llamado a la acción: ${contenido.call_to_action}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar al portapapeles");
    }
  }

  async function publicar() {
    if (!contenido) return;
    setPublicando(true);
    setResultadoPublicacion(null);
    try {
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          caption,
          hashtags: contenido.hashtags,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo publicar en Instagram");
      }
      setResultadoPublicacion({
        ok: true,
        mensaje: "El video se publicó en Instagram correctamente.",
      });
      onPublicado?.();
    } catch (e) {
      setResultadoPublicacion({
        ok: false,
        mensaje: mensajeDeError(e, "Error inesperado al publicar"),
      });
    } finally {
      setPublicando(false);
      setModalAbierto(false);
    }
  }

  const claseCampo =
    "w-full rounded-xl border border-borde bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-tenue/60 focus:border-acento focus:outline-none focus:ring-1 focus:ring-acento";

  return (
    <div className="flex flex-col gap-5">
      {/* Entradas para la IA */}
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-tenue">
          Tono (opcional)
          <input
            type="text"
            value={tono}
            onChange={(e) => setTono(e.target.value)}
            placeholder="Ej.: cercano y divertido, profesional, inspirador..."
            className={claseCampo}
            disabled={generando}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-tenue">
          Instrucciones (opcional)
          <textarea
            value={instrucciones}
            onChange={(e) => setInstrucciones(e.target.value)}
            placeholder="Detalles del video, público objetivo, qué destacar..."
            rows={3}
            className={`${claseCampo} resize-y`}
            disabled={generando}
          />
        </label>
        <button
          type="button"
          onClick={generar}
          disabled={generando}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generando ? <Spinner /> : <span aria-hidden="true">✨</span>}
          {generando ? "Generando..." : "Generar con IA"}
        </button>
      </div>

      {/* Errores */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Resultado */}
      {contenido && (
        <div className="flex flex-col gap-4 border-t border-borde pt-5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Hook
            </h4>
            <p className="mt-1 rounded-xl border border-borde bg-surface-2/60 px-3 py-2 text-sm italic text-foreground">
              {contenido.hook}
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Caption (editable)
            </span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={4}
              className={`${claseCampo} resize-y`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Descripción (editable)
            </span>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={5}
              className={`${claseCampo} resize-y`}
            />
          </label>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Hashtags
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {contenido.hashtags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-acento/40 bg-acento/10 px-2.5 py-1 text-xs text-violet-200"
                >
                  {conNumeral(tag)}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Llamado a la acción
            </h4>
            <p className="mt-1 text-sm text-foreground">
              {contenido.call_to_action}
            </p>
          </div>

          {/* Resultado de la publicación */}
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={copiarTodo}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-borde px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-acento/50 hover:bg-surface-2"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {copiado ? "¡Copiado!" : "Copiar todo"}
            </button>
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              disabled={publicando}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {publicando && <Spinner />}
              Publicar en Instagram
            </button>
          </div>
        </div>
      )}

      <ModalPublicar
        abierto={modalAbierto}
        nombreVideo={video.name}
        caption={caption}
        hashtags={contenido?.hashtags ?? []}
        publicando={publicando}
        onConfirmar={publicar}
        onCancelar={() => setModalAbierto(false)}
      />
    </div>
  );
}
