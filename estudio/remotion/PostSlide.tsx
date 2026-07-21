import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  Img,
  staticFile,
} from "remotion";
import type { BloquePost, FormatoPost, SlidePost } from "../lib/types";

// Composición "PostSlide": renderiza UN slide de un post (carrusel o imagen
// única) a un lienzo fijo de 1080 de ancho. La IA genera el diseño como JSON
// (SlidePost) con coordenadas en PORCENTAJE del lienzo, y aquí lo pintamos.
//
// - width siempre 1080; height depende del formato (calculateMetadata).
// - Las URLs de las imágenes/fondos llegan ya resueltas en `urlsPorAsset`
//   (Record<assetId, urlAbsoluta>): el servidor las prepara en lib/renderPost.
// - Las fuentes de public/fuentes se cargan con @font-face vía staticFile;
//   los stickers de biblioteca con staticFile("stickers/..."), y los subidos
//   al proyecto con su URL de `urlsPorAsset`.

// Alto del lienzo por formato (el ancho es siempre 1080).
const ALTO_POR_FORMATO: Record<FormatoPost, number> = {
  cuadrado_1_1: 1080,
  vertical_4_5: 1350,
  historia_9_16: 1920,
};

export const ANCHO_LIENZO = 1080;

export interface PostSlideProps extends Record<string, unknown> {
  slide: SlidePost;
  formato: FormatoPost;
  urlsPorAsset: Record<string, string>;
}

// Pila de fuentes de respaldo (por si la fuente pedida no cargara).
const PILA_SISTEMA =
  "'Helvetica Neue', 'Arial', 'Segoe UI', system-ui, sans-serif";

// Deriva un nombre de familia @font-face estable a partir del archivo de fuente.
function familiaDeArchivo(archivo: string): string {
  const base = archivo
    .split("/")
    .pop()!
    .replace(/\.[^.]+$/, "");
  return `PostFuente-${base}`;
}

// Reúne las fuentes usadas por los bloques de texto del slide.
function fuentesDelSlide(slide: SlidePost): string[] {
  const set = new Set<string>();
  for (const b of slide.bloques ?? []) {
    if (b.tipo === "texto" && b.fuente) set.add(b.fuente.split("/").pop()!);
  }
  return [...set];
}

// Traduce el peso del contrato a un valor CSS de fontWeight.
function pesoCss(peso: "normal" | "bold" | "black"): number | string {
  if (peso === "black") return 900;
  if (peso === "bold") return 700;
  return 400;
}

const ALINEACION_CSS: Record<
  "izquierda" | "centro" | "derecha",
  React.CSSProperties["textAlign"]
> = {
  izquierda: "left",
  centro: "center",
  derecha: "right",
};

// ------- Fondo del slide -------
const Fondo: React.FC<{
  fondo: SlidePost["fondo"];
  urlsPorAsset: Record<string, string>;
}> = ({ fondo, urlsPorAsset }) => {
  if (fondo?.tipo === "imagen" && fondo.asset_id && urlsPorAsset[fondo.asset_id]) {
    const overlay = typeof fondo.overlay === "number" ? fondo.overlay : 0;
    return (
      <>
        <AbsoluteFill>
          <Img
            src={urlsPorAsset[fondo.asset_id]}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
        {overlay > 0 ? (
          <AbsoluteFill
            style={{
              backgroundColor: `rgba(0,0,0,${Math.min(1, Math.max(0, overlay))})`,
            }}
          />
        ) : null}
      </>
    );
  }

  if (fondo?.tipo === "gradiente") {
    const c1 = fondo.color || "#111111";
    const c2 = fondo.color2 || fondo.color || "#333333";
    return (
      <AbsoluteFill
        style={{ backgroundImage: `linear-gradient(135deg, ${c1}, ${c2})` }}
      />
    );
  }

  // color (o respaldo): blanco por defecto.
  return (
    <AbsoluteFill style={{ backgroundColor: fondo?.color || "#FFFFFF" }} />
  );
};

