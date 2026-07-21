import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { PILA_FUENTES, type SubtituloOverlay } from "../tipos";

const AMARILLO = "#FFE14D";

// Subtítulos quemados de nivel profesional: pastilla oscura redondeada en la
// franja inferior y, en modo karaoke, resaltado palabra por palabra en
// amarillo con un "pop" de escala al activarse. En modo clásico muestra el
// cue completo en blanco dentro de la misma pastilla.
export const Subtitulos: React.FC<{
  subtitulos: SubtituloOverlay[];
  estilo: "clasico" | "karaoke";
}> = ({ subtitulos, estilo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const cue = subtitulos.find((c) => t >= c.desde && t < c.hasta);
  if (!cue || !cue.texto.trim()) return null;

  const desdeF = Math.round(cue.desde * fps);
  const hastaF = Math.round(cue.hasta * fps);
  const local = frame - desdeF;

  // Entrada con micro-pop (0.15 s) y salida con fundido corto: la pastilla
  // nunca "parpadea" entre cues consecutivos porque los tiempos son contiguos.
  const pop = spring({
    frame: local,
    fps,
    config: { damping: 15, stiffness: 220, mass: 0.5 },
  });
  const opacidad = Math.min(
    interpolate(local, [0, 0.12 * fps], [0, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [hastaF - 0.15 * fps, hastaF], [1, 0], {
      extrapolateLeft: "clamp",
    })
  );

  const conKaraoke =
    estilo === "karaoke" && Array.isArray(cue.palabras) && cue.palabras.length > 0;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: "70%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 950,
          backgroundColor: "rgba(12, 12, 18, 0.72)",
          borderRadius: 28,
          padding: "22px 38px",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
          textAlign: "center",
          opacity: opacidad,
          transform: `scale(${0.94 + pop * 0.06})`,
          fontFamily: PILA_FUENTES,
          fontSize: 58,
          fontWeight: 800,
          lineHeight: 1.28,
          color: "#FFFFFF",
        }}
      >
        {conKaraoke ? (
          cue.palabras!.map((p, i) => {
            const activa = t >= p.desde && t < p.hasta;
            const dicha = t >= p.hasta;
            // Pop de la palabra activa: resorte corto desde su propio inicio.
            const resortePalabra = spring({
              frame: frame - Math.round(p.desde * fps),
              fps,
              config: { damping: 12, stiffness: 260, mass: 0.4 },
            });
            // Pop moderado: transform no ocupa layout, así que una escala
            // grande pisaría a las palabras vecinas.
            const escala = activa ? 1 + resortePalabra * 0.07 : 1;
            return (
              <span
                key={`${i}-${p.palabra}`}
                style={{
                  display: "inline-block",
                  marginRight: 22,
                  transformOrigin: "center bottom",
                  color: activa ? AMARILLO : "#FFFFFF",
                  opacity: activa || dicha ? 1 : 0.6,
                  transform: `scale(${escala})`,
                  textShadow: activa
                    ? `0 0 22px rgba(255, 225, 77, 0.75)`
                    : "0 2px 4px rgba(0,0,0,0.5)",
                }}
              >
                {p.palabra}
              </span>
            );
          })
        ) : (
          <span style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
            {cue.texto}
          </span>
        )}
      </div>
    </div>
  );
};
