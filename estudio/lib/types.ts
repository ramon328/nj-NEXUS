// Tipos compartidos de la plataforma. Reflejan el esquema de supabase/schema.sql.

export type VideoStatus = "nuevo" | "procesando" | "listo" | "publicado";

export interface VideoAsset {
  id: string;
  drive_file_id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  web_view_link: string | null;
  download_url: string | null;
  drive_modified_at: string | null;
  status: VideoStatus;
  created_at: string;
  updated_at: string;
}

// ---------- Proyectos (multimedia agrupado para editar en conjunto) ----------

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string | null;
  // Carpeta espejo en Google Drive (solo si hay cuenta de servicio con
  // permiso de escritura; si no, null y los archivos viven en Supabase).
  drive_folder_id: string | null;
  created_at: string;
}

export type TipoAsset = "video" | "foto" | "audio" | "musica" | "sticker";

export interface ProyectoAsset {
  id: string;
  project_id: string;
  tipo: TipoAsset;
  nombre: string;
  storage_path: string; // ruta dentro del bucket "proyectos"
  public_url: string;
  mime_type: string | null;
  duracion_seconds: number | null; // videos y audios
  ancho: number | null;
  alto: number | null;
  size_bytes: number | null;
  drive_file_id: string | null; // copia espejo en Drive (opcional)
  created_at: string;
}

export type GenerationKind = "content" | "edit_plan";

export interface Generation {
  id: string;
  video_id: string;
  kind: GenerationKind;
  content: GeneratedContent | EditPlan;
  model: string | null;
  created_at: string;
}

// Resultado de /api/ai/generate
export interface GeneratedContent {
  caption: string;
  description: string;
  hashtags: string[];
  hook: string;
  call_to_action: string;
}

// Resultado de /api/ai/edit-plan
export interface EditPlan {
  resumen: string;
  duracion_sugerida_segundos: number;
  hook_inicial: string;
  escenas: EditScene[];
  texto_en_pantalla: string[];
  musica_sugerida: string;
  formato: string; // ej. "Reel vertical 9:16"
}

export interface EditScene {
  orden: number;
  desde_segundo: number;
  hasta_segundo: number;
  descripcion: string;
  transicion: string;
}

// ---------- Edición real de video con IA ----------

// Filtros de color disponibles (presets de ffmpeg).
export type FiltroVideo =
  | "ninguno"
  | "calido"
  | "frio"
  | "vibrante"
  | "vintage"
  | "bn"
  | "cine"
  | "sepia"
  | "noir"
  | "pastel"
  | "tealorange"
  | "grano"
  | "sonador";

// Colores disponibles para los textos superpuestos.
export type ColorTexto =
  | "blanco"
  | "negro"
  | "amarillo"
  | "rosa"
  | "celeste"
  | "verde";

// Transiciones entre segmentos (xfade de ffmpeg). Todos son nombres nativos
// del filtro xfade y se mapean 1:1.
export type TipoTransicion =
  | "ninguna"
  | "fade"
  | "wipeleft"
  | "wiperight"
  | "slideup"
  | "slidedown"
  | "circleopen"
  | "zoomin"
  | "smoothleft"
  | "smoothright"
  | "dissolve";

// Preset de estilo de edición: inyecta una "receta" distinta en el prompt.
// - "autos": reel de concesionario (hook sensorial → recorrido↔detalle →
//   valor → CTA, look teal-orange/cine, cortes al ritmo).
// - "punchy": máxima energía, cortes rápidos y textos audaces.
// - "cine": cinematográfico, ritmo pausado, planos que respiran.
// - "auto": la IA elige el estilo según el material.
export type EstiloEdicion = "autos" | "punchy" | "cine" | "auto";

export type PosicionSticker =
  | "arriba-izquierda"
  | "arriba-derecha"
  | "abajo-izquierda"
  | "abajo-derecha"
  | "centro";

