"use client";

import { useState } from "react";
import Spinner from "@/components/Spinner";
import { conNumeral, mensajeDeError } from "@/components/formato";

// Modal de confirmación previo a publicar en Instagram. Soporta dos modos:
// 1) Controlado por el padre (uso original de PanelContenido): el padre hace
//    el POST dentro de `onConfirmar` y maneja `publicando`.
// 2) Autónomo (nuevo, usado por PanelEditarIA): si se pasa `videoId`, el modal
//    hace el POST a /api/instagram/publish por sí mismo, con el caption
//    editable dentro del modal e incluyendo `videoUrl` en el body si viene
//    (para publicar un video ya editado con IA).
export default function ModalPublicar({
  abierto,
  nombreVideo,
  caption,
  hashtags,
  publicando = false,
  videoId,
  videoUrl,
  onConfirmar,
  onCancelar,
  onPublicado,
}: {
  abierto: boolean;
  nombreVideo: string;
  caption: string;
  hashtags: string[];
  publicando?: boolean;
  // Modo autónomo: id del video a publicar (el modal hace el POST).
  videoId?: string;
  // URL pública del video ya editado; si viene se envía en el body del POST.
  videoUrl?: string;
  onConfirmar?: () => void;
  onCancelar: () => void;
  // Aviso al padre cuando la publicación autónoma termina bien.
  onPublicado?: (resultado: { ok: boolean; mensaje: string }) => void;
}) {
  // Estado interno solo para el modo autónomo.
  const [captionLocal, setCaptionLocal] = useState(caption);
  const [publicandoLocal, setPublicandoLocal] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  if (!abierto) return null;

  const modoAutonomo = Boolean(videoId);
  const ocupado = publicando || publicandoLocal;

  // Publica directamente desde el modal (modo autónomo).
  async function publicarDirecto() {
    if (!videoId) return;
    setPublicandoLocal(true);
    setErrorLocal(null);
    try {
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          caption: captionLocal,
          hashtags,
          // Solo se incluye si hay un video editado que publicar.
          ...(videoUrl ? { videoUrl } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo publicar en Instagram");
      }
      onPublicado?.({
        ok: true,
        mensaje: "El video se publicó en Instagram correctamente.",
      });
    } catch (e) {
      setErrorLocal(mensajeDeError(e, "Error inesperado al publicar"));
    } finally {
      setPublicandoLocal(false);
    }
  }

  function confirmar() {
    if (modoAutonomo) void publicarDirecto();
    else onConfirmar?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar publicación en Instagram"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={ocupado ? undefined : onCancelar}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-borde bg-surface p-6 shadow-2xl shadow-black/50">
        <h3 className="text-lg font-semibold text-foreground">
          ¿Publicar en Instagram?
        </h3>
        <p className="mt-1 text-sm text-tenue">
          Se publicará el video{" "}
          <span className="font-medium text-foreground">{nombreVideo}</span>{" "}
          con este contenido:
        </p>

        {modoAutonomo ? (
          // En modo autónomo el caption se escribe aquí mismo.
          <label className="mt-4 flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Caption
            </span>
            <textarea
              value={captionLocal}
              onChange={(e) => setCaptionLocal(e.target.value)}
              placeholder="Escribe el caption para Instagram..."
              rows={4}
              disabled={ocupado}
              className="w-full resize-y rounded-xl border border-borde bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-tenue/60 focus:border-acento focus:outline-none focus:ring-1 focus:ring-acento"
            />
          </label>
        ) : (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-borde bg-background/60 p-3">
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {caption || "(sin caption)"}
            </p>
            {hashtags.length > 0 && (
              <p className="mt-2 text-xs text-acento-2">
                {hashtags.map(conNumeral).join(" ")}
              </p>
            )}
          </div>
        )}

        {modoAutonomo && hashtags.length > 0 && (
          <p className="mt-2 text-xs text-acento-2">
            {hashtags.map(conNumeral).join(" ")}
          </p>
        )}

        {/* Error de la publicación autónoma */}
        {errorLocal && (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorLocal}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={ocupado}
            className="rounded-xl border border-borde px-4 py-2 text-sm font-medium text-tenue transition-colors hover:bg-surface-2 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={ocupado}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ocupado && <Spinner />}
            {ocupado ? "Publicando..." : "Sí, publicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
