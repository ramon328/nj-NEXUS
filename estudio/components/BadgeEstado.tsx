import type { VideoStatus } from "@/lib/types";

// Colores por estado: nuevo=azul, procesando=ámbar, listo=verde, publicado=violeta.
const ESTILOS: Record<VideoStatus, string> = {
  nuevo: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  procesando: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  listo: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  publicado: "bg-violet-500/15 text-violet-300 border-violet-500/40",
};

const ETIQUETAS: Record<VideoStatus, string> = {
  nuevo: "Nuevo",
  procesando: "Procesando",
  listo: "Listo",
  publicado: "Publicado",
};

export default function BadgeEstado({ estado }: { estado: VideoStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${ESTILOS[estado]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {ETIQUETAS[estado]}
    </span>
  );
}