// Animación de entrada/salida de un texto superpuesto.
// - "fundido": aparece/desaparece con fade de alpha (elegante, por defecto).
// - "deslizar-arriba": entra deslizándose desde abajo hacia su posición.
// - "deslizar-lado": entra deslizándose desde la izquierda hacia su posición.
// - "ninguna": aparece de golpe (comportamiento clásico).
export type AnimacionTexto =
  | "fundido"
  | "deslizar-arriba"
  | "deslizar-lado"
  | "ninguna";

// Animación de entrada/salida de un sticker.
// - "fundido": aparece/desaparece con fade (por defecto).
// - "pop": aparece con un fade rápido + un pequeño rebote de entrada.
// - "ninguna": aparece de golpe.
export type AnimacionSticker = "fundido" | "pop" | "ninguna";

// Un subtítulo (caption) sincronizado. Los tiempos están en la línea de tiempo
// FINAL "ingenua" (suma de segmentos), igual que textos y stickers; el motor
// aplica la compresión de las transiciones al renderizar. Se generan por
// transcripción de voz (Whisper) y se pueden editar a mano en el editor.
export interface SubtituloCue {
  texto: string;
  desde: number;
  hasta: number;
  // Palabras con su tiempo (línea FINAL "ingenua") para subtítulos karaoke
  // (resaltado palabra por palabra). Opcional: si falta, se muestra el texto
  // completo sin resaltado.
  palabras?: { desde: number; hasta: number; palabra: string }[];
}

// Movimiento de cámara sobre un segmento (efecto Ken Burns), para dar
// dinamismo a tomas fijas o largas.
export type TipoZoom =
  | "ninguno"
  | "acercar" // push-in lento
  | "alejar" // pull-out lento
  | "paneo-izquierda"
  | "paneo-derecha";

