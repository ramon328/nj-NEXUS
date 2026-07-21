// Contrato de props entre lib/overlay.ts (servidor, arma las props desde el
// plan) y la composición Remotion (las dibuja). Este archivo NO importa nada
// de "remotion": lib/overlay.ts lo importa y no debe arrastrar el runtime de
// Remotion al bundle del servidor de Next.

export const OVERLAY_FPS = 30;
export const OVERLAY_ANCHO = 1080;
export const OVERLAY_ALTO = 1920;

// Familia tipográfica por defecto de la capa (se registra vía @font-face con
// la fuente gruesa de public/fuentes). Los componentes la usan con fallback a
// fuentes de sistema por si el archivo no estuviera disponible.
export const FAMILIA_BASE = "OverlayTitulos";
export const PILA_FUENTES = `'${FAMILIA_BASE}', 'Archivo Black', 'Arial Black', 'Helvetica Neue', sans-serif`;

export interface PalabraOverlay {
  palabra: string;
  desde: number; // segundos REALES del video final (ya reescalados)
  hasta: number;
}

export interface SubtituloOverlay {
  texto: string;
  desde: number;
  hasta: number;
  palabras?: PalabraOverlay[];
}

export interface TextoOverlay {
  texto: string;
  desde: number;
  hasta: number;
  posicion: "arriba" | "centro" | "abajo";
  estilo: "simple" | "caja" | "sombra" | "neon";
  color: "blanco" | "negro" | "amarillo" | "rosa" | "celeste" | "verde";
  animacion: "fundido" | "deslizar-arriba" | "deslizar-lado" | "ninguna";
  // Familia @font-face registrada en fuentes[] (o null → familia base).
  familia: string | null;
}

export interface StickerOverlay {
  // Imagen como data URL (el servidor la lee de disco y la incrusta para que
  // el navegador headless no dependa de rutas locales).
  src: string;
  desde: number;
  hasta: number;
  posicion:
    | "arriba-izquierda"
    | "arriba-derecha"
    | "abajo-izquierda"
    | "abajo-derecha"
    | "centro";
  escala: number; // proporción del ancho del video (0.1 a 0.35)
  animacion: "fundido" | "pop" | "ninguna";
}

export interface FuenteOverlay {
  familia: string;
  dataUrl: string; // data:font/ttf;base64,...
}

export interface OverlayProps extends Record<string, unknown> {
  duracion: number; // segundos del video final
  barraProgreso: boolean;
  textos: TextoOverlay[];
  subtitulos: SubtituloOverlay[];
  subtitulosEstilo: "clasico" | "karaoke";
  stickers: StickerOverlay[];
  fuentes: FuenteOverlay[];
}

// Colores CSS de los textos (equivalentes a COLORES_TEXTO de lib/ffmpeg.ts).
export const COLORES_CSS: Record<TextoOverlay["color"], string> = {
  blanco: "#FFFFFF",
  negro: "#141414",
  amarillo: "#FFD700",
  rosa: "#FF5C8A",
  celeste: "#4FC3F7",
  verde: "#69F0AE",
};
