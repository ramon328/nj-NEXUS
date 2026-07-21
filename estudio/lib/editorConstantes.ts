// Enums estáticos para poblar los selectores del EDITOR VISUAL.
//
// Cada constante empareja el valor del contrato (los union types de
// lib/types.ts) con una etiqueta legible en español para la UI. Al tiparlas
// contra los union types, si el contrato cambia (p. ej. se agrega un filtro)
// TypeScript avisará aquí, manteniendo la UI sincronizada con el motor.

import type {
  AnimacionSticker,
  AnimacionTexto,
  ColorTexto,
  ExecutableEditPlan,
  FiltroVideo,
  PosicionSticker,
  TipoTransicion,
  TipoZoom,
} from "@/lib/types";

// Aliases a los tipos anidados opcionales del segmento (para tipar los enums
// contra el contrato). "reencuadre" y "rotacion" son opcionales en el plan.
type Reencuadre = NonNullable<ExecutableEditPlan["segmentos"][number]["reencuadre"]>;
type Rotacion = NonNullable<ExecutableEditPlan["segmentos"][number]["rotacion"]>;
type SubtitulosEstilo = NonNullable<ExecutableEditPlan["subtitulos_estilo"]>;

// Una opción de <select>: valor del contrato + etiqueta legible.
export interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
}

// Los 13 filtros de color (presets de ffmpeg) con nombre legible.
export const FILTROS: Opcion<FiltroVideo>[] = [
  { valor: "ninguno", etiqueta: "Sin filtro" },
  { valor: "calido", etiqueta: "Cálido" },
  { valor: "frio", etiqueta: "Frío" },
  { valor: "vibrante", etiqueta: "Vibrante" },
  { valor: "vintage", etiqueta: "Vintage" },
  { valor: "bn", etiqueta: "Blanco y negro" },
  { valor: "cine", etiqueta: "Cine" },
  { valor: "sepia", etiqueta: "Sepia" },
  { valor: "noir", etiqueta: "Noir" },
  { valor: "pastel", etiqueta: "Pastel" },
  { valor: "tealorange", etiqueta: "Teal & Orange" },
  { valor: "grano", etiqueta: "Grano de película" },
  { valor: "sonador", etiqueta: "Soñador" },
];

// Transiciones entre segmentos (xfade de ffmpeg).
export const TRANSICIONES: Opcion<TipoTransicion>[] = [
  { valor: "ninguna", etiqueta: "Corte directo" },
  { valor: "fade", etiqueta: "Fundido" },
  { valor: "wipeleft", etiqueta: "Barrido a la izquierda" },
  { valor: "wiperight", etiqueta: "Barrido a la derecha" },
  { valor: "slideup", etiqueta: "Deslizar hacia arriba" },
  { valor: "circleopen", etiqueta: "Círculo que abre" },
];

// Colores de texto: nombre del contrato → hex real para las muestras de color.
export const COLORES_TEXTO_UI: Record<ColorTexto, string> = {
  blanco: "#ffffff",
  negro: "#111111",
  amarillo: "#ffd400",
  rosa: "#ff5bb3",
  celeste: "#5bc8ff",
  verde: "#4ade80",
};

// Orden de aparición de los colores en el selector.
export const COLORES_TEXTO: Opcion<ColorTexto>[] = [
  { valor: "blanco", etiqueta: "Blanco" },
  { valor: "negro", etiqueta: "Negro" },
  { valor: "amarillo", etiqueta: "Amarillo" },
  { valor: "rosa", etiqueta: "Rosa" },
  { valor: "celeste", etiqueta: "Celeste" },
  { valor: "verde", etiqueta: "Verde" },
];

// Posición vertical del texto sobre el video final.
export const POSICIONES_TEXTO: Opcion<"arriba" | "centro" | "abajo">[] = [
  { valor: "arriba", etiqueta: "Arriba" },
  { valor: "centro", etiqueta: "Centro" },
  { valor: "abajo", etiqueta: "Abajo" },
];

// Posición de un sticker (las cuatro esquinas + centro).
export const POSICIONES_STICKER: Opcion<PosicionSticker>[] = [
  { valor: "arriba-izquierda", etiqueta: "Arriba izquierda" },
  { valor: "arriba-derecha", etiqueta: "Arriba derecha" },
  { valor: "centro", etiqueta: "Centro" },
  { valor: "abajo-izquierda", etiqueta: "Abajo izquierda" },
  { valor: "abajo-derecha", etiqueta: "Abajo derecha" },
];

// Animación de entrada/salida de un texto.
export const ANIMACIONES_TEXTO: Opcion<AnimacionTexto>[] = [
  { valor: "fundido", etiqueta: "Fundido" },
  { valor: "deslizar-arriba", etiqueta: "Deslizar desde abajo" },
  { valor: "deslizar-lado", etiqueta: "Deslizar desde el lado" },
  { valor: "ninguna", etiqueta: "Sin animación" },
];

// Animación de entrada/salida de un sticker.
export const ANIMACIONES_STICKER: Opcion<AnimacionSticker>[] = [
  { valor: "fundido", etiqueta: "Fundido" },
  { valor: "pop", etiqueta: "Pop (rebote)" },
  { valor: "ninguna", etiqueta: "Sin animación" },
];

// Estilo visual del texto superpuesto.
export const ESTILOS_TEXTO: Opcion<"simple" | "caja" | "sombra" | "neon">[] = [
  { valor: "simple", etiqueta: "Simple" },
  { valor: "caja", etiqueta: "Caja" },
  { valor: "sombra", etiqueta: "Sombra" },
  { valor: "neon", etiqueta: "Neón" },
];

// ---------------------------------------------------------------------------
// Nuevos enums para las propiedades del SEGMENTO y estilo de subtítulos
// ---------------------------------------------------------------------------

// Movimiento de cámara (Ken Burns) sobre un segmento. Da vida a tomas fijas o
// largas: un empuje o paneo lento retiene más que un plano estático.
export const TIPOS_ZOOM: Opcion<TipoZoom>[] = [
  { valor: "ninguno", etiqueta: "Sin movimiento" },
  { valor: "acercar", etiqueta: "Acercar (push-in)" },
  { valor: "alejar", etiqueta: "Alejar (pull-out)" },
  { valor: "paneo-izquierda", etiqueta: "Paneo a la izquierda" },
  { valor: "paneo-derecha", etiqueta: "Paneo a la derecha" },
];

// Al recortar un video horizontal a 9:16, qué parte del cuadro conservar.
export const REENCUADRES: Opcion<Reencuadre>[] = [
  { valor: "izquierda", etiqueta: "Izquierda" },
  { valor: "centro", etiqueta: "Centro" },
  { valor: "derecha", etiqueta: "Derecha" },
];

// Rotación para corregir tomas grabadas de lado. Los valores son numéricos
// (grados), por eso no usan Opcion<string>.
export interface OpcionRotacion {
  valor: Rotacion;
  etiqueta: string;
}
export const ROTACIONES: OpcionRotacion[] = [
  { valor: 0, etiqueta: "Sin rotar" },
  { valor: 90, etiqueta: "90° (horario)" },
  { valor: 180, etiqueta: "180° (invertir)" },
  { valor: 270, etiqueta: "270° (antihorario)" },
];

// Estilo de los subtítulos quemados. "karaoke" (palabra por palabra) retiene
// más que el bloque estático "clasico".
export const SUBTITULOS_ESTILO: Opcion<SubtitulosEstilo>[] = [
  { valor: "clasico", etiqueta: "Clásico (bloque)" },
  { valor: "karaoke", etiqueta: "Karaoke (palabra por palabra)" },
];