// ------- Un bloque cualquiera del slide -------
const Bloque: React.FC<{
  bloque: BloquePost;
  urlsPorAsset: Record<string, string>;
}> = ({ bloque, urlsPorAsset }) => {
  if (bloque.tipo === "texto") {
    const familia = bloque.fuente
      ? `'${familiaDeArchivo(bloque.fuente)}', ${PILA_SISTEMA}`
      : PILA_SISTEMA;
    const peso = pesoCss(bloque.peso);
    // Títulos grandes → interlineado más ceñido; cuerpo → más aire.
    const grande = bloque.tamano >= 60;
    const lineHeight = grande ? 1.15 : 1.4;
    // Ligero tracking en textos en mayúsculas (se ve más pro en titulares).
    const enMayusculas =
      bloque.texto.length > 1 &&
      bloque.texto === bloque.texto.toUpperCase() &&
      /[A-ZÁÉÍÓÚÑ]/.test(bloque.texto);

    const caja = bloque.caja ?? null;
    const conCaja = Boolean(caja);

    return (
      <div
        style={{
          position: "absolute",
          left: `${bloque.x}%`,
          top: `${bloque.y}%`,
          width: `${bloque.ancho}%`,
          display: "flex",
          // Alinea la "pastilla" según la alineación del texto.
          justifyContent:
            bloque.alineacion === "izquierda"
              ? "flex-start"
              : bloque.alineacion === "derecha"
                ? "flex-end"
                : "center",
        }}
      >
        <div
          style={{
            fontFamily: familia,
            fontSize: bloque.tamano,
            fontWeight: peso,
            color: bloque.color,
            textAlign: ALINEACION_CSS[bloque.alineacion] ?? "left",
            lineHeight,
            letterSpacing: enMayusculas ? "0.02em" : "0",
            // Que el texto largo se ajuste sin desbordar el lienzo.
            width: "100%",
            wordBreak: "break-word",
            overflowWrap: "break-word",
            // Sombra sutil para legibilidad (más fuerte sin caja).
            textShadow: conCaja
              ? "0 1px 2px rgba(0,0,0,0.25)"
              : "0 2px 8px rgba(0,0,0,0.45)",
            // Pastilla opcional detrás del texto.
            ...(conCaja
              ? {
                  backgroundColor: caja!.color,
                  borderRadius: caja!.radio ?? 0,
                  padding: `${Math.round(bloque.tamano * 0.35)}px ${Math.round(
                    bloque.tamano * 0.55
                  )}px`,
                }
              : {}),
          }}
        >
          {bloque.texto}
        </div>
      </div>
    );
  }

  if (bloque.tipo === "imagen") {
    // sin_fondo: usa el recorte (PNG transparente) si está disponible; un recorte
    // se ve mejor con objectFit "contain" (no se recorta el sujeto) y sin overflow.
    const recorte =
      (bloque as { sin_fondo?: boolean }).sin_fondo &&
      urlsPorAsset[`cut:${bloque.asset_id}`];
    const src = recorte || urlsPorAsset[bloque.asset_id];
    if (!src) return null;
    return (
      <div
        style={{
          position: "absolute",
          left: `${bloque.x}%`,
          top: `${bloque.y}%`,
          width: `${bloque.ancho}%`,
          height: `${bloque.alto}%`,
          borderRadius: recorte ? 0 : bloque.radio ?? 0,
          overflow: recorte ? "visible" : "hidden",
        }}
      >
        <Img
          src={src}
          style={{
            width: "100%",
            height: "100%",
            objectFit: recorte || bloque.ajuste === "contener" ? "contain" : "cover",
          }}
        />
      </div>
    );
  }

  if (bloque.tipo === "forma") {
    const opacidad =
      typeof bloque.opacidad === "number" ? bloque.opacidad : 1;
    if (bloque.forma === "linea") {
      // Línea: un rectángulo fino (usa el alto tal cual, útil para reglas).
      return (
        <div
          style={{
            position: "absolute",
            left: `${bloque.x}%`,
            top: `${bloque.y}%`,
            width: `${bloque.ancho}%`,
            height: `${bloque.alto}%`,
            backgroundColor: bloque.color,
            opacity: opacidad,
            borderRadius: bloque.radio ?? 999,
          }}
        />
      );
    }
    const radio =
      bloque.forma === "circulo" ? "50%" : `${bloque.radio ?? 0}px`;
    return (
      <div
        style={{
          position: "absolute",
          left: `${bloque.x}%`,
          top: `${bloque.y}%`,
          width: `${bloque.ancho}%`,
          height: `${bloque.alto}%`,
          backgroundColor: bloque.color,
          opacity: opacidad,
          borderRadius: radio,
        }}
      />
    );
  }

  // sticker
  if (bloque.tipo === "sticker") {
    let src: string | null = null;
    if (bloque.asset_id && urlsPorAsset[bloque.asset_id]) {
      src = urlsPorAsset[bloque.asset_id];
    } else if (bloque.archivo) {
      src = staticFile(`stickers/${bloque.archivo.split("/").pop()}`);
    }
    if (!src) return null;
    // escala = % del ancho del lienzo (0.05–0.4) → ancho en px del lienzo.
    const escala = Math.min(0.4, Math.max(0.05, bloque.escala || 0.15));
    const anchoPx = Math.round(escala * ANCHO_LIENZO);
    return (
      <div
        style={{
          position: "absolute",
          left: `${bloque.x}%`,
          top: `${bloque.y}%`,
          width: anchoPx,
        }}
      >
        <Img src={src} style={{ width: anchoPx, height: "auto" }} />
      </div>
    );
  }

  return null;
};

export const PostSlide: React.FC<PostSlideProps> = ({
  slide,
  urlsPorAsset,
}) => {
  // Cargar las fuentes del slide (@font-face vía staticFile) ANTES de capturar
  // el frame: delayRender bloquea hasta que document.fonts las tenga listas.
  const [handle] = useState(() => delayRender("cargar fuentes del post"));
  useEffect(() => {
    let cancelado = false;
    const archivos = fuentesDelSlide(slide);
    Promise.all(
      archivos.map(async (archivo) => {
        try {
          const familia = familiaDeArchivo(archivo);
          const fuente = new FontFace(
            familia,
            `url(${staticFile(`fuentes/${archivo}`)})`
          );
          await fuente.load();
          document.fonts.add(fuente);
        } catch {
          // Si una fuente no carga, seguimos con la del sistema (no rompemos
          // el render por una tipografía ausente).
        }
      })
    )
      .then(() => {
        if (!cancelado) continueRender(handle);
      })
      .catch((err) => cancelRender(err));
    return () => {
      cancelado = true;
    };
  }, [slide, handle]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF" }}>
      <Fondo fondo={slide.fondo} urlsPorAsset={urlsPorAsset} />
      {(slide.bloques ?? []).map((bloque, i) => (
        <Bloque key={`bloque-${i}`} bloque={bloque} urlsPorAsset={urlsPorAsset} />
      ))}
    </AbsoluteFill>
  );
};

// calculateMetadata: fija el lienzo (ancho 1080, alto según formato) leyendo
// props.formato. Se usa al registrar la composición en Root.tsx.
export function calcularMetadataPostSlide({
  props,
}: {
  props: PostSlideProps;
}): { width: number; height: number } {
  const alto = ALTO_POR_FORMATO[props.formato] ?? 1080;
  return { width: ANCHO_LIENZO, height: alto };
}

export { ALTO_POR_FORMATO };