// Plan de edición EJECUTABLE que la IA genera y ffmpeg renderiza.
export interface ExecutableEditPlan {
  resumen: string;
  formato: "vertical_9_16" | "original";
  audio_original: boolean;
  // Preset de estilo de edición (afecta solo la generación del plan por la IA,
  // no el render). Opcional (default "auto").
  estilo?: EstiloEdicion;
  // Preset de color aplicado a todo el video.
  filtro: FiltroVideo;
  // Transición GLOBAL entre segmentos (compatibilidad con planes antiguos).
  // La transición de entrada por segmento (segmentos[].transicion) tiene
  // prioridad; esta se usa como respaldo cuando el segmento no trae la suya.
  transicion: {
    tipo: TipoTransicion;
    duracion: number;
  };
  // Música de fondo elegida de la biblioteca (public/musica) o null.
  musica: {
    archivo: string | null; // nombre de archivo, ej. "chill-relajado.mp3"
    volumen: number; // 0 a 1 — volumen de la música
    volumen_original: number; // 0 a 1 — volumen del audio original del video
    // Si la música es un archivo subido al proyecto, su id de asset
    // (tiene prioridad sobre "archivo"). Opcional.
    asset_id?: string | null;
  };
  // Efectos de sonido puntuales (public/audio/fx) colocados en un segundo
  // exacto de la línea de tiempo FINAL. Opcional (planes antiguos no lo traen).
  efectos_sonido?: {
    archivo: string; // nombre de archivo, ej. "whoosh.mp3"
    en_segundo: number; // segundo del video FINAL donde suena el efecto
    volumen: number; // 0 a 1
  }[];
  // Si true, coloca automáticamente un whoosh en cada punto de transición.
  // Opcional (default: sin whoosh automático).
  whoosh_en_transiciones?: boolean;
  // Subtítulos (captions) quemados en el video, sincronizados con la voz.
  // Se generan por transcripción y se pueden editar en el editor visual.
  subtitulos?: SubtituloCue[];
  // Estilo de los subtítulos: "clasico" (bloque completo) o "karaoke"
  // (resaltado palabra por palabra, más profesional). Default "clasico".
  subtitulos_estilo?: "clasico" | "karaoke";
  // Capa de gráficos profesional (Remotion): cuando es true (default), los
  // textos, subtítulos y stickers se renderizan con animaciones de nivel
  // broadcast (resortes, karaoke con caja, CTA animado) y se componen sobre
  // el video; false usa el modo clásico de ffmpeg (drawtext/ass).
  overlay_pro?: boolean;
  // Barra de progreso del reel (arriba), típica de los reels profesionales.
  // Solo aplica con overlay_pro. Default false.
  barra_progreso?: boolean;
  // Segmentos que componen el video final, en orden de aparición.
  segmentos: {
    desde: number; // segundos en el material de origen
    hasta: number;
    velocidad: number; // 0.5 a 2.0 (1 = normal)
    // Origen del segmento: id de un asset del proyecto (video o foto), o
    // null/ausente para el video único de la edición (modo clásico).
    // Para FOTOS: desde/hasta definen cuánto tiempo se muestra (ej. 0 a 3).
    asset_id?: string | null;
    // Movimiento de cámara (Ken Burns). Opcional (default "ninguno";
    // para fotos se recomienda siempre alguno).
    zoom?: TipoZoom;
    // Al recortar a 9:16, qué parte del cuadro conservar cuando el video
    // original es horizontal. Opcional (default "centro").
    reencuadre?: "izquierda" | "centro" | "derecha";
    // Rotación para corregir tomas grabadas de lado. Opcional (default 0).
    rotacion?: 0 | 90 | 180 | 270;
    // Transición de ENTRADA de este segmento (cómo aparece tras el anterior).
    // Se ignora en el primer segmento. Opcional: si falta, se usa la
    // transición global del plan. Permite variar las transiciones a lo largo
    // del reel (whip en energía, dissolve en calma, zoomin en reveal).
    transicion?: {
      tipo: TipoTransicion;
      duracion: number;
    };
  }[];
  // Textos sobre la línea de tiempo del video FINAL (ya editado).
  textos: {
    texto: string;
    desde: number;
    hasta: number;
    posicion: "arriba" | "centro" | "abajo";
    // simple | caja (fondo semitransparente) | sombra (sombra dura tipo
    // Canva) | neon (halo de color alrededor del texto)
    estilo: "simple" | "caja" | "sombra" | "neon";
    // Fuente de public/fuentes (ej. "impacto.ttf") o null para la del sistema.
    fuente: string | null;
    color: ColorTexto;
    // Animación de entrada/salida. Opcional (default "fundido").
    animacion?: AnimacionTexto;
  }[];
  // Stickers (imágenes PNG de public/stickers o assets del proyecto)
  // sobre el video FINAL.
  stickers: {
    archivo: string; // nombre de archivo, ej. "fuego.png"
    desde: number;
    hasta: number;
    posicion: PosicionSticker;
    escala: number; // 0.1 a 0.35 — proporción del ancho del video
    // Animación de entrada/salida. Opcional (default "fundido").
    animacion?: AnimacionSticker;
    // Si el sticker es una imagen subida al proyecto, su id de asset
    // (tiene prioridad sobre "archivo"). Opcional.
    asset_id?: string | null;
  }[];
}

export type EditStatus = "procesando" | "completado" | "error";

// Fila de la tabla edits. Una edición pertenece a UN video (modo clásico,
// video_id) o a UN proyecto (project_id) — nunca a ambos.
export interface EditJob {
  id: string;
  video_id: string | null;
  project_id?: string | null;
  instruccion: string | null;
  plan: ExecutableEditPlan | null;
  status: EditStatus;
  output_url: string | null;
  error: string | null;
  created_at: string;
}

// ---------- Herramientas de estrategia de marketing ----------

