import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

// Barra de progreso del reel, arriba del cuadro (estilo reels profesionales):
// pista blanca translúcida de borde a borde con relleno amarillo que avanza
// linealmente con el video. Sombra sutil para leerse sobre fondos claros.
export const BarraProgreso: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progreso =
    durationInFrames > 1 ? Math.min(1, frame / (durationInFrames - 1)) : 1;

  return (
    <div
      style={{
        position: "absolute",
        top: 44,
        left: 36,
        right: 36,
        height: 14,
        borderRadius: 999,
        backgroundColor: "rgba(255, 255, 255, 0.28)",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.35)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${progreso * 100}%`,
          height: "100%",
          borderRadius: 999,
          background: "linear-gradient(90deg, #FFC400 0%, #FFE14D 100%)",
          boxShadow: "0 0 10px rgba(255, 214, 0, 0.55)",
        }}
      />
    </div>
  );
};
