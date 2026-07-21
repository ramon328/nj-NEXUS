"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VideoAsset } from "@/lib/types";
import VideoGrid from "@/components/VideoGrid";
import DrawerVideo from "@/components/DrawerVideo";
import PanelProyectos from "@/components/PanelProyectos";
import PanelPosts from "@/components/PanelPosts";
import PanelEstrategia from "@/components/PanelEstrategia";
import PanelAjustes from "@/components/PanelAjustes";
import BadgeMotor from "@/components/BadgeMotor";
import Spinner from "@/components/Spinner";
import { mensajeDeError } from "@/components/formato";

interface Toast {
  tipo: "exito" | "error";
  mensaje: string;
}

// Pestañas del dashboard: la biblioteca clásica de videos, los proyectos
// (multimedia agrupado que la IA edita en conjunto) y las herramientas de
// estrategia de marketing.
type Pestana = "videos" | "proyectos" | "post" | "estrategia" | "ajustes";

function BotonPestana({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activa ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        activa
          ? "border-acento text-foreground"
          : "border-transparent text-tenue hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// Estado vacío cuando aún no hay videos sincronizados.
function EstadoVacio({
  onSincronizar,
  sincronizando,
}: {
  onSincronizar: () => void;
  sincronizando: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-borde bg-surface/70 px-8 py-14 text-center shadow-xl shadow-black/30">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-acento/40 bg-acento/10">
        <svg
          className="h-8 w-8 text-acento-2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" />
          <path d="M11 10.5v4l3.5-2-3.5-2z" fill="currentColor" />
        </svg>
      </div>
      <h2 className="mt-5 text-xl font-semibold text-foreground">
        Aún no hay videos
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-tenue">
        Para empezar, configura las credenciales de Google Drive en{" "}
        <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-acento-2">
          .env.local
        </code>
        , comparte la carpeta de videos con la cuenta de servicio y pulsa{" "}
        <span className="font-medium text-foreground">Sincronizar Drive</span>.
      </p>
      <button
        type="button"
        onClick={onSincronizar}
        disabled={sincronizando}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sincronizando && <Spinner />}
        {sincronizando ? "Sincronizando..." : "Sincronizar Drive"}
      </button>
    </div>
  );
}

// Esqueleto de carga con tarjetas fantasma.
function EsqueletoGrid() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-borde bg-surface"
        >
          <div className="aspect-video bg-surface-2" />
          <div className="flex items-center justify-between gap-2 p-3">
            <div className="h-4 w-2/3 rounded bg-surface-2" />
            <div className="h-4 w-14 rounded-full bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [pestana, setPestana] = useState<Pestana>("videos");
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [seleccionado, setSeleccionado] = useState<VideoAsset | null>(null);
  const temporizadorToast = useRef<number | null>(null);

  const mostrarToast = useCallback((t: Toast) => {
    if (temporizadorToast.current) {
      window.clearTimeout(temporizadorToast.current);
    }
    setToast(t);
    temporizadorToast.current = window.setTimeout(() => setToast(null), 4500);
  }, []);

  const cargarVideos = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/videos");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo cargar la lista de videos");
      }
      const lista = (data?.videos ?? []) as VideoAsset[];
      setVideos(lista);
      // Mantener actualizado el video abierto en el drawer
      setSeleccionado((prev) =>
        prev ? (lista.find((v) => v.id === prev.id) ?? prev) : prev
      );
    } catch (e) {
      setError(mensajeDeError(e, "Error inesperado al cargar los videos"));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial de datos al montar; "cargando" ya arranca en true, así
    // que el setState síncrono que detecta la regla es un no-op en el montaje.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial
    void cargarVideos();
  }, [cargarVideos]);

  // Abrir la pestaña indicada por ?tab= al montar (p. ej. al volver del OAuth de
  // Instagram, que redirige a /?tab=ajustes&ajustes=ig_ok).
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    const validas = ["videos", "proyectos", "post", "estrategia", "ajustes"];
    if (tab && validas.includes(tab)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deep-link por URL
      setPestana(tab as Pestana);
    }
  }, []);

  const handleBorrarVideo = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error ?? "No se pudo borrar el video");
        }
        // Quitar el video del estado local.
        setVideos((prev) => prev.filter((v) => v.id !== id));
        // Cerrar el drawer si el video borrado estaba abierto.
        setSeleccionado((prev) => (prev?.id === id ? null : prev));
        mostrarToast({ tipo: "exito", mensaje: "Video borrado" });
      } catch (e) {
        mostrarToast({
          tipo: "error",
          mensaje: mensajeDeError(e, "Error inesperado al borrar el video"),
        });
        // Relanzar para que la tarjeta no cierre su confirmación como si
        // hubiera tenido éxito (aunque igual libera su spinner en el finally).
        throw e;
      }
    },
    [mostrarToast]
  );

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      const res = await fetch("/api/drive/sync", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "La sincronización con Drive falló");
      }
      // La API puede reportar la cantidad con distintos nombres de campo
      const cantidad = [
        data?.synced,
        data?.sincronizados,
        data?.count,
        data?.total,
      ].find((n: unknown): n is number => typeof n === "number");
      mostrarToast({
        tipo: "exito",
        mensaje:
          cantidad != null
            ? `Se sincronizaron ${cantidad} ${cantidad === 1 ? "video" : "videos"} desde Drive`
            : "Sincronización con Drive completada",
      });
      await cargarVideos(true);
    } catch (e) {
      mostrarToast({
        tipo: "error",
        mensaje: mensajeDeError(e, "Error inesperado al sincronizar"),
      });
    } finally {
      setSincronizando(false);
    }
  }, [cargarVideos, mostrarToast]);

  return (
    <div className="relative flex min-h-screen flex-1 flex-col">
      {/* Resplandores decorativos de fondo */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-acento/15 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-acento-2/10 blur-3xl" />
      </div>

      {/* Cabecera */}
      <header className="sticky top-0 z-30 border-b border-borde bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-acento to-acento-2 shadow-lg shadow-acento/30">
              <svg
                className="h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M10 8.5v7l6-3.5-6-3.5z" fill="currentColor" stroke="none" />
                <rect x="3" y="4" width="18" height="16" rx="3" />
              </svg>
            </span>
            <div>
              <h1 className="text-base font-semibold leading-tight text-foreground">
                Estudio de Contenido
              </h1>
              <p className="text-xs text-tenue">Drive + IA + Instagram</p>
            </div>
            <BadgeMotor />
          </div>
          {pestana === "videos" && (
            <button
              type="button"
              onClick={sincronizar}
              disabled={sincronizando}
              className="inline-flex items-center gap-2 rounded-xl border border-acento/50 bg-acento/10 px-4 py-2 text-sm font-medium text-violet-200 transition-colors hover:bg-acento/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sincronizando ? (
                <Spinner />
              ) : (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
                </svg>
              )}
              {sincronizando ? "Sincronizando..." : "Sincronizar Drive"}
            </button>
          )}
        </div>

        {/* Pestañas: Videos (biblioteca clásica) / Proyectos (nuevo) */}
        <nav
          aria-label="Secciones del estudio"
          className="mx-auto flex w-full max-w-7xl items-center gap-1 px-6"
        >
          <BotonPestana
            activa={pestana === "videos"}
            onClick={() => setPestana("videos")}
          >
            <span aria-hidden="true">🎬</span> Videos
          </BotonPestana>
          <BotonPestana
            activa={pestana === "proyectos"}
            onClick={() => setPestana("proyectos")}
          >
            <span aria-hidden="true">📁</span> Proyectos
          </BotonPestana>
          <BotonPestana
            activa={pestana === "post"}
            onClick={() => setPestana("post")}
          >
            <span aria-hidden="true">🖼️</span> Post
          </BotonPestana>
          <BotonPestana
            activa={pestana === "estrategia"}
            onClick={() => setPestana("estrategia")}
          >
            <span aria-hidden="true">🧠</span> Estrategia
          </BotonPestana>
          <BotonPestana
            activa={pestana === "ajustes"}
            onClick={() => setPestana("ajustes")}
          >
            <span aria-hidden="true">⚙️</span> Ajustes
          </BotonPestana>
        </nav>
      </header>

      {/* Contenido principal */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {pestana === "ajustes" ? (
          <PanelAjustes />
        ) : pestana === "estrategia" ? (
          <PanelEstrategia />
        ) : pestana === "post" ? (
          <PanelPosts />
        ) : pestana === "proyectos" ? (
          <PanelProyectos />
        ) : (
          <>
            {error && (
              <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => cargarVideos()}
                  className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1 text-xs font-medium transition-colors hover:bg-red-500/20"
                >
                  Reintentar
                </button>
              </div>
            )}

            {cargando ? (
              <EsqueletoGrid />
            ) : videos.length === 0 && !error ? (
              <EstadoVacio
                onSincronizar={sincronizar}
                sincronizando={sincronizando}
              />
            ) : (
              <>
                <p className="mb-5 text-sm text-tenue">
                  {videos.length} {videos.length === 1 ? "video" : "videos"} en
                  la biblioteca
                </p>
                <VideoGrid
                  videos={videos}
                  onSeleccionar={setSeleccionado}
                  onBorrarVideo={handleBorrarVideo}
                />
              </>
            )}
          </>
        )}
      </main>

      {/* Drawer del video seleccionado */}
      {seleccionado && (
        <DrawerVideo
          video={seleccionado}
          onCerrar={() => setSeleccionado(null)}
          onPublicado={() => void cargarVideos(true)}
        />
      )}

      {/* Toast de avisos */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border px-4 py-3 text-sm shadow-2xl shadow-black/50 backdrop-blur-md ${
            toast.tipo === "exito"
              ? "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
              : "border-red-500/40 bg-red-950/80 text-red-300"
          }`}
        >
          {toast.mensaje}
        </div>
      )}
    </div>
  );
}
