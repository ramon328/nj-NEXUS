"use client";

import { useState } from "react";
import type { EditPlan, VideoAsset } from "@/lib/types";
import Spinner from "@/components/Spinner";
import { formatearDuracion, mensajeDeError } from "@/components/formato";

// Pestaña "Plan de edición": genera con IA un plan de montaje escena por escena.
export default function PanelEdicion({ video }: { video: VideoAsset }) {
  const [objetivo, setObjetivo] = useState("");
  const [plan, setPlan] = useState<EditPlan | null>(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generarPlan() {
    setGenerando(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/edit-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          objetivo: objetivo.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo generar el plan de edición");
      }
      const nuevo = data?.generation?.content as EditPlan | undefined;
      if (!nuevo) throw new Error("La respuesta de la IA llegó vacía");
      setPlan(nuevo);
    } catch (e) {
      setError(mensajeDeError(e, "Error inesperado al generar el plan"));
    } finally {
      setGenerando(false);
    }
  }

  const escenas = plan
    ? [...plan.escenas].sort((a, b) => a.orden - b.orden)
    : [];

  return (
    <div className="flex flex-col gap-5">
      {/* Entrada para la IA */}
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-tenue">
          Objetivo (opcional)
          <input
            type="text"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            placeholder="Ej.: maximizar retención, presentar el producto, viralizar..."
            className="w-full rounded-xl border border-borde bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-tenue/60 focus:border-acento focus:outline-none focus:ring-1 focus:ring-acento"
            disabled={generando}
          />
        </label>
        <button
          type="button"
          onClick={generarPlan}
          disabled={generando}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generando ? <Spinner /> : (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          )}
          {generando ? "Generando plan..." : "Generar plan"}
        </button>
      </div>

      {/* Errores */}
      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Plan generado */}
      {plan && (
        <div className="flex flex-col gap-5 border-t border-borde pt-5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Resumen
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-foreground">
              {plan.resumen}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-borde bg-surface-2/60 p-3">
              <p className="text-xs text-tenue">Duración sugerida</p>
              <p className="mt-1 font-mono text-lg text-foreground">
                {formatearDuracion(plan.duracion_sugerida_segundos)}
              </p>
            </div>
            <div className="rounded-xl border border-borde bg-surface-2/60 p-3">
              <p className="text-xs text-tenue">Formato</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {plan.formato}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Hook inicial
            </h4>
            <p className="mt-1 rounded-xl border border-borde bg-surface-2/60 px-3 py-2 text-sm italic text-foreground">
              {plan.hook_inicial}
            </p>
          </div>

          {/* Timeline de escenas */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Timeline de escenas
            </h4>
            <ol className="mt-3 flex flex-col">
              {escenas.map((escena, i) => (
                <li key={escena.orden} className="relative flex gap-3 pb-5">
                  {/* Línea vertical del timeline */}
                  {i < escenas.length - 1 && (
                    <span
                      className="absolute left-[13px] top-7 h-full w-px bg-borde"
                      aria-hidden="true"
                    />
                  )}
                  <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-acento/50 bg-acento/15 text-xs font-semibold text-violet-200">
                    {escena.orden}
                  </span>
                  <div className="min-w-0 flex-1 rounded-xl border border-borde bg-surface-2/40 p-3">
                    <p className="font-mono text-xs text-acento-2">
                      {formatearDuracion(escena.desde_segundo)} —{" "}
                      {formatearDuracion(escena.hasta_segundo)}
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {escena.descripcion}
                    </p>
                    <p className="mt-1.5 text-xs italic text-tenue">
                      Transición: {escena.transicion}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Textos en pantalla
            </h4>
            <ul className="mt-2 flex flex-col gap-1.5">
              {plan.texto_en_pantalla.map((texto, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-acento-2" />
                  {texto}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-borde bg-surface-2/60 p-3">
            <p className="text-xs text-tenue">Música sugerida</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-foreground">
              <svg
                className="h-4 w-4 text-acento-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              {plan.musica_sugerida}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