export type HerramientaMarketing =
  | "ideas" // generadora de ideas de reels
  | "copywriting" // copywriter (captions, hooks, CTAs)
  | "guion_reel" // guiones de reels virales con timing
  | "calendario" // planificación de contenido
  | "lead_magnet"; // diseño de lead magnets

// Fila de la tabla estrategias: cada ejecución de una herramienta guarda su
// entrada y su resultado (JSON con la forma propia de cada herramienta).
export interface Estrategia {
  id: string;
  herramienta: HerramientaMarketing;
  titulo: string;
  entrada: Record<string, unknown>;
  resultado: Record<string, unknown>;
  project_id: string | null;
  created_at: string;
}

// ---------- Diseño de posts (carruseles / imágenes) ----------

// Formato del post → tamaño del lienzo en píxeles:
//   cuadrado_1_1 = 1080x1080, vertical_4_5 = 1080x1350, historia_9_16 = 1080x1920.
export type FormatoPost = "cuadrado_1_1" | "vertical_4_5" | "historia_9_16";

// Todas las coordenadas y tamaños (x, y, ancho, alto) van en PORCENTAJE del
// lienzo (0–100), así el mismo bloque encaja en cualquier formato. El tamaño
// de fuente va en px sobre un lienzo de 1080 de ancho.
export type BloquePost =
  | {
      tipo: "texto";
      texto: string;
      x: number;
      y: number;
      ancho: number; // % del lienzo; el texto se ajusta dentro
      tamano: number; // px sobre lienzo de 1080 de ancho
      peso: "normal" | "bold" | "black";
      color: string; // hex
      fuente?: string; // archivo de public/fuentes o null (fuente del sistema)
      alineacion: "izquierda" | "centro" | "derecha";
      // Fondo/realce opcional del texto (pastilla) para legibilidad.
      caja?: { color: string; radio: number } | null;
    }
  | {
      tipo: "imagen";
      asset_id: string; // imagen del proyecto (foto/sticker/video-thumb)
      x: number;
      y: number;
      ancho: number;
      alto: number;
      ajuste: "cubrir" | "contener"; // object-fit
      radio?: number; // radio de esquinas en px
    }
  | {
      tipo: "forma";
      forma: "rectangulo" | "circulo" | "linea";
      x: number;
      y: number;
      ancho: number;
      alto: number;
      color: string;
      radio?: number;
      opacidad?: number; // 0–1
    }
  | {
      tipo: "sticker";
      archivo?: string; // nombre en public/stickers
      asset_id?: string; // o un sticker/imagen subido al proyecto
      x: number;
      y: number;
      escala: number; // % del ancho del lienzo (0.05–0.4)
    };

export interface SlidePost {
  // Fondo del slide.
  fondo: {
    tipo: "color" | "gradiente" | "imagen";
    color?: string; // color o color inicial del gradiente
    color2?: string; // color final del gradiente
    asset_id?: string; // imagen de fondo (del proyecto)
    overlay?: number; // capa oscura sobre la imagen 0–1 (para legibilidad)
  };
  bloques: BloquePost[];
}

export interface PostDesignPlan {
  formato: FormatoPost;
  // Paleta guía (coherencia entre slides).
  paleta: { fondo: string; texto: string; acento: string };
  slides: SlidePost[];
}

export type PostDisenoStatus = "procesando" | "completado" | "error";

// Fila de la tabla post_disenos.
export interface PostDiseno {
  id: string;
  project_id: string | null;
  titulo: string;
  instruccion: string | null;
  formato: FormatoPost;
  plan: PostDesignPlan | null;
  slides_urls: string[]; // PNGs renderizados, en orden
  status: PostDisenoStatus;
  error: string | null;
  created_at: string;
}

export type PostStatus = "borrador" | "publicando" | "publicado" | "error";

export interface Post {
  id: string;
  video_id: string;
  caption: string | null;
  hashtags: string[] | null;
  ig_container_id: string | null;
  ig_media_id: string | null;
  status: PostStatus;
  error: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
}
