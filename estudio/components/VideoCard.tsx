"use client";

import { useState } from "react";
import type { VideoAsset } from "@/lib/types";
import BadgeEstado from "@/components/BadgeEstado";
import Spinner from "@/components/Spinner";
import { formatearDuracion } from "@/components/formato";

// Placeholder con ícono de película para videos sin miniatura.
function MiniaturaPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 via-surface to-surface">
      <svg
        className="h-10 w-10 text-tenue/60"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="2" y="4" width="20" height="16" rx="2.5" />
        <path d="M2 8h20M2 16h20M7 4v4M7 16v4M17 4v4M17 16v4" />
        <path d="M10.5 10.2v3.6l3.2-1.8-3.2-1.8z" fill="currentColor" />
      </svg>
    </div>
  );
}

// Ícono de basurero (SVG inline).
function IconoBasurero({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export default function VideoCard({
  video,
  onClick,
  onBorrar,
}: {
  video: VideoAsset;
  onClick: () => void;
  // Devuelve una promesa para que la tarjeta pueda mostrar estado de carga.
  onBorrar?: (id: string) => void | Promise<void>;
}) {
  const [imagenRota, setImagenRota] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const sinMiniatura = !video.thumbnail_url || imagenRota;

  async function confirmarBorrado() {
    if (!onBorrar) return;
    setBorrando(true);
    try {
      await onBorrar(video.id);
      // Si el borrado tuvo éxito, el padre suele desmontar esta tarjeta; si
      // no lo hace, cerramos el mini-modal igualmente.
      setConfirmando(false);
    } finally {
      setBorrando(false);
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-borde bg-surface shadow-lg shadow-black/30 transition-all duration-200 hover:-translate-y-0.5 hover:border-acento/50 hover:shadow-acento/10 focus-within:ring-2 focus-within:ring-acento">
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left focus:outline-none"
      >
        <div className="relative aspect-video overflow-hidden">
          {sinMiniatura ? (
            <MiniaturaPlaceholder />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- miniaturas remotas de Drive con dominio variable
            <img
              src={video.thumbnail_url as string}
              alt={`Miniatura de ${video.name}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
              onError={() => setImagenRota(true)}
            />
          )}
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-zinc-200 backdrop-blur-sm">
            {formatearDuracion(video.duration_seconds)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 p-3">
          <p
            className="truncate text-sm font-medium text-foreground"
            title={video.name}
          >
            {video.name}
          </p>
          <BadgeEstado estado={video.status} />
        </div>
      </button>

      {/* Botón de borrar (arriba-derecha). No abre el drawer. */}
      {onBorrar && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmando(true);
          }}
          disabled={borrando}
          aria-label={`Borrar ${video.name}`}
          title="Borrar video"
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-borde bg-black/60 text-zinc-200 opacity-0 backdrop-blur-sm transition-all hover:border-red-500/60 hover:bg-red-500/20 hover:text-red-300 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {borrando ? <Spinner /> : <IconoBasurero className="h-4 w-4" />}
        </button>
      )}

      {/* Mini-modal de confirmación sobre la propia tarjeta. */}
      {confirmando && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/90 p-4 text-center backdrop-blur-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium text-foreground">
            ¿Borrar este video y todo su contenido?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmando(false);
              }}
              disabled={borrando}
              className="rounded-lg border border-borde px-3 py-1.5 text-xs font-medium text-tenue transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void confirmarBorrado();
              }}
              disabled={borrando}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {borrando && <Spinner />}
              {borrando ? "Borrando..." : "Borrar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
