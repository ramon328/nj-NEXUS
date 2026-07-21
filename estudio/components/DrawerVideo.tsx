"use client";

import { useEffect, useState } from "react";
import type { VideoAsset } from "@/lib/types";
import BadgeEstado from "@/components/BadgeEstado";
import PanelContenido from "@/components/PanelContenido";
import PanelEdicion from "@/components/PanelEdicion";
import PanelEditarIA from "@/components/PanelEditarIA";
import { formatearDuracion } from "@/components/formato";

type Pestana = "contenido" | "edicion" | "editar-ia";

// Panel lateral (drawer) con las pestañas "Contenido", "Plan de edición"
// y "Editar con IA".
export default function DrawerVideo({
  video,
  onCerrar,
  onPublicado,
}: {
  video: VideoAsset;
  onCerrar: () => void;
  onPublicado?: () => void;
}) {
  const [pestana, setPestana] = useState<Pestana>("contenido");

  // Cerrar con la tecla Escape
  useEffect(() => {
    function alPresionarTecla(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alPresionarTecla);
    return () => window.removeEventListener("keydown", alPresionarTecla);
  }, [onCerrar]);

  const clasePestana = (activa: boolean) =>
    `flex-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
      activa
        ? "bg-acento/20 text-violet-200 border border-acento/50"
        : "border border-transparent text-tenue hover:bg-surface-2 hover:text-foreground"
    }`;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
      {/* Fondo oscurecido */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCerrar}
        aria-hidden="true"
      />

      {/* Panel lateral */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-borde bg-surface shadow-2xl shadow-black/60">
        {/* Cabecera */}
        <header className="flex items-start justify-between gap-3 border-b border-borde p-5">
          <div className="min-w-0">
            <h2
              className="truncate text-lg font-semibold text-foreground"
              title={video.name}
            >
              {video.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-tenue">
              <BadgeEstado estado={video.status} />
              <span className="font-mono">
                {formatearDuracion(video.duration_seconds)}
              </span>
              {video.web_view_link && (
                <a
                  href={video.web_view_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-acento-2 underline-offset-2 hover:underline"
                >
                  Ver en Drive
                </a>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar panel"
            className="rounded-lg p-1.5 text-tenue transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Pestañas */}
        <nav className="flex gap-2 border-b border-borde p-3">
          <button
            type="button"
            onClick={() => setPestana("contenido")}
            className={clasePestana(pestana === "contenido")}
          >
            Contenido
          </button>
          <button
            type="button"
            onClick={() => setPestana("edicion")}
            className={clasePestana(pestana === "edicion")}
          >
            Plan de edición
          </button>
          <button
            type="button"
            onClick={() => setPestana("editar-ia")}
            className={clasePestana(pestana === "editar-ia")}
          >
            <span aria-hidden="true">🎬</span> Editar con IA
          </button>
        </nav>

        {/* Contenido de las pestañas: ambas quedan montadas para no perder el estado */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className={pestana === "contenido" ? "" : "hidden"}>
            <PanelContenido video={video} onPublicado={onPublicado} />
          </div>
          <div className={pestana === "edicion" ? "" : "hidden"}>
            <PanelEdicion video={video} />
          </div>
          <div className={pestana === "editar-ia" ? "" : "hidden"}>
            <PanelEditarIA video={video} />
          </div>
        </div>
      </aside>
    </div>
  );
}
