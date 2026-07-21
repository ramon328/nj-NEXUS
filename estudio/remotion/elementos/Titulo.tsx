import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORES_CSS, PILA_FUENTES, type TextoOverlay } from "../tipos";

// Contorno de 8 direcciones vía text-shadow (equivalente al borderw de
// drawtext pero suave); Chrome no tiene un stroke exterior real.
function contorno(px: number, color: string): string {
  const d = px;
  return [
    `-${d}px -${d}px 0 ${color}`,
    `${d}px -${d}px 0 ${color}`,
    `-${d}px ${d}px 0 ${color}`,
    `${d}px ${d}px 0 ${color}`,
    `0 -${d}px 0 ${color}`,
    `0 ${d}px 0 ${color}`,
    `-${d}px 0 0 ${color}`,
    `${d}px 0 0 ${color}`,
  ].join(", ");
}

// Título/texto superpuesto animado de nivel broadcast: entra con un resorte
// (deslizamiento u opacidad según la animación pedida), se asienta y sale con
// un fundido corto. Estilos: caja (pastilla oscura), sombra dura tipo Canva,
// neón (halo del mismo color) o simple (contorno de contraste).
export const Titulo: React.FC<{ texto: TextoOverlay }> = ({ texto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const desdeF = Math.round(texto.desde * fps);
  const hastaF = Math.round(texto.hasta * fps);
  if (frame < desdeF || frame >= hastaF) return null;

  const local = frame - desdeF;
  const salidaF = 0.3 * fps;

  // Resorte de entrada (con un toque de rebote para que se sienta vivo).
  const resorte = spring({
    frame: local,
    fps,
    config: { damping: 13, stiffness: 130, mass: 0.7 },
  });

  // Opacidad: fade de entrada de 0.25 s y de salida de 0.3 s (salvo "ninguna").
  const sinAnimacion = texto.animacion === "ninguna";
  const opacidad = sinAnimacion
    ? 1
    : Math.min(
        interpolate(local, [0, 0.25 * fps], [0, 1], {
          extrapolateRight: "clamp",
        }),
        interpolate(frame, [hastaF - salidaF, hastaF], [1, 0], {
          extrapolateLeft: "clamp",
        })
      );

  let transform = "none";
  if (texto.animacion === "deslizar-arriba") {
    transform = `translateY(${(1 - resorte) * 110}px)`;
  } else if (texto.animacion === "deslizar-lado") {
    transform = `translateX(${(1 - resorte) * -130}px)`;
  } else if (texto.animacion === "fundido") {
    // Fundido con un asentamiento sutil de escala para no verse plano.
    transform = `scale(${0.9 + resorte * 0.1})`;
  }

  const color = COLORES_CSS[texto.color] ?? COLORES_CSS.blanco;
  const contraste = texto.color === "negro" ? "#FFFFFF" : "rgba(0,0,0,0.9)";

  const base: React.CSSProperties = {
    fontFamily: texto.familia ? `'${texto.familia}', ${PILA_FUENTES}` : PILA_FUENTES,
    fontSize: 74,
    fontWeight: 800,
    lineHeight: 1.18,
    textAlign: "center",
    color,
    letterSpacing: 0.5,
  };

  let caja: React.CSSProperties = {};
  if (texto.estilo === "caja") {
    caja = {
      backgroundColor: "rgba(8, 8, 12, 0.66)",
      borderRadius: 30,
      padding: "24px 46px",
      boxShadow: "0 10px 34px rgba(0, 0, 0, 0.35)",
      textShadow: "0 2px 6px rgba(0,0,0,0.45)",
    };
  } else if (texto.estilo === "sombra") {
    caja = { textShadow: "7px 7px 0 rgba(0, 0, 0, 0.8)" };
  } else if (texto.estilo === "neon") {
    caja = {
      color: texto.color === "negro" ? "#FFFFFF" : color,
      textShadow: `0 0 14px ${color}, 0 0 34px ${color}, 0 0 70px ${color}`,
    };
  } else {
    caja = { textShadow: contorno(4, contraste) };
  }

  // Franjas verticales: arriba (bajo la barra de progreso), centro y abajo
  // (encima de la franja de subtítulos, que vive en ~70-80%).
  const posicion: React.CSSProperties =
    texto.posicion === "arriba"
      ? { top: "10%" }
      : texto.posicion === "centro"
        ? { top: "50%", transform: "translateY(-50%)" }
        : { top: "82%" };

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        ...posicion,
      }}
    >
      <div
        style={{
          maxWidth: 920,
          opacity: opacidad,
          transform,
          ...base,
          ...caja,
        }}
      >
        {texto.texto}
      </div>
    </div>
  );
};
