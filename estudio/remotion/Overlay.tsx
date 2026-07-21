import React, { useEffect, useState } from "react";
import { AbsoluteFill, cancelRender, continueRender, delayRender } from "remotion";
import { BarraProgreso } from "./elementos/BarraProgreso";
import { Sticker } from "./elementos/Sticker";
import { Subtitulos } from "./elementos/Subtitulos";
import { Titulo } from "./elementos/Titulo";
import type { OverlayProps } from "./tipos";

// Capa de gráficos animados del video final. FONDO TRANSPARENTE: no se pinta
// ningún background, así el .mov ProRes 4444 conserva el canal alpha y se
// compone encima del video base con ffmpeg.
//
// Orden de apilado (de atrás hacia adelante): stickers → textos → subtítulos
// → barra de progreso.
export const Overlay: React.FC<OverlayProps> = ({
  barraProgreso,
  textos,
  subtitulos,
  subtitulosEstilo,
  stickers,
  fuentes,
}) => {
  // Cargar las fuentes @font-face (data URLs) ANTES de renderizar el frame:
  // delayRender bloquea la captura hasta que document.fonts las tenga.
  const [handle] = useState(() => delayRender("cargar fuentes del overlay"));
  useEffect(() => {
    let cancelado = false;
    Promise.all(
      (fuentes ?? []).map(async (f) => {
        const fuente = new FontFace(f.familia, `url(${f.dataUrl})`);
        await fuente.load();
        document.fonts.add(fuente);
      })
    )
      .then(() => {
        if (!cancelado) continueRender(handle);
      })
      .catch((err) => cancelRender(err));
    return () => {
      cancelado = true;
    };
  }, [fuentes, handle]);

  return (
    <AbsoluteFill>
      {(stickers ?? []).map((s, i) => (
        <Sticker key={`stk-${i}`} sticker={s} />
      ))}
      {(textos ?? []).map((t, i) => (
        <Titulo key={`txt-${i}`} texto={t} />
      ))}
      <Subtitulos subtitulos={subtitulos ?? []} estilo={subtitulosEstilo} />
      {barraProgreso ? <BarraProgreso /> : null}
    </AbsoluteFill>
  );
};
