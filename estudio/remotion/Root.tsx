import React from "react";
import { Composition } from "remotion";
import { Overlay } from "./Overlay";
import {
  ANCHO_LIENZO,
  calcularMetadataPostSlide,
  PostSlide,
  type PostSlideProps,
} from "./PostSlide";
import {
  OVERLAY_ALTO,
  OVERLAY_ANCHO,
  OVERLAY_FPS,
  type OverlayProps,
} from "./tipos";

const PROPS_DEFECTO: OverlayProps = {
  duracion: 10,
  barraProgreso: false,
  textos: [],
  subtitulos: [],
  subtitulosEstilo: "clasico",
  stickers: [],
  fuentes: [],
};

// Slide de ejemplo para el default de la composición "PostSlide".
const POST_SLIDE_DEFECTO: PostSlideProps = {
  formato: "cuadrado_1_1",
  urlsPorAsset: {},
  slide: {
    fondo: { tipo: "color", color: "#111111" },
    bloques: [],
  },
};

// La composición "Overlay": 1080x1920 a 30 fps con FONDO TRANSPARENTE (ningún
// componente pinta un fondo a pantalla completa). La duración real llega en
// props.duracion y calculateMetadata la traduce a frames.
export const Root: React.FC = () => {
  return (
    <>
    <Composition
      id="Overlay"
      component={Overlay}
      width={OVERLAY_ANCHO}
      height={OVERLAY_ALTO}
      fps={OVERLAY_FPS}
      durationInFrames={10 * OVERLAY_FPS}
      defaultProps={PROPS_DEFECTO}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.max(
          1,
          Math.round((props.duracion || 1) * OVERLAY_FPS)
        ),
      })}
    />
    {/*
      La composición "PostSlide": renderiza UN slide de un post a PNG. El ancho
      es siempre 1080 y el alto lo fija calculateMetadata según props.formato
      (1080/1350/1920). Es una imagen estática (1 frame): se captura con
      renderStill desde lib/renderPost.ts.
    */}
    <Composition
      id="PostSlide"
      component={PostSlide}
      width={ANCHO_LIENZO}
      height={1080}
      fps={30}
      durationInFrames={1}
      defaultProps={POST_SLIDE_DEFECTO}
      calculateMetadata={calcularMetadataPostSlide}
    />
    </>
  );
};
