import React from "react";
import {
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { OVERLAY_ANCHO, type StickerOverlay } from "../tipos";

// Posiciones equivalentes a POSICIONES_STICKER de lib/ffmpeg.ts (margen 44 px,
// esquivando las franjas de textos y subtítulos).
function estiloPosicion(
  posicion: StickerOverlay["posicion"]
): React.CSSProperties {
  switch (posicion) {
    case "arriba-izquierda":
      return { left: 44, top: 170 };
    case "arriba-derecha":
      return { right: 44, top: 170 };
    case "abajo-izquierda":
      return { left: 44, bottom: 190 };
    case "abajo-derecha":
      return { right: 44, bottom: 190 };
    case "centro":
    default:
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
  }
}

// Sticker PNG animado: "pop" entra con rebote de resorte (escala 0.3 → 1 con
// overshoot), "fundido" aparece con fade + asentamiento suave, "ninguna" va
// tal cual. Todos salen con un fundido corto.
export const Sticker: React.FC<{ sticker: StickerOverlay }> = ({ sticker }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const desdeF = Math.round(sticker.desde * fps);
  const hastaF = Math.round(sticker.hasta * fps);
  if (frame < desdeF || frame >= hastaF) return null;

  const local = frame - desdeF;
  const ancho = Math.max(
    24,
    Math.round(OVERLAY_ANCHO * Math.min(0.35, Math.max(0.1, sticker.escala || 0.2)))
  );

  let escala = 1;
  let opacidad = 1;
  if (sticker.animacion === "pop") {
    const resorte = spring({
      frame: local,
      fps,
      config: { damping: 9, stiffness: 170, mass: 0.6 },
    });
    escala = 0.3 + resorte * 0.7;
    opacidad = interpolate(local, [0, 0.12 * fps], [0, 1], {
      extrapolateRight: "clamp",
    });
  } else if (sticker.animacion === "fundido") {
    const resorte = spring({
      frame: local,
      fps,
      config: { damping: 16, stiffness: 140, mass: 0.6 },
    });
    escala = 0.85 + resorte * 0.15;
    opacidad = interpolate(local, [0, 0.3 * fps], [0, 1], {
      extrapolateRight: "clamp",
    });
  }
  if (sticker.animacion !== "ninguna") {
    opacidad = Math.min(
      opacidad,
      interpolate(frame, [hastaF - 0.25 * fps, hastaF], [1, 0], {
        extrapolateLeft: "clamp",
      })
    );
  }

  const posicion = estiloPosicion(sticker.posicion);
  // En "centro" la posición ya usa transform: combinar con la escala.
  const transformBase =
    typeof posicion.transform === "string" ? `${posicion.transform} ` : "";

  return (
    <div
      style={{
        position: "absolute",
        ...posicion,
        opacity: opacidad,
        transform: `${transformBase}scale(${escala})`,
        filter: "drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35))",
      }}
    >
      <Img src={sticker.src} style={{ width: ancho, height: "auto" }} />
    </div>
  );
};
