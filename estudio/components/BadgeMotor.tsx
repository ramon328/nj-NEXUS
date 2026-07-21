"use client";

import { useEffect, useState } from "react";

// Chip de estado del motor de render en el header del Dashboard. Consulta
// GET /api/salud (sin auth) y muestra:
//   - "Motor local ✓" (verde): esta instancia renderiza con ffmpeg local.
//   - "Mac mini conectado ✓" (violeta): front en Vercel con backend alcanzable.
//   - "Motor no disponible ⚠️" (ámbar): sin ffmpeg local ni backend alcanzable.
// Tolerante: si /api/salud no existe aún (404) o la respuesta no se entiende,
// no muestra nada.

interface RespuestaSalud {
  ok?: boolean;
  modo?: "front-con-backend" | "motor-local";
  motor?: { ffmpeg?: boolean };
  backend?: { alcanzable?: boolean };
}

type Estado = "local" | "mini" | "sin-motor";

const ESTILOS: Record<Estado, { texto: string; clases: string }> = {
  local: {
    texto: "Motor local ✓",
    clases: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
  mini: {
    texto: "Mac mini conectado ✓",
    clases: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  },
  "sin-motor": {
    texto: "Motor no disponible ⚠️",
    clases: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
};

export default function BadgeMotor() {
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch("/api/salud", { cache: "no-store" });
        // La ruta puede no existir todavía en este despliegue: no mostrar nada.
        if (res.status === 404) return;
        if (!res.ok) {
          if (!cancelado) setEstado("sin-motor");
          return;
        }
        const datos = (await res.json()) as RespuestaSalud;
        if (cancelado) return;
        if (datos?.modo === "front-con-backend") {
          setEstado(datos.backend?.alcanzable ? "mini" : "sin-motor");
        } else if (datos?.modo === "motor-local") {
          setEstado(datos.motor?.ffmpeg ? "local" : "sin-motor");
        }
        // Respuesta con forma desconocida → no mostrar nada.
      } catch {
        // Red caída o similar: mejor no ensuciar el header con falsos negativos.
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  if (!estado) return null;
  const { texto, clases } = ESTILOS[estado];

  return (
    <span
      title="Estado del motor de render (/api/salud)"
      className={`hidden items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex ${clases}`}
    >
      {texto}
    </span>
  );
}
