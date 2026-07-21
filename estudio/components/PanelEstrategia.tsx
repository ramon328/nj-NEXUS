"use client";

import { useCallback, useEffect, useState } from "react";
import type { Estrategia, HerramientaMarketing } from "@/lib/types";
import Spinner from "@/components/Spinner";
import { mensajeDeError } from "@/components/formato";

// Panel de las 5 herramientas de estrategia de marketing (pestaña Estrategia
// del Dashboard): formulario por herramienta → POST /api/marketing → muestra
// el resultado con formato propio y mantiene el historial (GET/DELETE).

interface CampoDef {
  clave: string;
  etiqueta: string;
  placeholder: string;
  requerido?: boolean;
  tipo?: "texto" | "numero" | "textarea";
}

interface HerramientaDef {
  id: HerramientaMarketing;
  emoji: string;
  nombre: string;
  descripcion: string;
  campos: CampoDef[];
}

const HERRAMIENTAS: HerramientaDef[] = [
  {
    id: "ideas",
    emoji: "💡",
    nombre: "Ideas de reels",
    descripcion: "Ideas concretas con gancho y formato, ordenadas por potencial viral.",
    campos: [
      { clave: "nicho", etiqueta: "Nicho o tema", placeholder: "ej. repostería casera en Santiago", requerido: true },
      { clave: "publico", etiqueta: "Público objetivo (opcional)", placeholder: "ej. mujeres 25-40 que quieren emprender" },
      { clave: "cantidad", etiqueta: "Cantidad (3-20)", placeholder: "10", tipo: "numero" },
    ],
  },
  {
    id: "copywriting",
    emoji: "✍️",
    nombre: "Copywriter",
    descripcion: "Hooks, captions, CTAs y hashtags listos para publicar.",
    campos: [
      { clave: "tema", etiqueta: "Tema del contenido", placeholder: "ej. 3 errores al empezar a invertir", requerido: true, tipo: "textarea" },
      { clave: "tono", etiqueta: "Tono (opcional)", placeholder: "ej. cercano y directo" },
      { clave: "plataforma", etiqueta: "Plataforma (opcional)", placeholder: "Instagram" },
    ],
  },
  {
    id: "guion_reel",
    emoji: "🎬",
    nombre: "Guion de reel",
    descripcion: "Guion escena por escena con timing, voz, textos y notas de edición.",
    campos: [
      { clave: "idea", etiqueta: "Idea del reel", placeholder: "ej. mostrar el antes/después de un logo", requerido: true, tipo: "textarea" },
      { clave: "duracion_objetivo", etiqueta: "Duración objetivo en segundos (10-180)", placeholder: "30", tipo: "numero" },
      { clave: "estilo", etiqueta: "Estilo (opcional)", placeholder: "ej. dinámico, con humor" },
    ],
  },
  {
    id: "calendario",
    emoji: "🗓️",
    nombre: "Calendario de contenido",
    descripcion: "Plan de publicación con pilares equilibrados e ideas por día.",
    campos: [
      { clave: "nicho", etiqueta: "Nicho o tema", placeholder: "ej. entrenamiento funcional", requerido: true },
      { clave: "dias", etiqueta: "Días del plan (7-60)", placeholder: "30", tipo: "numero" },
      { clave: "frecuencia", etiqueta: "Frecuencia (opcional)", placeholder: "1 publicación al día" },
    ],
  },
  {
    id: "lead_magnet",
    emoji: "🧲",
    nombre: "Lead magnets",
    descripcion: "3 conceptos de lead magnet con esquema, CTA de captura y post de promoción.",
    campos: [
      { clave: "negocio", etiqueta: "A qué se dedica el negocio", placeholder: "ej. asesoría nutricional online", requerido: true, tipo: "textarea" },
      { clave: "objetivo", etiqueta: "Objetivo (opcional)", placeholder: "ej. captar leads para el programa de 12 semanas" },
    ],
  },
];

// ---------- Piezas de presentación del resultado ----------

function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-borde bg-surface/70 p-4">
      {children}
    </div>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-acento/40 bg-acento/10 px-2.5 py-0.5 text-xs font-medium text-violet-200">
      {children}
    </span>
  );
}

function Subtitulo({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-tenue">
      {children}
    </h4>
  );
}

function listaDe<T>(valor: unknown): T[] {
  return Array.isArray(valor) ? (valor as T[]) : [];
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor : "";
}

// Render específico por herramienta (con fallback a JSON legible).
function VistaResultado({
  herramienta,
  resultado,
}: {
  herramienta: HerramientaMarketing;
  resultado: Record<string, unknown>;
}) {
  if (herramienta === "ideas") {
    const ideas = listaDe<Record<string, unknown>>(resultado.ideas);
    return (
      <div className="space-y-3">
        {ideas.map((idea, i) => (
          <Tarjeta key={i}>
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold text-foreground">
                {i + 1}. {texto(idea.titulo)}
              </h4>
              <Etiqueta>{texto(idea.formato)}</Etiqueta>
            </div>
            <p className="mt-2 text-sm italic text-acento-2">“{texto(idea.gancho)}”</p>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">
              {texto(idea.descripcion)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-tenue">
              Por qué funciona: {texto(idea.por_que_funciona)}
            </p>
          </Tarjeta>
        ))}
      </div>
    );
  }

  if (herramienta === "copywriting") {
    return (
      <div className="space-y-4">
        <Tarjeta>
          <Subtitulo>Hooks (primer 1.5 s)</Subtitulo>
          <ul className="list-inside list-disc space-y-1 text-sm text-foreground/90">
            {listaDe<string>(resultado.hooks).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta>
          <Subtitulo>Caption corta</Subtitulo>
          <p className="text-sm text-foreground/90">{texto(resultado.caption_corta)}</p>
        </Tarjeta>
        <Tarjeta>
          <Subtitulo>Caption larga</Subtitulo>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {texto(resultado.caption_larga)}
          </p>
        </Tarjeta>
        <Tarjeta>
          <Subtitulo>Llamados a la acción</Subtitulo>
          <ul className="list-inside list-disc space-y-1 text-sm text-foreground/90">
            {listaDe<string>(resultado.cta).map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta>
          <Subtitulo>Hashtags</Subtitulo>
          <div className="flex flex-wrap gap-1.5">
            {listaDe<string>(resultado.hashtags).map((h, i) => (
              <Etiqueta key={i}>{h}</Etiqueta>
            ))}
          </div>
        </Tarjeta>
      </div>
    );
  }

  if (herramienta === "guion_reel") {
    const gancho = (resultado.gancho ?? {}) as Record<string, unknown>;
    const escenas = listaDe<Record<string, unknown>>(resultado.escenas);
    return (
      <div className="space-y-4">
        <Tarjeta>
          <div className="flex items-start justify-between gap-3">
            <Subtitulo>Gancho ({String(gancho.segundos ?? "?")} s)</Subtitulo>
            <Etiqueta>{texto(resultado.musica_mood)}</Etiqueta>
          </div>
          <p className="text-sm font-semibold text-acento-2">
            En pantalla: {texto(gancho.texto_pantalla)}
          </p>
          <p className="mt-1 text-sm text-foreground/90">Voz: {texto(gancho.voz)}</p>
        </Tarjeta>
        {escenas.map((e, i) => (
          <Tarjeta key={i}>
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-sm font-semibold text-foreground">
                Escena {String(e.orden ?? i + 1)}
              </h4>
              <span className="text-xs text-tenue">
                {String(e.desde ?? "?")}s → {String(e.hasta ?? "?")}s
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground/90">Voz: {texto(e.voz)}</p>
            {texto(e.texto_pantalla) && (
              <p className="mt-1 text-sm text-acento-2">
                En pantalla: {texto(e.texto_pantalla)}
              </p>
            )}
            <p className="mt-1 text-xs text-tenue">
              Plano: {texto(e.plano_sugerido)}
              {texto(e.broll) ? ` · B-roll: ${texto(e.broll)}` : ""}
            </p>
          </Tarjeta>
        ))}
        <Tarjeta>
          <Subtitulo>CTA final</Subtitulo>
          <p className="text-sm text-foreground/90">{texto(resultado.cta_final)}</p>
        </Tarjeta>
        <Tarjeta>
          <Subtitulo>Notas de edición</Subtitulo>
          <ul className="list-inside list-disc space-y-1 text-sm text-foreground/90">
            {listaDe<string>(resultado.notas_edicion).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </Tarjeta>
      </div>
    );
  }

  if (herramienta === "calendario") {
    const pilares = listaDe<Record<string, unknown>>(resultado.pilares);
    const dias = listaDe<Record<string, unknown>>(resultado.calendario);
    return (
      <div className="space-y-4">
        <Tarjeta>
          <Subtitulo>Pilares de contenido</Subtitulo>
          <div className="space-y-2">
            {pilares.map((p, i) => (
              <div key={i} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <span className="font-semibold text-foreground">{texto(p.nombre)}</span>
                  <span className="text-tenue"> — {texto(p.proposito)}</span>
                </div>
                <Etiqueta>{String(p.porcentaje ?? "?")}%</Etiqueta>
              </div>
            ))}
          </div>
        </Tarjeta>
        <div className="space-y-2">
          {dias.map((d, i) => (
            <Tarjeta key={i}>
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">
                  Día {String(d.dia ?? i + 1)} · {texto(d.idea)}
                </h4>
                <div className="flex shrink-0 gap-1.5">
                  <Etiqueta>{texto(d.pilar)}</Etiqueta>
                  <Etiqueta>{texto(d.formato)}</Etiqueta>
                </div>
              </div>
              <p className="mt-1 text-sm italic text-acento-2">“{texto(d.gancho)}”</p>
            </Tarjeta>
          ))}
        </div>
      </div>
    );
  }

  if (herramienta === "lead_magnet") {
    const conceptos = listaDe<Record<string, unknown>>(resultado.conceptos);
    return (
      <div className="space-y-3">
        {conceptos.map((c, i) => (
          <Tarjeta key={i}>
            <div className="flex items-start justify-between gap-3">
              <h4 className="font-semibold text-foreground">
                {i + 1}. {texto(c.titulo)}
              </h4>
              <Etiqueta>{texto(c.formato)}</Etiqueta>
            </div>
            <p className="mt-2 text-sm text-foreground/90">Promesa: {texto(c.promesa)}</p>
            <div className="mt-2">
              <Subtitulo>Esquema</Subtitulo>
              <ul className="list-inside list-disc space-y-0.5 text-sm text-foreground/90">
                {listaDe<string>(c.contenido_esquema).map((s, j) => (
                  <li key={j}>{s}</li>
                ))}
              </ul>
            </div>
            <p className="mt-2 text-sm text-acento-2">CTA: {texto(c.cta_captura)}</p>
            <p className="mt-1 text-xs text-tenue">
              Post de promoción: {texto(c.post_promocion)}
            </p>
          </Tarjeta>
        ))}
      </div>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-2xl border border-borde bg-surface/70 p-4 text-xs text-foreground/90">
      {JSON.stringify(resultado, null, 2)}
    </pre>
  );
}

// ---------- Panel principal ----------

export default function PanelEstrategia() {
  const [herramienta, setHerramienta] = useState<HerramientaMarketing>("ideas");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actual, setActual] = useState<Estrategia | null>(null);
  const [historial, setHistorial] = useState<Estrategia[]>([]);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);

  const def = HERRAMIENTAS.find((h) => h.id === herramienta) ?? HERRAMIENTAS[0];

  const cargarHistorial = useCallback(async () => {
    setErrorHistorial(null);
    try {
      const res = await fetch("/api/marketing");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo cargar el historial");
      }
      setHistorial((data?.estrategias ?? []) as Estrategia[]);
    } catch (e) {
      setErrorHistorial(mensajeDeError(e, "Error inesperado al cargar el historial"));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial
    void cargarHistorial();
  }, [cargarHistorial]);

  const generar = useCallback(async () => {
    setGenerando(true);
    setError(null);
    try {
      const entrada: Record<string, unknown> = {};
      for (const campo of def.campos) {
        const crudo = (valores[campo.clave] ?? "").trim();
        if (!crudo) continue;
        entrada[campo.clave] = campo.tipo === "numero" ? Number(crudo) : crudo;
      }
      const res = await fetch("/api/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ herramienta, entrada }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.estrategia) {
        throw new Error(data?.error ?? "No se pudo generar la estrategia");
      }
      setActual(data.estrategia as Estrategia);
      void cargarHistorial();
    } catch (e) {
      setError(mensajeDeError(e, "Error inesperado generando la estrategia"));
    } finally {
      setGenerando(false);
    }
  }, [def, herramienta, valores, cargarHistorial]);

  const borrar = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/marketing?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error ?? "No se pudo borrar la estrategia");
        }
        setHistorial((prev) => prev.filter((e) => e.id !== id));
        setActual((prev) => (prev?.id === id ? null : prev));
      } catch (e) {
        setErrorHistorial(mensajeDeError(e, "Error inesperado al borrar"));
      }
    },
    []
  );

  const requeridosCompletos = def.campos
    .filter((c) => c.requerido)
    .every((c) => (valores[c.clave] ?? "").trim());

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Columna izquierda: herramientas + formulario + historial */}
      <div className="space-y-5">
        <div className="space-y-2">
          {HERRAMIENTAS.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                setHerramienta(h.id);
                setValores({});
                setError(null);
              }}
              aria-current={h.id === herramienta ? "true" : undefined}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                h.id === herramienta
                  ? "border-acento/60 bg-acento/10"
                  : "border-borde bg-surface/60 hover:border-acento/40"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">
                <span aria-hidden="true">{h.emoji}</span> {h.nombre}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-tenue">{h.descripcion}</p>
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!generando && requeridosCompletos) void generar();
          }}
          className="space-y-3 rounded-2xl border border-borde bg-surface/70 p-4"
        >
          {def.campos.map((campo) => (
            <label key={campo.clave} className="block">
              <span className="mb-1 block text-xs font-medium text-tenue">
                {campo.etiqueta}
              </span>
              {campo.tipo === "textarea" ? (
                <textarea
                  value={valores[campo.clave] ?? ""}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [campo.clave]: e.target.value }))
                  }
                  placeholder={campo.placeholder}
                  rows={3}
                  className="w-full rounded-xl border border-borde bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-tenue/60 focus:border-acento focus:outline-none"
                />
              ) : (
                <input
                  type={campo.tipo === "numero" ? "number" : "text"}
                  value={valores[campo.clave] ?? ""}
                  onChange={(e) =>
                    setValores((prev) => ({ ...prev, [campo.clave]: e.target.value }))
                  }
                  placeholder={campo.placeholder}
                  className="w-full rounded-xl border border-borde bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-tenue/60 focus:border-acento focus:outline-none"
                />
              )}
            </label>
          ))}
          <button
            type="submit"
            disabled={generando || !requeridosCompletos}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generando && <Spinner />}
            {generando ? "Generando con IA..." : "Generar"}
          </button>
          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </form>

        <div className="rounded-2xl border border-borde bg-surface/70 p-4">
          <Subtitulo>Historial</Subtitulo>
          {errorHistorial && (
            <p className="mb-2 text-xs text-red-300">{errorHistorial}</p>
          )}
          {historial.length === 0 && !errorHistorial ? (
            <p className="text-xs text-tenue">Aún no hay estrategias guardadas.</p>
          ) : (
            <ul className="space-y-1.5">
              {historial.map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActual(e);
                      setHerramienta(e.herramienta);
                    }}
                    className={`min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                      actual?.id === e.id
                        ? "bg-acento/15 text-foreground"
                        : "text-tenue hover:bg-surface-2 hover:text-foreground"
                    }`}
                    title={e.titulo}
                  >
                    {e.titulo}
                  </button>
                  <button
                    type="button"
                    onClick={() => void borrar(e.id)}
                    className="shrink-0 rounded-lg px-1.5 py-1 text-xs text-tenue transition-colors hover:bg-red-500/15 hover:text-red-300"
                    aria-label={`Borrar "${e.titulo}"`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Columna derecha: resultado */}
      <div>
        {generando ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-borde bg-surface/50 text-sm text-tenue">
            <Spinner />
            Generando {def.nombre.toLowerCase()} con IA…
          </div>
        ) : actual ? (
          <div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{actual.titulo}</h3>
                <p className="text-xs text-tenue">
                  {new Date(actual.created_at).toLocaleString("es-CL")}
                </p>
              </div>
            </div>
            <VistaResultado
              herramienta={actual.herramienta}
              resultado={actual.resultado}
            />
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-borde bg-surface/40 text-center text-sm text-tenue">
            <span className="text-2xl" aria-hidden="true">
              {def.emoji}
            </span>
            <p className="max-w-sm px-6">
              Completa el formulario y pulsa <b>Generar</b> para crear{" "}
              {def.nombre.toLowerCase()} con IA, o abre una estrategia del historial.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
