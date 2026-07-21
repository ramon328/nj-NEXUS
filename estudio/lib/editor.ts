import fs from "fs";
import os from "os";
import path from "path";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, CLAUDE_MODEL } from "./anthropic";
import { getSupabaseServer } from "./supabase";
import { uploadEditedVideo } from "./storage";
import {
  convertirImagenAJpeg,
  downloadDriveFile,
  extractFrames,
  probeVideo,
  renderEditPlan,
  type AssetRender,
  type ExtractedFrame,
  type VideoProbe,
} from "./ffmpeg";
import {
  listarEfectosSonido,
  listarFuentes,
  listarMusica,
  listarStickers,
} from "./medios";
import { urlBackend } from "./backend";
import { rutaLocalDeAsset } from "./mediaLocal";
import { mensajeErrorPostgrest } from "./proyectos";
import { construirTextoTranscripcion, transcribirVideo } from "./transcribe";
import { GUIA_EDICION_PROFESIONAL } from "./guiaEdicion";
import type {
  EditJob,
  EstiloEdicion,
  ExecutableEditPlan,
  Proyecto,
  ProyectoAsset,
  SubtituloCue,
  VideoAsset,
} from "./types";

// Motor de edición de video con IA: genera un plan ejecutable con Claude
// (viendo fotogramas reales del video) y lo renderiza con ffmpeg.

// ---------- Esquema JSON de ExecutableEditPlan v2 (additionalProperties: false) ----------

const EXECUTABLE_EDIT_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "resumen",
    "formato",
    "audio_original",
    "filtro",
    "transicion",
    "musica",
    "segmentos",
    "textos",
    "stickers",
    "efectos_sonido",
    "whoosh_en_transiciones",
    "overlay_pro",
    "barra_progreso",
  ],
  properties: {
    resumen: {
      type: "string",
      description: "Resumen del plan de edición en 1-3 frases, en español.",
    },
    estilo: {
      type: "string",
      enum: ["autos", "punchy", "cine", "auto"],
      description:
        'Preset de estilo de la edición (afecta solo la generación del plan, no el render): "autos" (reel de concesionario), "punchy" (energía máxima, cortes rápidos), "cine" (cinematográfico, pausado) o "auto" (elige tú según el material). Opcional: si te dieron un estilo en las instrucciones, respétalo.',
    },
    formato: {
      type: "string",
      enum: ["vertical_9_16", "original"],
      description:
        'Formato de salida: "vertical_9_16" (Reel, por defecto) u "original".',
    },
    audio_original: {
      type: "boolean",
      description: "Si se conserva el audio original del video.",
    },
    filtro: {
      type: "string",
      enum: [
        "ninguno",
        "calido",
        "frio",
        "vibrante",
        "vintage",
        "bn",
        "cine",
        "sepia",
        "noir",
        "pastel",
        "tealorange",
        "grano",
        "sonador",
      ],
      description: "Preset de color aplicado a todo el video final.",
    },
    transicion: {
      type: "object",
      additionalProperties: false,
      required: ["tipo", "duracion"],
      description:
        "Transición GLOBAL entre segmentos (respaldo cuando un segmento no trae su propia transición de entrada).",
      properties: {
        tipo: {
          type: "string",
          enum: [
            "ninguna",
            "fade",
            "wipeleft",
            "wiperight",
            "slideup",
            "slidedown",
            "circleopen",
            "zoomin",
            "smoothleft",
            "smoothright",
            "dissolve",
          ],
          description: 'Tipo de transición; "ninguna" = corte directo.',
        },
        duracion: {
          type: "number",
          description: "Duración de la transición en segundos (0.3 a 1).",
        },
      },
    },
    musica: {
      type: "object",
      additionalProperties: false,
      required: ["archivo", "volumen", "volumen_original"],
      description: "Música de fondo de la biblioteca y mezcla con el audio original.",
      properties: {
        archivo: {
          type: ["string", "null"],
          description:
            'Nombre EXACTO de una pista de la biblioteca (ej. "chill-relajado.mp3") o null si no lleva música.',
        },
        volumen: {
          type: "number",
          description: "Volumen de la música, 0 a 1 (recomendado 0.25 a 0.6).",
        },
        volumen_original: {
          type: "number",
          description:
            "Volumen del audio original del video, 0 a 1 (0 = silenciarlo por completo).",
        },
      },
    },
    subtitulos_estilo: {
      type: "string",
      enum: ["clasico", "karaoke"],
      description:
        'Estilo de los subtítulos si el video tiene voz: "karaoke" (resaltado palabra por palabra, retiene más — ELÍGELO cuando haya narración/voz) o "clasico" (bloque completo). Si el video no tiene voz, este campo se ignora.',
    },
    segmentos: {
      type: "array",
      description:
        "Segmentos del video ORIGINAL que se conservan, en orden de aparición. Entre 2 y 8 segmentos, siempre dentro de [0, duración del video]. Corta al ritmo: apunta a 0.8–2.5 s cada uno (más cortos en momentos de energía), y pon el mejor momento al inicio.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["desde", "hasta", "velocidad", "zoom", "reencuadre", "rotacion"],
        properties: {
          desde: {
            type: "number",
            description: "Segundo de inicio dentro del video original.",
          },
          hasta: {
            type: "number",
            description:
              "Segundo de fin dentro del video original (mayor que 'desde').",
          },
          velocidad: {
            type: "number",
            description:
              "Velocidad de reproducción entre 0.5 y 2.0 (1 = normal). Úsala con INTENCIÓN: cámara lenta (0.5-0.8) en detalles/reveal para saborearlos, rápida (1.3-2.0) en tránsitos/manejo para dar energía. No dejes todo en 1.",
          },
          zoom: {
            type: "string",
            enum: [
              "ninguno",
              "acercar",
              "alejar",
              "paneo-izquierda",
              "paneo-derecha",
            ],
            description:
              'Movimiento de cámara Ken Burns sobre el segmento: "acercar" (push-in lento), "alejar" (pull-out), "paneo-izquierda"/"paneo-derecha". Úsalo en tomas fijas o largas para darles vida; "ninguno" si la toma ya tiene movimiento propio.',
          },
          reencuadre: {
            type: "string",
            enum: ["izquierda", "centro", "derecha"],
            description:
              'Al recortar un video horizontal a 9:16, qué parte del cuadro conservar para NO cortar al sujeto. Mira los fotogramas: si la persona/acción está a un lado, elige ese lado; si no, "centro".',
          },
          rotacion: {
            type: "integer",
            enum: [0, 90, 180, 270],
            description:
              "Rotación HORARIA (en grados) para poner de pie una toma grabada de lado. Mira las CABEZAS de las personas o el cielo en los fotogramas y elige el giro que las deje ARRIBA: si las cabezas apuntan a la DERECHA del cuadro usa 90; si apuntan a la IZQUIERDA usa 270; si la toma está invertida (cabezas abajo) usa 180; si ya está derecha usa 0. Piénsalo bien: un valor equivocado deja el video al revés.",
          },
          transicion: {
            type: "object",
            additionalProperties: false,
            required: ["tipo", "duracion"],
            description:
              "Transición de ENTRADA de este segmento (cómo aparece tras el anterior). Se ignora en el PRIMER segmento. Opcional: si falta, se usa la transición GLOBAL del plan. Varíala a lo largo del reel: smooth/whip (smoothleft, smoothright, wipeleft) en momentos de energía, dissolve/fade en la calma, zoomin en un reveal de detalle.",
            properties: {
              tipo: {
                type: "string",
                enum: [
                  "ninguna",
                  "fade",
                  "wipeleft",
                  "wiperight",
                  "slideup",
                  "slidedown",
                  "circleopen",
                  "zoomin",
                  "smoothleft",
                  "smoothright",
                  "dissolve",
                ],
                description: 'Tipo de transición; "ninguna" = corte directo.',
              },
              duracion: {
                type: "number",
                description: "Duración de la transición en segundos (0.3 a 1).",
              },
            },
          },
        },
      },
    },
    textos: {
      type: "array",
      description:
        "Textos superpuestos (1 a 4), cortos y en español (máx. 6 palabras), SIN emojis. Los tiempos son sobre la línea de tiempo del video FINAL editado.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "texto",
          "desde",
          "hasta",
          "posicion",
          "estilo",
          "fuente",
          "color",
          "animacion",
        ],
        properties: {
          texto: {
            type: "string",
            description: "Texto corto en español, máximo 6 palabras, sin emojis.",
          },
          desde: {
            type: "number",
            description: "Segundo de aparición en el video FINAL editado.",
          },
          hasta: {
            type: "number",
            description: "Segundo de desaparición en el video FINAL editado.",
          },
          posicion: {
            type: "string",
            enum: ["arriba", "centro", "abajo"],
            description: "Posición vertical del texto en pantalla.",
          },
          estilo: {
            type: "string",
            enum: ["simple", "caja", "sombra", "neon"],
            description:
              '"simple" = texto con borde; "caja" = fondo negro semitransparente tipo sticker; "sombra" = sombra dura tipo Canva; "neon" = halo de color alrededor del texto.',
          },
          fuente: {
            type: ["string", "null"],
            description:
              'Nombre EXACTO de una fuente de la biblioteca (ej. "impacto.ttf") o null para la fuente del sistema.',
          },
          color: {
            type: "string",
            enum: ["blanco", "negro", "amarillo", "rosa", "celeste", "verde"],
            description:
              "Color del texto; elige uno que contraste con la escena de fondo.",
          },
          animacion: {
            type: "string",
            enum: ["fundido", "deslizar-arriba", "deslizar-lado", "ninguna"],
            description:
              'Animación de entrada/salida del texto: "fundido" (aparece/desaparece suave, elegante, por defecto), "deslizar-arriba" (entra deslizándose desde abajo, dinámico), "deslizar-lado" (entra desde la izquierda, dinámico), "ninguna" (aparece de golpe).',
          },
        },
      },
    },
    stickers: {
      type: "array",
      description:
        "Stickers PNG de la biblioteca sobre el video FINAL (0 a 4). Tiempos sobre la línea de tiempo del video FINAL editado.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["archivo", "desde", "hasta", "posicion", "escala", "animacion"],
        properties: {
          archivo: {
            type: "string",
            description: 'Nombre EXACTO de un sticker de la biblioteca, ej. "fuego.png".',
          },
          desde: {
            type: "number",
            description: "Segundo de aparición en el video FINAL editado.",
          },
          hasta: {
            type: "number",
            description: "Segundo de desaparición en el video FINAL editado.",
          },
          posicion: {
            type: "string",
            enum: [
              "arriba-izquierda",
              "arriba-derecha",
              "abajo-izquierda",
              "abajo-derecha",
              "centro",
            ],
            description: "Posición del sticker en pantalla.",
          },
          escala: {
            type: "number",
            description:
              "Tamaño como proporción del ancho del video, entre 0.12 y 0.3.",
          },
          animacion: {
            type: "string",
            enum: ["fundido", "pop", "ninguna"],
            description:
              'Animación de entrada/salida del sticker: "fundido" (aparece/desaparece suave, por defecto), "pop" (aparece con rebote enérgico, ideal para stickers divertidos o de impacto), "ninguna" (aparece de golpe).',
          },
        },
      },
    },
    efectos_sonido: {
      type: "array",
      description:
        "Efectos de sonido puntuales sobre la línea de tiempo del video FINAL (0 a 4, además de los whoosh de transición). Úsalos con mesura para dar ritmo y énfasis.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["archivo", "en_segundo", "volumen"],
        properties: {
          archivo: {
            type: "string",
            description:
              'Nombre EXACTO de un efecto de la biblioteca, ej. "pop.mp3".',
          },
          en_segundo: {
            type: "number",
            description:
              "Segundo del video FINAL editado donde suena el efecto (dentro de la duración final).",
          },
          volumen: {
            type: "number",
            description: "Volumen del efecto, 0 a 1 (recomendado 0.3 a 0.7).",
          },
        },
      },
    },
    whoosh_en_transiciones: {
      type: "boolean",
      description:
        "Si true, coloca automáticamente un whoosh en cada punto de transición para dar ritmo. Recomendado true por defecto.",
    },
    overlay_pro: {
      type: "boolean",
      description:
        "Capa de gráficos profesional (modo por defecto: true). Los textos, subtítulos y stickers se renderizan con animaciones de nivel broadcast (resortes, karaoke con caja, CTA animado). Usa false solo si se pide explícitamente un look básico/clásico.",
    },
    barra_progreso: {
      type: "boolean",
      description:
        "Barra de progreso del reel en el borde superior (solo aplica con overlay_pro). Suele mejorar la retención en reels informativos/educativos; false para vibras puramente estéticas o cinematográficas.",
    },
  },
} as const;

// Esquema para la edición de PROYECTO: parte del esquema clásico y ancla los
// asset_id a enums con los ids REALES del proyecto (anti-alucinación):
//  - segmentos[].asset_id: REQUERIDO, enum de los videos/fotos disponibles.
//  - musica.asset_id: enum de las músicas del proyecto o null (solo si hay).
//  - stickers[].asset_id: enum de los stickers del proyecto o null (solo si hay).
function construirSchemaProyecto(
  idsSegmento: string[],
  idsMusica: string[],
  idsSticker: string[]
): Record<string, unknown> {
  const schema = structuredClone(EXECUTABLE_EDIT_PLAN_SCHEMA) as unknown as {
    properties: {
      segmentos: {
        items: { required: string[]; properties: Record<string, unknown> };
      };
      musica: { required: string[]; properties: Record<string, unknown> };
      stickers: {
        items: { required: string[]; properties: Record<string, unknown> };
      };
    };
  };

  schema.properties.segmentos.items.properties.asset_id = {
    type: "string",
    enum: idsSegmento,
    description:
      "Id EXACTO del asset del proyecto (video o foto) del que sale este segmento.",
  };
  schema.properties.segmentos.items.required.push("asset_id");

  // Nota: la API de structured outputs rechaza `type: ["string","null"]`
  // combinado con `enum` — el patrón soportado para "enum o null" es anyOf.
  if (idsMusica.length) {
    schema.properties.musica.properties.asset_id = {
      anyOf: [{ type: "string", enum: idsMusica }, { type: "null" }],
      description:
        'Id de una música subida al proyecto (tiene PRIORIDAD sobre "archivo") o null para usar la biblioteca.',
    };
    schema.properties.musica.required.push("asset_id");
  }

  if (idsSticker.length) {
    schema.properties.stickers.items.properties.asset_id = {
      anyOf: [{ type: "string", enum: idsSticker }, { type: "null" }],
      description:
        'Id de un sticker subido al proyecto (tiene PRIORIDAD sobre "archivo") o null para usar un sticker de la biblioteca.',
    };
    schema.properties.stickers.items.required.push("asset_id");
  }

  return schema as unknown as Record<string, unknown>;
}

// Personalidad de cada fuente de public/fuentes, para guiar la elección de la IA.
const PERSONALIDAD_FUENTES: Record<string, string> = {
  "impacto.ttf": "condensada potente, ideal para hooks con energía",
  "titulos-gruesos.ttf": "negrita máxima, titulares contundentes",
  "moderna-condensada.ttf": "limpia y alta, look moderno y minimalista",
  "script-elegante.ttf": "cursiva con estilo, elegancia y lifestyle",
  "manuscrita-relajada.ttf": "manuscrita playera y relajada, vibra casual",
  "marcador.ttf": "marcador a mano, espontánea y directa",
  "redondeada-retro.ttf": "retro redondeada, amigable y nostálgica",
  "comic-divertida.ttf": "estilo cómic, humor y desenfado",
  "infantil-gruesa.ttf": "divertida y gruesa, contenido juguetón",
  "moderna-elegante.ttf": "sans premium para marcas, look profesional",
  "serif-lujosa.ttf": "serif editorial de lujo, sofisticación",
  "serif-impacto.ttf": "serif para titulares dramáticos",
  "slab-gruesa.ttf": "slab de fuerza máxima, presencia total",
  "caligrafia-fluida.ttf": "caligrafía fluida y romántica",
  "manuscrita-natural.ttf": "manuscrita tipo nota a mano, cercana",
  "retro-juguetona.ttf": "retro divertida con mucha personalidad",
  "urbana-display.ttf": "display urbana llamativa, calle y energía",
  "burbuja-gruesa.ttf": "burbuja infantil redonda, alegre",
  "geometrica-fuerte.ttf": "geométrica moderna y contundente",
  "geometrica-suave.ttf": "geométrica suave y amable, tech friendly",
  "cartel-vintage.ttf": "cartel retro con carácter, nostálgico",
  "condensada-alta.ttf": "condensada altísima, titulares apretados",
  "estrecha-deportiva.ttf": "estrecha con energía deportiva",
  "moderna-tailand.ttf": "sans moderna con acento único",
  "mono-bloque.ttf": "monoespaciada tipo bloque, look técnico",
  "negra-ancha.ttf": "negra ancha de máxima presencia",
  "redonda-amigable.ttf": "redonda amigable y cercana",
};

// Bloque común del prompt con los catálogos locales de /public (música,
// stickers, fuentes, colores, estilos, filtros, transiciones, animaciones,
// efectos de sonido e íconos de CTA). Compartido por la edición clásica
// (generateExecutablePlan) y la de proyectos (generateProjectPlan).
function construirCatalogoMedios(): string {
  // Bibliotecas locales de medios para que la IA elija con nombres exactos.
  const pistasMusica = listarMusica();
  const stickersDisponibles = listarStickers();
  const fuentesDisponibles = listarFuentes();
  const efectosDisponibles = listarEfectosSonido();

  const listaMusica = pistasMusica.length
    ? pistasMusica
        .map(
          (m) =>
            `- ${m.archivo}${m.duracionSegundos ? ` (loop de ${m.duracionSegundos}s, se repite automáticamente hasta cubrir el video)` : ""}`
        )
        .join("\n")
    : '- (no hay pistas disponibles: usa "archivo": null)';

  // La biblioteca de stickers es grande: en vez de listar cada archivo, el
  // prompt describe el patrón de nombres y solo usa el conteo real. La lista
  // completa (listarStickers) se reserva para VALIDAR el plan en runEditJob.
  const seccionStickers = stickersDisponibles.length
    ? `Biblioteca de stickers (${stickersDisponibles.length} PNG con transparencia). En "stickers[].archivo" usa SIEMPRE el nombre EXACTO del archivo, con su sufijo de color cuando corresponda y terminado en .png:
- Emojis (el nombre va directo + .png, ej. "fuego.png"): aplausos, arcoiris, beso, bicep, brillos, camara, cien, cohete, confeti, corazon, corona, diana, dinero, enamorado, estrella, festejo, fiesta, fuego, fuerte, globo, grito, guiño, lentes, like, luna, manos-arriba, musica, ojos, ok, palmera, pensando, rayo, regalo, reloj, risa, señala-abajo, sol, sorpresa, ubicacion, video.
- Íconos disponibles (agrega el sufijo -blanco o -amarillo): flecha-derecha, flecha-izquierda, flecha-arriba, flecha-abajo, corazon-icono, estrella-icono, rayo-icono, megafono, nota-musical, camara-icono, play, check, equis, exclamacion, pregunta, pin-ubicacion, etiqueta, regalo-icono, carrito, trofeo, fuego-icono, like-icono, ojo-icono, campana, whatsapp, instagram, descuento, reloj-icono, calendario, sol-icono, compartir, verificado, premio, chat, tijeras — ejemplo: "megafono-amarillo.png".
- Formas (agrega uno de los sufijos -rosa, -celeste, -amarillo o -blanco): circulo, cuadrado, triangulo, globo-dialogo, cinta-marcador, hexagono — ejemplo: "globo-dialogo-rosa.png".`
    : 'No hay stickers disponibles: usa "stickers": [].';

  const listaFuentes = fuentesDisponibles.length
    ? fuentesDisponibles
        .map((f) => {
          const personalidad = PERSONALIDAD_FUENTES[f.archivo];
          return `- ${f.archivo}${personalidad ? ` (${personalidad})` : ""}`;
        })
        .join("\n")
    : '- (no hay fuentes disponibles: usa "fuente": null)';

  // Efectos de sonido puntuales de public/audio/fx.
  const seccionEfectos = efectosDisponibles.length
    ? `Efectos de sonido disponibles (usa el nombre EXACTO en "efectos_sonido[].archivo"):
${efectosDisponibles.map((e) => `- ${e.archivo}`).join("\n")}`
    : 'No hay efectos de sonido disponibles: usa "efectos_sonido": [] y "whoosh_en_transiciones": false.';

  return `Música disponible (usa el nombre EXACTO en "musica.archivo", o null):
${listaMusica}

${seccionStickers}

Fuentes disponibles (usa el nombre EXACTO en "textos[].fuente", o null para la fuente del sistema):
${listaFuentes}

Colores de texto disponibles ("textos[].color"): blanco, negro, amarillo, rosa, celeste, verde.

Estilos de texto disponibles ("textos[].estilo"): simple (borde fino), caja (fondo negro semitransparente, ideal sobre fondos con mucho detalle), sombra (sombra dura negra, look Canva clásico), neon (halo de color alrededor del texto, perfecto para fiesta o vibra nocturna).

Filtros de color disponibles ("filtro"): ninguno, calido (acogedor), frio (moderno), vibrante (llamativo), vintage (retro), bn (dramático), cine (cinematográfico), sepia (nostálgico), noir (dramático b/n), pastel (suave), tealorange (cine moderno), grano (cine análogo con textura de película), sonador (suave y dreamy).
Transiciones disponibles (para la "transicion" GLOBAL y para "segmentos[].transicion" de ENTRADA por segmento): ninguna (corte seco), fade, dissolve (fundido cruzado suave), wipeleft, wiperight, slideup, slidedown, circleopen, zoomin (reveal con acercamiento), smoothleft, smoothright (whip suave). VARÍA la transición por segmento: whip/smooth en energía, dissolve/fade en calma, zoomin en un reveal.

Animaciones de texto disponibles ("textos[].animacion"): fundido (aparece/desaparece suave, elegante), deslizar-arriba (entra deslizándose desde abajo, dinámico), deslizar-lado (entra desde la izquierda, dinámico), ninguna (aparece de golpe).
Animaciones de sticker disponibles ("stickers[].animacion"): fundido (suave, por defecto), pop (aparece con rebote enérgico, ideal para stickers divertidos o de impacto), ninguna.

${seccionEfectos}

Íconos de marca y de acción para llamados a la acción (CTAs): además de los emojis y formas, la biblioteca de stickers incluye logos de redes ("marca-<red>-blanco.png" o "marca-<red>-color.png"; redes: instagram, tiktok, youtube, whatsapp, x, threads, facebook, telegram, snapchat, pinterest, linkedin, twitch, discord, spotify, applemusic, soundcloud) y etiquetas de acción ("accion-<tipo>-blanco.png" o "accion-<tipo>-amarillo.png"; tipos: guarda, comenta, megusta, envia, desliza, activa). Úsalos para CTAs como "sígueme en TikTok" (marca-tiktok-color.png), "link en bio", "guarda este video" (accion-guarda-amarillo.png) o "comenta abajo" (accion-comenta-blanco.png), normalmente cerca del cierre del Reel.`;
}

// ---------- Generación del plan ejecutable con Claude ----------

// El JSON estructurado llega en el primer bloque de texto de la respuesta.
// Pueden venir bloques de thinking antes — se ignoran. Si no hay bloque de
// texto (p. ej. el modelo agotó max_tokens pensando o refusó), se lanza un
// error con el stop_reason para diagnosticar en vez de un mensaje opaco.
function extraerPlan(response: {
  content: Array<{ type: string; text?: string }>;
  stop_reason?: string | null;
}): ExecutableEditPlan {
  const bloque = response.content.find(
    (b): b is { type: "text"; text: string } => b.type === "text"
  );
  if (!bloque) {
    const tipos = response.content.map((b) => b.type).join(", ") || "(ninguno)";
    throw new Error(
      `La respuesta del modelo no contiene un bloque de texto (stop_reason=${response.stop_reason ?? "?"}, bloques=[${tipos}])`
    );
  }
  const plan = JSON.parse(bloque.text) as ExecutableEditPlan;
  // Defaults de la capa de gráficos PRO si el modelo no los trae (planes
  // antiguos o respuestas incompletas): overlay_pro activado por defecto y
  // barra de progreso apagada.
  if (typeof plan.overlay_pro !== "boolean") plan.overlay_pro = true;
  if (typeof plan.barra_progreso !== "boolean") plan.barra_progreso = false;
  normalizarRotaciones(plan);
  return plan;
}

// La IA acierta bien en detectar QUÉ tomas están de lado, pero es inconsistente
// en la DIRECCIÓN del giro (a veces 90, a veces 270 en el mismo video), lo que
// deja algunas tomas de cabeza. Como un video se grabó con una sola inclinación,
// todas las tomas torcidas deben girar igual: forzamos la rotación no-nula más
// frecuente a todos los segmentos que la IA marcó como torcidos. Los segmentos
// que dejó en 0 (los juzgó bien orientados) se respetan. En planes de PROYECTO
// se normaliza POR FUENTE (asset_id): cada video tiene su propia inclinación.
// El usuario siempre puede ajustar la rotación por segmento en el editor visual.
function normalizarRotaciones(plan: ExecutableEditPlan): void {
  if (!Array.isArray(plan?.segmentos)) return;

  // Agrupar por fuente (en modo clásico todos caen en el grupo null).
  const grupos = new Map<string | null, ExecutableEditPlan["segmentos"]>();
  for (const s of plan.segmentos) {
    const clave = s.asset_id ?? null;
    const lista = grupos.get(clave);
    if (lista) lista.push(s);
    else grupos.set(clave, [s]);
  }

  for (const segmentos of grupos.values()) {
    const noNulas = segmentos.map((s) => s.rotacion ?? 0).filter((r) => r !== 0);
    if (noNulas.length < 2) continue;

    const conteo = new Map<number, number>();
    for (const r of noNulas) conteo.set(r, (conteo.get(r) ?? 0) + 1);
    let dominante: 0 | 90 | 180 | 270 = noNulas[0];
    let max = 0;
    for (const [rot, n] of conteo) {
      if (n > max) {
        max = n;
        dominante = rot as 0 | 90 | 180 | 270;
      }
    }
    for (const s of segmentos) {
      if ((s.rotacion ?? 0) !== 0) s.rotacion = dominante;
    }
  }
}

// ---------- Recetas por estilo de edición ----------

// Cada receta es un bloque de instrucciones que se INYECTA en el prompt según
// el "estilo" pedido, para dar una dirección creativa clara (estructura, ritmo,
// look, transiciones). Con "auto" (o sin estilo) la IA elige entre punchy/cine/
// autos según el material, con una guía breve.
const RECETAS_ESTILO: Record<EstiloEdicion, string> = {
  autos: `ESTILO PEDIDO: "autos" (reel de concesionario, ~15 s). Sigue esta ESTRUCTURA:
- 0-3 s — HOOK sensorial: arranca con un detalle que despierta deseo (el faro encendiéndose, la puerta abriéndose, el arranque del motor, el rugido del escape). Sin relleno.
- 3-10 s — RECORRIDO ↔ DETALLE: alterna un plano AMPLIO del auto con DETALLES en primer plano (parrilla, llantas, insignia/logo, interior, pantalla, costuras). Corta al ritmo.
- 10-13 s — VALOR: muestra lo que lo hace deseable (potencia, tecnología, confort, diseño). Un texto potente aquí.
- 13-15 s — CTA: cierra con un llamado a la acción claro ("agenda tu prueba de manejo", "escríbenos hoy") y un sticker de acción/whatsapp cerca del final.
LOOK: filtro "tealorange" o "cine". Cortes al ritmo, transiciones VARIADAS por segmento: "zoomin" al revelar un detalle, "smoothleft"/"smoothright"/"wipeleft" (whip) entre planos, "dissolve"/"fade" en los momentos más calmados. Velocidad rápida (1.3-2.0) en tránsitos/manejo, lenta (0.5-0.8) para saborear un detalle en primer plano.`,
  punchy: `ESTILO PEDIDO: "punchy" (energía máxima). Segmentos MUY cortos (0.8-1.5 s), muchísimos cambios visuales, cortes secos al beat. Textos grandes y audaces (hooks contundentes con fuentes tipo impacto/titulos-gruesos). Música con drop/energía (sube el volumen de la música). Transiciones rápidas por segmento: "smoothleft"/"smoothright"/"wipeleft" (whip) y "zoomin" en los golpes; casi nada de fundidos largos. Velocidad 1.3-2.0 en tránsitos para dar hype. Stickers de impacto ("pop") en los beats.`,
  cine: `ESTILO PEDIDO: "cine" (cinematográfico, pausado). Segmentos que RESPIRAN (2-3.5 s), planos largos con Ken Burns suave (acercar/alejar lentos). Filtro "cine" o "tealorange". MENOS texto (deja respirar la imagen), fuentes elegantes (serif-lujosa, moderna-elegante). Transiciones SUAVES por segmento: "dissolve" y "fade"; nada de whip agresivo. Velocidad lenta (0.5-0.8) en detalles/reveal para saborearlos; evita cortes frenéticos. Música atmosférica a volumen bajo.`,
  auto: `ESTILO: elige TÚ el más adecuado al material entre "punchy" (energía máxima, cortes rápidos, ideal para producto/deporte/hype), "cine" (pausado y cinematográfico, ideal para lifestyle/paisaje/marca premium) o "autos" (concesionario: hook sensorial → recorrido↔detalle → valor → CTA). Comprométete con uno y aplícalo con coherencia (ritmo, look y transiciones acordes), no mezcles a medias.`,
};

// Devuelve el bloque de receta a inyectar en el prompt según el estilo recibido
// (undefined o "auto" → guía para que la IA elija).
function recetaEstilo(estilo?: EstiloEdicion): string {
  return RECETAS_ESTILO[estilo ?? "auto"] ?? RECETAS_ESTILO.auto;
}

// Las rutas /edit guardan el estilo elegido en la UI como un marcador
// "[[estilo:X]]" al inicio de la instrucción (así no hace falta una columna
// nueva en la BD). Aquí lo extraemos: devolvemos el estilo y la instrucción
// LIMPIA (sin el marcador) para que la IA no vea ese texto técnico.
function extraerEstilo(instruccion: string | null | undefined): {
  estilo?: EstiloEdicion;
  instruccionLimpia?: string;
} {
  if (!instruccion) return {};
  const m = instruccion.match(/^\s*\[\[estilo:(autos|punchy|cine|auto)\]\]\s*/i);
  if (!m) return { instruccionLimpia: instruccion };
  const estilo = m[1].toLowerCase() as EstiloEdicion;
  const limpia = instruccion.slice(m[0].length).trim();
  return { estilo, instruccionLimpia: limpia || undefined };
}

export async function generateExecutablePlan(
  video: VideoAsset,
  instruccion: string | undefined,
  probe: VideoProbe,
  frames: ExtractedFrame[],
  // Texto de la transcripción con tiempos (best-effort). Si hay voz, se pasa a
  // la IA para que CORTE por el habla (gancho, límites de frase, sin relleno).
  transcripcionTexto?: string,
  // Preset de estilo de edición (inyecta una receta creativa en el prompt).
  // Opcional: si falta se usa "auto" (la IA elige).
  estilo?: EstiloEdicion
): Promise<ExecutableEditPlan> {
  const client = getAnthropic();
  const duracion = Math.round(probe.durationSeconds * 10) / 10;

  // Contenido mixto: cada fotograma va precedido de un texto con su timestamp.
  const bloques: Anthropic.ContentBlockParam[] = [];
  for (const frame of frames) {
    bloques.push({
      type: "text",
      text: `Fotograma en el segundo ${frame.timestamp.toFixed(1)} de ${duracion}`,
    });
    bloques.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: fs.readFileSync(frame.filePath).toString("base64"),
      },
    });
  }

  // Sección de transcripción: si hay voz, se le da a la IA con tiempos para que
  // corte por el habla (elegir gancho, quitar relleno/silencios, cortar en
  // límites de frase). Los tiempos están en el video ORIGINAL.
  const seccionTranscripcion = transcripcionTexto?.trim()
    ? `Transcripción de la voz del video ORIGINAL, con marcas de tiempo [inicio-fin] en segundos del original. ÚSALA para elegir los cortes:
${transcripcionTexto.trim()}

Corta por el habla: elige como PRIMER segmento la mejor frase o el momento de más energía (gancho nano en <1.5 s), haz que cada segmento empiece y termine en límites de frase/palabra, y quita relleno, muletillas y silencios.`
    : "Este video no tiene transcripción de voz utilizable (poca o ninguna narración): apóyate en lo que VES en los fotogramas.";

  const promptFinal = `Eres un editor profesional de Instagram Reels.

${GUIA_EDICION_PROFESIONAL}

${recetaEstilo(estilo)}

Metadatos del video original:
- Nombre del archivo: ${video.name}
- Duración: ${duracion} segundos
- Resolución: ${probe.width}x${probe.height}
- Audio: ${probe.hasAudio ? "sí tiene pista de audio" : "no tiene pista de audio"}

Instrucción del usuario:
${instruccion?.trim() ? instruccion.trim() : "Criterio libre: crea el Reel más atractivo posible con este material."}

${seccionTranscripcion}

${construirCatalogoMedios()}

Arriba tienes fotogramas reales del video con su timestamp. Genera un plan de edición EJECUTABLE siguiendo estas reglas:
- Elige los mejores momentos según lo que VES en los fotogramas (acción, personas, cambios de escena, planos atractivos) y lo que DICE la transcripción.
- "segmentos": entre 2 y 8 segmentos del video original, en orden, siempre dentro de [0, ${duracion}] segundos y con "desde" < "hasta". CORTA AL RITMO: apunta a 0.8–2.5 s por segmento (más cortos, 0.8–1.5 s, en momentos de energía; más largos solo si la toma lo pide), y pon el mejor momento (o la mejor frase) como PRIMER segmento.
- Duración final objetivo: entre 15 y 45 segundos (suma de segmentos ajustada por velocidad), salvo que la instrucción del usuario pida otra cosa.
- "velocidad": entre 0.5 y 2.0. Úsala con INTENCIÓN, no la dejes toda en 1: cámara lenta (0.5-0.8) en detalles/reveal para saborearlos, rápida (1.3-2.0) en tránsitos/manejo para dar energía. Haz speed-ramps con propósito.
- "zoom" (Ken Burns) por segmento: usa "acercar"/"alejar"/"paneo-izquierda"/"paneo-derecha" en tomas FIJAS o largas (una persona hablando, un plano quieto) para darles vida; usa "ninguno" si la toma ya tiene movimiento propio.
- "rotacion" por segmento: si en los fotogramas una toma se ve girada (grabada de lado), corrígela para que quede DE PIE. El valor es un giro HORARIO en grados; determínalo mirando hacia dónde apuntan las CABEZAS de las personas (o el cielo) en el fotograma: cabezas hacia la DERECHA → 90; cabezas hacia la IZQUIERDA → 270; cabezas hacia ABAJO (toma invertida) → 180; ya derecha → 0. Elige el giro con cuidado: equivocarte deja a las personas de cabeza. Muchos videos verticales de teléfono llegan "acostados" con las cabezas hacia la izquierda: en ese caso el valor correcto es 270, no 90.
- "reencuadre" por segmento: al recortar a 9:16, conserva al sujeto — elige "izquierda"/"derecha" si la persona o acción está a un lado del cuadro horizontal, o "centro" si está al medio. No cortes la cara.
- "textos": entre 1 y 4 textos cortos en español (máximo 6 palabras cada uno). Sus tiempos van sobre la línea de tiempo del video FINAL editado (la suma de los segmentos ya ajustada por velocidad), no sobre el original. El PRIMERO debe ser un gancho AUDAZ y potente en los primeros segundos (una promesa, una cifra, una pregunta directa — que pare el scroll), no una descripción tibia. Estilo "caja" para destacar sobre fondos con mucho detalle.
- Los textos NO deben contener emojis (la fuente no los renderiza): las emociones van como stickers.
- Fuente de cada texto: elígela según la vibra del video y la instrucción del usuario. Orientación: impacto/titulos-gruesos para energía y potencia; script-elegante/manuscrita-relajada para lifestyle; comic-divertida/infantil-gruesa para humor. Usa MÁXIMO 2 fuentes distintas por video.
- Color de cada texto: elige uno que CONTRASTE con la escena de fondo (mira los fotogramas donde aparecerá). El amarillo funciona casi siempre para hooks.
- "formato": usa "vertical_9_16" por defecto (Reel); "original" solo si el usuario lo pide.
- "audio_original": true salvo que el usuario pida quitar el audio o el video no tenga audio.
- Música: si el usuario pide música (o el video se beneficia de ella), elige la pista cuyo mood calce con lo que VES en los fotogramas. "musica.volumen" entre 0.25 y 0.6. Si no lleva música: "archivo": null y "volumen": 0.
- Audio original: "musica.volumen_original" entre 0.6 y 1.0 si hay narración o voz importante, y en ese caso baja la música a 0.2-0.35. Si el usuario pide que NO haya audio original, usa "volumen_original": 0.
- Stickers: entre 0 y 4, normalmente en las esquinas (no tapes el centro salvo momentos de impacto), "escala" entre 0.12 y 0.3, elegidos por relevancia con la escena. Sus tiempos también van sobre el video FINAL editado.
- Transiciones: VARÍALAS a lo largo del reel poniendo "transicion" en CADA segmento (transición de ENTRADA; se ignora en el primero). Usa whip/smooth ("smoothleft", "smoothright", "wipeleft") en momentos de energía, "dissolve"/"fade" en la calma y "zoomin" en un reveal de detalle. No pongas todas iguales. La "transicion" GLOBAL del plan es solo el respaldo para los segmentos que no traigan la suya; si buscas cortes secos, usa "ninguna". "duracion" entre 0.3 y 1.
- "filtro": elige según la vibra pedida o la que veas en los fotogramas; "ninguno" si no aporta.
- Animación de cada texto ("textos[].animacion"): usa "fundido" casi siempre para elegancia; "deslizar-arriba" o "deslizar-lado" cuando la vibra sea dinámica/enérgica (deporte, música, hype); "ninguna" solo si buscas un corte seco intencional.
- Animación de cada sticker ("stickers[].animacion"): "fundido" por defecto; "pop" para stickers divertidos o de impacto (fuego, cohete, confeti, corazones) que aparecen en un beat; "ninguna" para stickers que deben quedar quietos.
- Efectos de sonido ("efectos_sonido"): dan ritmo profesional. Recomendaciones: usa un pop.mp3 o ding.mp3 justo cuando aparece un texto clave o un sticker de impacto; un riser.mp3 unos segundos antes del clímax o del CTA; un shutter.mp3 en un momento "foto"; un tick.mp3 para cuentas regresivas o listas. Cada "en_segundo" va sobre la línea de tiempo del video FINAL editado y su "volumen" entre 0.3 y 0.7.
- NO abuses: máximo ~4 efectos puntuales en "efectos_sonido" ADEMÁS de los whoosh automáticos de transición.
- "whoosh_en_transiciones": usa true por defecto para dar ritmo (mete un whoosh automático en cada transición). Úsalo en false solo para videos muy calmados/elegantes o si no hay efectos disponibles.
- "subtitulos_estilo": si el video tiene voz/narración, elige "karaoke" (los subtítulos se generan solos por transcripción y se quemarán resaltados palabra por palabra, que retiene más). Usa "clasico" solo si prefieres bloques estáticos. Si el video NO tiene voz, deja "clasico" (se ignora). NO inventes el texto de los subtítulos: se rellena automáticamente desde la transcripción.
- "overlay_pro": true es el modo PROFESIONAL por defecto — los textos, subtítulos y stickers se renderizan como gráficos animados de nivel broadcast (entradas con resorte, karaoke con caja, CTA animado). Déjalo en true salvo que el usuario pida explícitamente un look básico o clásico.
- "barra_progreso": una barra de progreso arriba suele mejorar la retención en reels informativos, educativos o de listas/pasos — úsala en true en esos casos; false para vibras puramente estéticas, cinematográficas o de lifestyle contemplativo. Elige según la vibra del video.

Responde únicamente con el JSON solicitado.`;

  bloques.push({ type: "text", text: promptFinal });

  // El plan es un JSON grande y, con thinking adaptativo + 10 fotogramas, el
  // modelo gasta MUCHO presupuesto razonando antes de emitir el JSON: con
  // 8000/16000 tokens agotaba max_tokens dejando solo un bloque "thinking" y
  // ningún texto (stop_reason=max_tokens). Damos 32000 tokens para que quepan
  // el pensamiento y el JSON completo, y usamos streaming para no chocar con el
  // timeout HTTP del SDK a max_tokens alto (recomendación oficial > ~16K).
  const stream = client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: {
      format: { type: "json_schema", schema: EXECUTABLE_EDIT_PLAN_SCHEMA },
    },
    messages: [{ role: "user", content: bloques }],
  });
  const response = await stream.finalMessage();

  const plan = extraerPlan(response);
  // Guardar el estilo efectivo en el plan (prioridad: recibido → el que puso
  // la IA → "auto"). No afecta el render, solo deja rastro del preset usado.
  plan.estilo = estilo ?? plan.estilo ?? "auto";
  return plan;
}

// ---------- Generación del plan de PROYECTO (multi-fuente) con Claude ----------

// Material que runProjectEditJob prepara para la IA de proyecto: por cada
// video, su probe + fotogramas + transcripción (si tiene voz); cada foto y
// sticker del proyecto como miniatura JPEG; y las músicas subidas.
export interface MaterialVideoIA {
  asset: ProyectoAsset;
  probe: VideoProbe;
  frames: ExtractedFrame[];
  transcripcionTexto?: string;
}

export interface MaterialImagenIA {
  asset: ProyectoAsset; // tipo "foto" o "sticker"
  // Miniatura JPEG local para mandarla en base64 (null si no se pudo generar).
  rutaJpeg: string | null;
}

export interface MaterialesProyectoIA {
  videos: MaterialVideoIA[];
  imagenes: MaterialImagenIA[];
  musicas: ProyectoAsset[];
}

// Genera el plan ejecutable de un PROYECTO: la IA ve fotogramas de cada clip,
// cada foto/sticker y las transcripciones, y construye un reel MEZCLANDO los
// mejores momentos de todo el material. El esquema ancla los asset_id a enums
// reales del proyecto para que no se inventen ids.
export async function generateProjectPlan(
  proyecto: Proyecto,
  assets: ProyectoAsset[],
  instruccion: string | undefined,
  materiales: MaterialesProyectoIA,
  // Preset de estilo de edición (inyecta una receta creativa en el prompt).
  // Opcional: si falta se usa "auto" (la IA elige).
  estilo?: EstiloEdicion
): Promise<ExecutableEditPlan> {
  const client = getAnthropic();

  // Contenido mixto: metadatos + fotogramas de cada video, luego fotos y
  // stickers del proyecto, y al final el prompt con las reglas.
  const bloques: Anthropic.ContentBlockParam[] = [];

  for (const mv of materiales.videos) {
    const dur = Math.round(mv.probe.durationSeconds * 10) / 10;
    bloques.push({
      type: "text",
      text:
        `VIDEO del proyecto — asset_id: ${mv.asset.id}\n` +
        `Nombre: ${mv.asset.nombre} — Duración: ${dur} s — ` +
        `Resolución: ${mv.probe.width}x${mv.probe.height} — ` +
        `Audio: ${mv.probe.hasAudio ? "sí" : "no"}`,
    });
    for (const frame of mv.frames) {
      bloques.push({
        type: "text",
        text: `Fotograma del video ${mv.asset.id} en el segundo ${frame.timestamp.toFixed(1)} de ${dur}`,
      });
      bloques.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: fs.readFileSync(frame.filePath).toString("base64"),
        },
      });
    }
    if (mv.transcripcionTexto?.trim()) {
      bloques.push({
        type: "text",
        text:
          `Transcripción de la voz del video ${mv.asset.id}, con marcas [inicio-fin] en segundos de ESE video. ÚSALA para cortar por el habla (gancho, límites de frase, sin relleno):\n` +
          mv.transcripcionTexto.trim(),
      });
    }
  }

  for (const mi of materiales.imagenes) {
    const rol = mi.asset.tipo === "sticker" ? "STICKER" : "FOTO";
    bloques.push({
      type: "text",
      text: `${rol} del proyecto — asset_id: ${mi.asset.id} — Nombre: ${mi.asset.nombre}`,
    });
    if (mi.rutaJpeg && fs.existsSync(mi.rutaJpeg)) {
      bloques.push({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: fs.readFileSync(mi.rutaJpeg).toString("base64"),
        },
      });
    }
  }

  // Ids reales para los enums del esquema (anti-alucinación).
  const idsVideo = materiales.videos.map((m) => m.asset.id);
  const idsFoto = materiales.imagenes
    .filter((m) => m.asset.tipo === "foto")
    .map((m) => m.asset.id);
  const idsSticker = materiales.imagenes
    .filter((m) => m.asset.tipo === "sticker")
    .map((m) => m.asset.id);
  const idsMusica = materiales.musicas.map((m) => m.id);
  const idsSegmento = [...idsVideo, ...idsFoto];
  if (!idsSegmento.length) {
    throw new Error(
      "El proyecto no tiene videos ni fotos utilizables para editar"
    );
  }

  const listaMusicaProyecto = materiales.musicas.length
    ? materiales.musicas
        .map(
          (m) =>
            `- asset_id: ${m.id} — ${m.nombre}${m.duracion_seconds ? ` (${Math.round(m.duracion_seconds)} s)` : ""}`
        )
        .join("\n")
    : null;

  const hayVoz = materiales.videos.some((m) => m.transcripcionTexto?.trim());

  const promptFinal = `Eres un editor profesional de Instagram Reels.

${GUIA_EDICION_PROFESIONAL}

${recetaEstilo(estilo)}

Proyecto: ${proyecto.nombre}${proyecto.descripcion?.trim() ? `\nDescripción del proyecto: ${proyecto.descripcion.trim()}` : ""}
Material del proyecto (${assets.length} archivos en total): arriba tienes ${materiales.videos.length} video(s) con fotogramas y timestamps, ${idsFoto.length} foto(s), ${idsSticker.length} sticker(s) y las transcripciones de los videos con voz.

Instrucción del usuario:
${instruccion?.trim() ? instruccion.trim() : "Criterio libre: crea el Reel más atractivo posible mezclando este material."}

${
  listaMusicaProyecto
    ? `Música SUBIDA AL PROYECTO (PRIORÍZALA sobre la biblioteca: usa su id en "musica.asset_id" y deja "archivo": null):
${listaMusicaProyecto}`
    : 'El proyecto no tiene música subida: elige de la biblioteca ("musica.archivo") o usa null.'
}

${construirCatalogoMedios()}

Genera un plan de edición EJECUTABLE que MEZCLE los mejores momentos de los clips y las fotos del proyecto con calidad profesional, siguiendo estas reglas:
- USA TODO EL MATERIAL DEL PROYECTO: el usuario subió estos archivos PARA que aparezcan en el video. Cada VIDEO debe aportar al menos un segmento y cada FOTO debe aparecer, siempre que quepan en la duración objetivo. Solo si hay demasiado material para el tiempo disponible, prioriza lo mejor — pero representa la variedad (no armes el video con un solo archivo habiendo varios).
- Cada segmento DEBE llevar "asset_id" con el id EXACTO de un video o foto del proyecto (los listados arriba).
- Segmentos de VIDEO: "desde"/"hasta" son segundos DENTRO de ese video (respeta su duración). Elige los mejores momentos según lo que VES en sus fotogramas y lo que DICE su transcripción.
- Segmentos de FOTO: usa "desde": 0 y "hasta" = tiempo en pantalla, entre 1.5 y 3 segundos. Las fotos van SIEMPRE con "zoom" distinto de "ninguno" (Ken Burns: acercar/alejar/paneo) para que tengan vida. "velocidad": 1.
- Gancho: el PRIMER segmento debe ser el mejor momento de TODO el material y capturar la atención en menos de 1.5 segundos.
- Ritmo: CORTA AL RITMO, apunta a 0.8–2.5 s por segmento (más cortos, 0.8–1.5 s, en momentos de energía), entre 2 y 8 segmentos; duración final objetivo entre 15 y 45 segundos (salvo que la instrucción pida otra cosa).
- Alterna fuentes con intención (clip → foto → clip) cuando sume dinamismo, y ordena el material para contar la mejor historia.
- "velocidad": entre 0.5 y 2.0. Úsala con INTENCIÓN, no la dejes toda en 1: cámara lenta (0.5-0.8) en detalles/reveal para saborearlos, rápida (1.3-2.0) en tránsitos/manejo para dar energía. Speed-ramps con propósito.
- Transiciones: VARÍALAS poniendo "transicion" en CADA segmento (transición de ENTRADA; se ignora en el primero): whip/smooth ("smoothleft", "smoothright", "wipeleft") en energía, "dissolve"/"fade" en la calma, "zoomin" en un reveal de detalle. No las pongas todas iguales. La "transicion" global es solo el respaldo de los segmentos que no traigan la suya.
- "zoom" (Ken Burns) por segmento de video: en tomas FIJAS o largas para darles vida; "ninguno" si la toma ya tiene movimiento propio.
- "rotacion" por segmento: corrige tomas grabadas de lado mirando las CABEZAS en los fotogramas de ESE video (derecha → 90; izquierda → 270; invertida → 180; derecha ya de pie → 0).
- "reencuadre" por segmento: al recortar a 9:16 conserva al sujeto ("izquierda"/"derecha" si está a un lado del cuadro; "centro" si está al medio). No cortes caras.
- "formato": "vertical_9_16" por defecto.
- "audio_original": true si algún clip tiene voz o sonido valioso. "musica.volumen" entre 0.25 y 0.6; "volumen_original" entre 0.6 y 1.0 si hay narración (baja la música a 0.2–0.35); 0 si el usuario pide silenciar el original.
- Música: si el proyecto tiene música subida, ponla en "musica.asset_id" y deja "archivo": null; si no, elige de la biblioteca la pista cuyo mood calce con el material.
- "textos": entre 1 y 4 textos cortos en español (máximo 6 palabras, SIN emojis) sobre la línea de tiempo del video FINAL editado; el PRIMERO debe ser un gancho AUDAZ y potente que pare el scroll (una promesa, una cifra, una pregunta directa), no una descripción tibia. Máximo 2 fuentes distintas.
- Stickers: entre 0 y 4. Puedes usar stickers SUBIDOS al proyecto (pon su id en "asset_id" y su nombre en "archivo") o de la biblioteca ("asset_id": null y el nombre EXACTO de la biblioteca en "archivo"). Tiempos sobre el video FINAL editado.
- "subtitulos_estilo": ${hayVoz ? 'hay voz en el material — elige "karaoke" (los subtítulos se generan solos desde las transcripciones y se queman resaltados palabra por palabra)' : 'no se detectó voz — deja "clasico" (se ignora)'}. NO inventes el texto de los subtítulos.
- Efectos de sonido ("efectos_sonido") y "whoosh_en_transiciones": como en cualquier Reel profesional, con mesura (máximo ~4 efectos puntuales además de los whoosh de transición).
- "overlay_pro": true es el modo PROFESIONAL por defecto — los textos, subtítulos y stickers se renderizan como gráficos animados de nivel broadcast (entradas con resorte, karaoke con caja, CTA animado). Déjalo en true salvo que el usuario pida explícitamente un look básico o clásico.
- "barra_progreso": una barra de progreso arriba suele mejorar la retención en reels informativos, educativos o de listas/pasos — úsala en true en esos casos; false para vibras puramente estéticas, cinematográficas o de lifestyle contemplativo. Elige según la vibra del material.

Responde únicamente con el JSON solicitado.`;

  bloques.push({ type: "text", text: promptFinal });

  // Igual que generateExecutablePlan: el plan es un JSON grande y con thinking
  // adaptativo el modelo necesita presupuesto amplio; streaming para no chocar
  // con el timeout HTTP del SDK a max_tokens alto.
  const stream = client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: {
      format: {
        type: "json_schema",
        schema: construirSchemaProyecto(idsSegmento, idsMusica, idsSticker),
      },
    },
    messages: [{ role: "user", content: bloques }],
  });
  const response = await stream.finalMessage();

  const plan = extraerPlan(response);
  // Guardar el estilo efectivo en el plan (prioridad: recibido → el que puso
  // la IA → "auto").
  plan.estilo = estilo ?? plan.estilo ?? "auto";
  return plan;
}

// ---------- Mapeo de subtítulos: tiempo ORIGINAL → tiempo FINAL "ingenuo" ----------

type SegmentoPlan = ExecutableEditPlan["segmentos"][number];

// Convierte un segundo del video ORIGINAL a la línea de tiempo FINAL "ingenua"
// (suma de duraciones de segmentos ajustadas por velocidad, SIN considerar la
// compresión de las transiciones — igual que los tiempos de textos/stickers).
// Recorre los segmentos en orden acumulando su duración final; si el segundo
// cae dentro de [desde, hasta) de un segmento, devuelve la posición proporcional
// dentro de ese segmento. Si cae en un corte (no pertenece a ningún segmento
// conservado), devuelve null.
export function mapearTiempoOriginalAFinal(
  segundoOriginal: number,
  segmentos: SegmentoPlan[]
): number | null {
  let salidaAcum = 0;
  for (const seg of segmentos) {
    const velocidad = seg.velocidad || 1;
    const duracionFinal = (seg.hasta - seg.desde) / velocidad;
    if (segundoOriginal >= seg.desde && segundoOriginal < seg.hasta) {
      return salidaAcum + (segundoOriginal - seg.desde) / velocidad;
    }
    salidaAcum += duracionFinal;
  }
  return null;
}

// Proyecta UN cue (en tiempo de SU fuente original) sobre UN segmento del
// plan, dado el offset acumulado (salidaAcum) de los segmentos previos en la
// línea FINAL "ingenua". Recorta el cue al tramo del segmento y mapea sus
// palabras (karaoke) con el mismo desfase, descartando las que caen en un
// corte. Devuelve null si el cue no solapa con el segmento.
function proyectarCueEnSegmento(
  cue: SubtituloCue,
  seg: SegmentoPlan,
  salidaAcum: number
): SubtituloCue | null {
  const velocidad = seg.velocidad || 1;

  // Intersección del cue con el rango original del segmento.
  const inicioSolape = Math.max(cue.desde, seg.desde);
  const finSolape = Math.min(cue.hasta, seg.hasta);
  if (finSolape <= inicioSolape) return null;

  const texto = cue.texto.trim();
  if (!texto) return null;

  // Posición dentro del segmento (ya en tiempo final) sumada al acumulado.
  const desdeFinal = salidaAcum + (inicioSolape - seg.desde) / velocidad;
  const hastaFinal = salidaAcum + (finSolape - seg.desde) / velocidad;
  if (hastaFinal <= desdeFinal) return null;

  const cueFinal: SubtituloCue = {
    texto,
    desde: desdeFinal,
    hasta: hastaFinal,
  };

  // Mapear palabras (karaoke) que caen dentro de ESTE tramo del segmento.
  if (cue.palabras?.length) {
    const palabrasFinal: NonNullable<SubtituloCue["palabras"]> = [];
    for (const p of cue.palabras) {
      const palabra = p.palabra.trim();
      if (!palabra) continue;
      // La palabra debe solapar con el tramo original conservado.
      const pIni = Math.max(p.desde, inicioSolape);
      const pFin = Math.min(p.hasta, finSolape);
      if (pFin <= pIni) continue; // cae en un corte (o fuera del tramo)
      // Mapear a tiempo final y recortar a los límites del cue final.
      const pDesde = Math.max(
        desdeFinal,
        salidaAcum + (pIni - seg.desde) / velocidad
      );
      const pHasta = Math.min(
        hastaFinal,
        salidaAcum + (pFin - seg.desde) / velocidad
      );
      if (pHasta > pDesde) {
        palabrasFinal.push({ desde: pDesde, hasta: pHasta, palabra });
      }
    }
    if (palabrasFinal.length) cueFinal.palabras = palabrasFinal;
  }

  return cueFinal;
}

// Mapea una lista de cues en tiempo ORIGINAL a cues en la línea de tiempo FINAL
// "ingenua". Por cada cue [a,b], recorta contra cada segmento que solape con él
// y emite un cue en tiempo final por cada tramo solapado (así un subtítulo que
// abarca un corte se parte en los pedazos que efectivamente quedan en el video).
// Los tramos que caen fuera de todos los segmentos se omiten. Cuando el cue
// trae palabras[] (karaoke), cada palabra se mapea con el mismo desfase del
// segmento, se descartan las que caen en un corte y se recortan a los límites
// del tramo final.
export function mapearSubtitulos(
  cuesOriginales: SubtituloCue[],
  segmentos: SegmentoPlan[]
): SubtituloCue[] {
  const resultado: SubtituloCue[] = [];
  let salidaAcum = 0;

  for (const seg of segmentos) {
    const velocidad = seg.velocidad || 1;
    for (const cue of cuesOriginales) {
      const proyectado = proyectarCueEnSegmento(cue, seg, salidaAcum);
      if (proyectado) resultado.push(proyectado);
    }
    salidaAcum += (seg.hasta - seg.desde) / velocidad;
  }

  // Ordenar por tiempo de inicio (los segmentos pueden reordenar el original).
  resultado.sort((a, b) => a.desde - b.desde);
  return resultado;
}

// Versión MULTI-FUENTE del mapeo: cada segmento con asset_id de video toma los
// cues de la transcripción de ESE asset (cuesPorAsset) que caen dentro de su
// [desde, hasta] y los proyecta a la línea FINAL con el offset acumulado de los
// segmentos previos (ajustado por velocidad). Los segmentos sin transcripción
// (fotos, videos sin voz, modo clásico) solo corren el offset.
export function mapearSubtitulosMultiFuente(
  segmentos: SegmentoPlan[],
  cuesPorAsset: Record<string, SubtituloCue[]>
): SubtituloCue[] {
  const resultado: SubtituloCue[] = [];
  let salidaAcum = 0;

  for (const seg of segmentos) {
    const velocidad = seg.velocidad || 1;
    const cues = seg.asset_id ? (cuesPorAsset[seg.asset_id] ?? []) : [];
    for (const cue of cues) {
      const proyectado = proyectarCueEnSegmento(cue, seg, salidaAcum);
      if (proyectado) resultado.push(proyectado);
    }
    salidaAcum += (seg.hasta - seg.desde) / velocidad;
  }

  resultado.sort((a, b) => a.desde - b.desde);
  return resultado;
}

// ---------- Orquestador del trabajo de edición ----------

const CANTIDAD_FOTOGRAMAS = 10;

// Detecta si el usuario pide EXPLÍCITAMENTE que NO haya subtítulos. Por defecto
// (edición profesional) se ponen subtítulos cuando el video tiene voz; este
// opt-out los desactiva. Ej: "sin subtítulos", "no subtitulos", "sin captions".
const REGEX_SIN_SUBTITULOS =
  /\b(sin|no)\b[^.]{0,20}\b(subt[ií]tulos?|subtitles?|captions?)\b/i;

// Ejecuta el trabajo completo: descarga desde Drive, analiza, genera el plan
// con Claude, renderiza con ffmpeg y sube el resultado a Supabase Storage.
// Actualiza la fila de `edits` con el progreso y el resultado (o el error).
export async function runEditJob(editId: string): Promise<void> {
  const supabase = getSupabaseServer();
  const dirTemporal = path.join(os.tmpdir(), "edits", editId);

  try {
    // 1. Leer el trabajo de edición y su video asociado.
    const { data: editData, error: editError } = await supabase
      .from("edits")
      .select("*")
      .eq("id", editId)
      .single();
    if (editError || !editData) {
      throw new Error(`No se encontró el trabajo de edición ${editId}`);
    }
    const edit = editData as EditJob;

    const { data: videoData, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", edit.video_id)
      .single();
    if (videoError || !videoData) {
      throw new Error("No se encontró el video asociado al trabajo de edición");
    }
    const video = videoData as VideoAsset;

    // 2. Directorio temporal del trabajo.
    fs.mkdirSync(dirTemporal, { recursive: true });

    // 3. Descargar el video original desde Google Drive.
    const rutaOriginal = path.join(dirTemporal, "original.mp4");
    await downloadDriveFile(video.drive_file_id, rutaOriginal);

    // 4. Analizar el video y extraer fotogramas para que Claude los vea.
    const probe = await probeVideo(rutaOriginal);
    const frames = await extractFrames(
      rutaOriginal,
      path.join(dirTemporal, "frames"),
      CANTIDAD_FOTOGRAMAS,
      probe.durationSeconds
    );

    // 5. Transcribir la voz del original ANTES de llamar a la IA (best-effort).
    //    Si hay voz, se le pasa el texto con tiempos a Claude para que CORTE por
    //    el habla (gancho, límites de frase, sin relleno). Guardamos los cues
    //    originales para, tras el plan, mapearlos a subtítulos. Todo en
    //    try/catch: si whisper falla o no está disponible, se sigue sin voz.
    const usuarioNoQuiereSubtitulos = edit.instruccion
      ? REGEX_SIN_SUBTITULOS.test(edit.instruccion)
      : false;

    let cuesOriginales: SubtituloCue[] = [];
    let transcripcionTexto: string | undefined;
    try {
      cuesOriginales = await transcribirVideo(rutaOriginal, "es");
      if (cuesOriginales.length) {
        transcripcionTexto = construirTextoTranscripcion(cuesOriginales);
      }
    } catch (errTrans) {
      console.warn(
        `[editor] Transcripción no disponible para ${editId}:`,
        errTrans instanceof Error ? errTrans.message : errTrans
      );
    }

    // 6. Generar el plan ejecutable (con la transcripción si la hubo) y
    //    guardarlo de inmediato (la UI puede mostrarlo mientras se renderiza).
    const { estilo, instruccionLimpia } = extraerEstilo(edit.instruccion);
    const plan = await generateExecutablePlan(
      video,
      instruccionLimpia,
      probe,
      frames,
      transcripcionTexto,
      estilo
    );

    // 6b. Si hay voz y el usuario NO pidió quitar los subtítulos, mapear los
    //     cues (con sus palabras para karaoke) a la línea de tiempo del plan.
    //     Si la IA no fijó un estilo y hay palabras, ponerlo en "karaoke".
    if (cuesOriginales.length && !usuarioNoQuiereSubtitulos) {
      try {
        const subtitulos = mapearSubtitulos(cuesOriginales, plan.segmentos);
        if (subtitulos.length) {
          plan.subtitulos = subtitulos;
          const hayPalabras = subtitulos.some((c) => c.palabras?.length);
          if (!plan.subtitulos_estilo && hayPalabras) {
            plan.subtitulos_estilo = "karaoke";
          }
        }
      } catch (errSub) {
        console.warn(
          `[editor] Subtítulos omitidos para ${editId}:`,
          errSub instanceof Error ? errSub.message : errSub
        );
      }
    } else if (usuarioNoQuiereSubtitulos) {
      // El usuario pidió explícitamente sin subtítulos: no los pongas.
      plan.subtitulos = [];
    }

    await supabase.from("edits").update({ plan }).eq("id", editId);

    // 7. Renderizar el video editado con ffmpeg (multi-pase en dirTemporal).
    const rutaEditado = path.join(dirTemporal, "editado.mp4");
    await renderEditPlan(rutaOriginal, plan, rutaEditado, probe, dirTemporal);

    // 8. Subir a Supabase Storage y marcar como completado.
    const outputUrl = await uploadEditedVideo(rutaEditado, `${editId}.mp4`);
    await supabase
      .from("edits")
      .update({ status: "completado", output_url: outputUrl })
      .eq("id", editId);
  } catch (err) {
    const mensaje =
      err instanceof Error ? err.message : "Error desconocido durante la edición";
    console.error(`[editor] Trabajo ${editId} falló:`, mensaje);
    await supabase
      .from("edits")
      .update({ status: "error", error: mensaje })
      .eq("id", editId);
  } finally {
    // Limpiar el directorio temporal pase lo que pase.
    fs.rmSync(dirTemporal, { recursive: true, force: true });
  }
}

// ---------- Edición de PROYECTOS (multi-fuente) ----------

// Extensión razonable para el archivo local de un asset (por nombre, ruta de
// storage o tipo), para que ffmpeg/whisper reconozcan el formato.
function extensionDeAsset(asset: ProyectoAsset): string {
  const porNombre = path.extname(asset.nombre ?? "").toLowerCase();
  if (/^\.[a-z0-9]{2,5}$/.test(porNombre)) return porNombre;
  const porRuta = path.extname(asset.storage_path ?? "").toLowerCase();
  if (/^\.[a-z0-9]{2,5}$/.test(porRuta)) return porRuta;
  switch (asset.tipo) {
    case "video":
      return ".mp4";
    case "musica":
    case "audio":
      return ".mp3";
    case "sticker":
      return ".png";
    default:
      return ".jpg";
  }
}

// Descarga un archivo por HTTP a disco y valida que llegó contenido real.
async function descargarArchivo(
  url: string,
  destino: string,
  headers?: Record<string, string>
): Promise<void> {
  const respuesta = await fetch(url, headers ? { headers } : undefined);
  if (!respuesta.ok) {
    throw new Error(`la descarga respondió HTTP ${respuesta.status}`);
  }
  const buffer = Buffer.from(await respuesta.arrayBuffer());
  if (buffer.byteLength < 100) {
    throw new Error("el archivo descargado está vacío o corrupto");
  }
  fs.writeFileSync(destino, buffer);
}

// URL efectiva para descargar un asset por HTTP: los assets "mini:" pueden
// guardar un public_url RELATIVO (/api/media/archivo/...) que, si no estamos
// en la instancia dueña del archivo, se resuelve contra RENDER_BACKEND_URL.
// Las URLs absolutas (Supabase o mini con dominio) se usan tal cual.
function urlDescargaDeAsset(asset: ProyectoAsset): string {
  const url = asset.public_url ?? "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/") && process.env.RENDER_BACKEND_URL) {
    return urlBackend(url);
  }
  return url;
}

// Materializa un asset del proyecto en `destino`. Los assets "mini:" (videos
// grandes) viven en el DISCO LOCAL de la instancia que corre el motor: si el
// archivo existe acá, se copia directo (cero red — estamos EN el mini o en
// local); si no existe (p. ej. el motor local probando un asset guardado en el
// mini), se descarga por HTTP desde su public_url con Bearer (la ruta
// /api/media ya sirve Range/200). El resto de assets (Supabase Storage) se
// descarga por HTTP como siempre.
async function materializarAsset(
  asset: ProyectoAsset,
  destino: string
): Promise<void> {
  if (asset.storage_path?.startsWith("mini:")) {
    const rutaLocal = rutaLocalDeAsset(asset.storage_path);
    if (rutaLocal && fs.existsSync(rutaLocal)) {
      await fs.promises.copyFile(rutaLocal, destino);
      console.log(
        `[editor] Asset ${asset.id} ("${asset.nombre}"): copiado del disco local (${asset.storage_path})`
      );
      return;
    }
    console.log(
      `[editor] Asset ${asset.id} ("${asset.nombre}"): es "mini:" pero no está en este disco — se descarga por HTTP desde su public_url`
    );
    const cabeceras = process.env.BACKEND_SECRET
      ? { authorization: `Bearer ${process.env.BACKEND_SECRET}` }
      : undefined;
    await descargarArchivo(urlDescargaDeAsset(asset), destino, cabeceras);
    return;
  }
  await descargarArchivo(asset.public_url, destino);
}

// Descarga (o copia desde el disco local, si es "mini:") un asset del proyecto
// a dirTemporal (si no estaba ya) y lo registra en rutasAssets con su tipo.
// Devuelve la ruta local.
async function descargarAsset(
  asset: ProyectoAsset,
  dirTemporal: string,
  rutasAssets: Record<string, AssetRender>
): Promise<string> {
  const destino = path.join(
    dirTemporal,
    `asset-${asset.id}${extensionDeAsset(asset)}`
  );
  if (!fs.existsSync(destino)) {
    try {
      await materializarAsset(asset, destino);
    } catch (err) {
      throw new Error(
        `No se pudo descargar el asset "${asset.nombre}": ${err instanceof Error ? err.message : err}`
      );
    }
  }
  rutasAssets[asset.id] = { ruta: destino, tipo: asset.tipo };
  return destino;
}

// Descarga a dirTemporal los assets que un plan de proyecto referencia
// (segmentos, música y stickers) y devuelve el mapa para renderEditPlan.
// Si un asset de música/sticker falla solo se pierde ese extra; si falla uno
// de segmento, el render lo reportará con un mensaje claro.
async function descargarAssetsDelPlan(
  projectId: string,
  plan: ExecutableEditPlan,
  dirTemporal: string
): Promise<Record<string, AssetRender>> {
  const ids = new Set<string>();
  for (const s of plan.segmentos ?? []) if (s.asset_id) ids.add(s.asset_id);
  if (plan.musica?.asset_id) ids.add(plan.musica.asset_id);
  for (const st of plan.stickers ?? []) if (st.asset_id) ids.add(st.asset_id);
  if (!ids.size) return {};

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("project_assets")
    .select("*")
    .eq("project_id", projectId)
    .in("id", [...ids]);
  if (error) {
    throw new Error(
      `No se pudieron leer los assets del proyecto: ${mensajeErrorPostgrest(error.message)}`
    );
  }

  const rutasAssets: Record<string, AssetRender> = {};
  for (const asset of (data ?? []) as ProyectoAsset[]) {
    try {
      await descargarAsset(asset, dirTemporal, rutasAssets);
    } catch (err) {
      console.warn(
        `[editor] Asset ${asset.id} ("${asset.nombre}") no disponible:`,
        err instanceof Error ? err.message : err
      );
      delete rutasAssets[asset.id];
    }
  }
  return rutasAssets;
}

// Límites del material que se le muestra a la IA de proyecto.
const MAX_VIDEOS_PROYECTO = 8;
const MAX_IMAGENES_PROYECTO = 16;
const FOTOGRAMAS_POR_VIDEO_PROYECTO = 4;

// Ejecuta el trabajo completo de un PROYECTO: descarga el material desde
// Supabase Storage, lo analiza (probe + fotogramas + transcripciones), genera
// el plan multi-fuente con Claude, mapea los subtítulos de CADA video a la
// línea final, renderiza con ffmpeg y sube el resultado. Actualiza la fila de
// `edits` con el progreso y el resultado (o el error).
export async function runProjectEditJob(editId: string): Promise<void> {
  const supabase = getSupabaseServer();
  const dirTemporal = path.join(os.tmpdir(), "edits", editId);

  try {
    // 1. Leer el trabajo de edición (debe pertenecer a un proyecto).
    const { data: editData, error: editError } = await supabase
      .from("edits")
      .select("*")
      .eq("id", editId)
      .single();
    if (editError || !editData) {
      throw new Error(`No se encontró el trabajo de edición ${editId}`);
    }
    const edit = editData as EditJob;
    if (!edit.project_id) {
      throw new Error("El trabajo de edición no pertenece a un proyecto");
    }

    // 2. Leer el proyecto y sus assets.
    const { data: proyectoData, error: proyectoError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", edit.project_id)
      .single();
    if (proyectoError || !proyectoData) {
      throw new Error(
        `No se encontró el proyecto de la edición${proyectoError ? `: ${mensajeErrorPostgrest(proyectoError.message)}` : ""}`
      );
    }
    const proyecto = proyectoData as Proyecto;

    const { data: assetsData, error: assetsError } = await supabase
      .from("project_assets")
      .select("*")
      .eq("project_id", edit.project_id)
      .order("created_at", { ascending: true });
    if (assetsError) {
      throw new Error(
        `No se pudieron leer los assets del proyecto: ${mensajeErrorPostgrest(assetsError.message)}`
      );
    }
    const assets = (assetsData ?? []) as ProyectoAsset[];

    const todosVideos = assets.filter((a) => a.tipo === "video");
    const todasImagenes = assets.filter(
      (a) => a.tipo === "foto" || a.tipo === "sticker"
    );
    const videos = todosVideos.slice(0, MAX_VIDEOS_PROYECTO);
    const imagenes = todasImagenes.slice(0, MAX_IMAGENES_PROYECTO);
    const musicas = assets.filter((a) => a.tipo === "musica");

    // La idea del proyecto es que la IA use TODO su contenido. Si hay más
    // material del que podemos analizar (costo/latencia), lo dejamos claro en
    // los logs para que el usuario sepa que el excedente no participa.
    if (todosVideos.length > videos.length) {
      console.warn(
        `[proyecto] ${todosVideos.length - videos.length} video(s) exceden el tope de análisis (${MAX_VIDEOS_PROYECTO}) y no participarán de esta edición.`
      );
    }
    if (todasImagenes.length > imagenes.length) {
      console.warn(
        `[proyecto] ${todasImagenes.length - imagenes.length} imagen(es) exceden el tope de análisis (${MAX_IMAGENES_PROYECTO}) y no participarán de esta edición.`
      );
    }

    if (!videos.length && !imagenes.some((a) => a.tipo === "foto")) {
      throw new Error(
        "El proyecto no tiene videos ni fotos para editar: sube material primero"
      );
    }

    fs.mkdirSync(dirTemporal, { recursive: true });

    // 3. Descargar el material candidato y preparar lo que la IA verá.
    const rutasAssets: Record<string, AssetRender> = {};
    const materialesVideos: MaterialVideoIA[] = [];
    const cuesPorAsset: Record<string, SubtituloCue[]> = {};

    for (const [i, asset] of videos.entries()) {
      try {
        const ruta = await descargarAsset(asset, dirTemporal, rutasAssets);
        const probeAsset = await probeVideo(ruta);
        rutasAssets[asset.id].probe = probeAsset;
        const frames = await extractFrames(
          ruta,
          path.join(dirTemporal, `frames-${i}`),
          FOTOGRAMAS_POR_VIDEO_PROYECTO,
          probeAsset.durationSeconds
        );

        // Transcripción best-effort: si whisper falla o no hay voz, se sigue.
        let transcripcionTexto: string | undefined;
        if (probeAsset.hasAudio) {
          try {
            const cues = await transcribirVideo(ruta, "es");
            if (cues.length) {
              cuesPorAsset[asset.id] = cues;
              transcripcionTexto = construirTextoTranscripcion(cues);
            }
          } catch (errTrans) {
            console.warn(
              `[editor] Transcripción no disponible para el asset ${asset.id}:`,
              errTrans instanceof Error ? errTrans.message : errTrans
            );
          }
        }

        materialesVideos.push({
          asset,
          probe: probeAsset,
          frames,
          transcripcionTexto,
        });
      } catch (errVideo) {
        console.warn(
          `[editor] Se omite el video "${asset.nombre}" del proyecto:`,
          errVideo instanceof Error ? errVideo.message : errVideo
        );
        delete rutasAssets[asset.id];
      }
    }

    const materialesImagenes: MaterialImagenIA[] = [];
    for (const asset of imagenes) {
      try {
        const ruta = await descargarAsset(asset, dirTemporal, rutasAssets);
        let rutaJpeg: string | null = path.join(
          dirTemporal,
          `mini-${asset.id}.jpg`
        );
        try {
          await convertirImagenAJpeg(ruta, rutaJpeg);
        } catch (errJpeg) {
          console.warn(
            `[editor] No se pudo generar la miniatura de "${asset.nombre}":`,
            errJpeg instanceof Error ? errJpeg.message : errJpeg
          );
          rutaJpeg = null;
        }
        materialesImagenes.push({ asset, rutaJpeg });
      } catch (errImg) {
        console.warn(
          `[editor] Se omite la imagen "${asset.nombre}" del proyecto:`,
          errImg instanceof Error ? errImg.message : errImg
        );
        delete rutasAssets[asset.id];
      }
    }

    const musicasDisponibles: ProyectoAsset[] = [];
    for (const asset of musicas) {
      try {
        await descargarAsset(asset, dirTemporal, rutasAssets);
        musicasDisponibles.push(asset);
      } catch (errMus) {
        console.warn(
          `[editor] Se omite la música "${asset.nombre}" del proyecto:`,
          errMus instanceof Error ? errMus.message : errMus
        );
        delete rutasAssets[asset.id];
      }
    }

    if (
      !materialesVideos.length &&
      !materialesImagenes.some((m) => m.asset.tipo === "foto")
    ) {
      throw new Error(
        "No se pudo descargar ningún video ni foto del proyecto desde Storage"
      );
    }

    // 4. Generar el plan multi-fuente con la IA y guardarlo de inmediato.
    const usuarioNoQuiereSubtitulos = edit.instruccion
      ? REGEX_SIN_SUBTITULOS.test(edit.instruccion)
      : false;

    const { estilo, instruccionLimpia } = extraerEstilo(edit.instruccion);
    const plan = await generateProjectPlan(
      proyecto,
      assets,
      instruccionLimpia,
      {
        videos: materialesVideos,
        imagenes: materialesImagenes,
        musicas: musicasDisponibles,
      },
      estilo
    );

    // 5. Subtítulos MULTI-FUENTE: los cues de cada video se proyectan a la
    //    línea final según los segmentos del plan (las fotos corren el offset).
    if (Object.keys(cuesPorAsset).length && !usuarioNoQuiereSubtitulos) {
      try {
        const subtitulos = mapearSubtitulosMultiFuente(
          plan.segmentos,
          cuesPorAsset
        );
        if (subtitulos.length) {
          plan.subtitulos = subtitulos;
          const hayPalabras = subtitulos.some((c) => c.palabras?.length);
          if (!plan.subtitulos_estilo && hayPalabras) {
            plan.subtitulos_estilo = "karaoke";
          }
        }
      } catch (errSub) {
        console.warn(
          `[editor] Subtítulos omitidos para ${editId}:`,
          errSub instanceof Error ? errSub.message : errSub
        );
      }
    } else if (usuarioNoQuiereSubtitulos) {
      plan.subtitulos = [];
    }

    await supabase.from("edits").update({ plan }).eq("id", editId);

    // 6. Render multi-fuente (sin video único) y subida del resultado.
    const rutaEditado = path.join(dirTemporal, "editado.mp4");
    await renderEditPlan(null, plan, rutaEditado, null, dirTemporal, rutasAssets);

    const outputUrl = await uploadEditedVideo(rutaEditado, `${editId}.mp4`);
    await supabase
      .from("edits")
      .update({ status: "completado", output_url: outputUrl })
      .eq("id", editId);
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error desconocido durante la edición del proyecto";
    console.error(`[editor] Trabajo de proyecto ${editId} falló:`, mensaje);
    await supabase
      .from("edits")
      .update({ status: "error", error: mensaje })
      .eq("id", editId);
  } finally {
    fs.rmSync(dirTemporal, { recursive: true, force: true });
  }
}

// Transcribe los assets de VIDEO que referencia el plan de un edit de proyecto
// y devuelve los subtítulos ya mapeados a la línea de tiempo FINAL del plan
// (multi-fuente). Reutiliza el mismo mapeo que runProjectEditJob. Los videos
// que fallen individualmente se omiten con una advertencia. Lo usa
// POST /api/ai/transcribe cuando el edit pertenece a un proyecto.
export async function transcribirSubtitulosProyecto(
  projectId: string,
  plan: ExecutableEditPlan,
  idioma: string,
  dirTemporal: string
): Promise<SubtituloCue[]> {
  const ids = [
    ...new Set(
      (plan.segmentos ?? [])
        .map((s) => s.asset_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (!ids.length) return [];

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("project_assets")
    .select("*")
    .eq("project_id", projectId)
    .in("id", ids);
  if (error) {
    throw new Error(
      `No se pudieron leer los assets del proyecto: ${mensajeErrorPostgrest(error.message)}`
    );
  }

  const videos = ((data ?? []) as ProyectoAsset[]).filter(
    (a) => a.tipo === "video"
  );
  const rutasAssets: Record<string, AssetRender> = {};
  const cuesPorAsset: Record<string, SubtituloCue[]> = {};
  for (const asset of videos) {
    try {
      const ruta = await descargarAsset(asset, dirTemporal, rutasAssets);
      const cues = await transcribirVideo(ruta, idioma);
      if (cues.length) cuesPorAsset[asset.id] = cues;
    } catch (err) {
      console.warn(
        `[editor] No se pudo transcribir el asset ${asset.id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return mapearSubtitulosMultiFuente(plan.segmentos, cuesPorAsset);
}

// Re-renderiza un edit con un plan YA dado, SIN llamar a la IA. Lo usa el
// endpoint POST /api/edits/rerender cuando el usuario ajusta el plan a mano
// (incluyendo la edición de subtítulos) y quiere volver a generar el MP4.
// Rama clásica: descarga el original desde Drive, lo analiza y renderiza.
// Rama PROYECTO (edit.project_id): descarga los assets que el plan referencia
// y renderiza multi-fuente. En ambas sube el resultado y actualiza la fila de
// `edits`. Gestiona sus propios errores dejando la fila en status 'error'.
export async function renderFromPlan(
  editId: string,
  plan: ExecutableEditPlan
): Promise<void> {
  const supabase = getSupabaseServer();
  const dirTemporal = path.join(os.tmpdir(), "edits", editId);

  try {
    // 1. Leer el trabajo de edición.
    const { data: editData, error: editError } = await supabase
      .from("edits")
      .select("*")
      .eq("id", editId)
      .single();
    if (editError || !editData) {
      throw new Error(`No se encontró el trabajo de edición ${editId}`);
    }
    const edit = editData as EditJob;

    // 2. Marcar como procesando y guardar el plan recibido de inmediato.
    await supabase
      .from("edits")
      .update({ status: "procesando", error: null, plan })
      .eq("id", editId);

    fs.mkdirSync(dirTemporal, { recursive: true });
    const rutaEditado = path.join(dirTemporal, "editado.mp4");

    if (edit.project_id) {
      // 3a. Rama PROYECTO: descargar los assets referenciados por el plan y
      //     renderizar multi-fuente (sin video único).
      const rutasAssets = await descargarAssetsDelPlan(
        edit.project_id,
        plan,
        dirTemporal
      );
      await renderEditPlan(null, plan, rutaEditado, null, dirTemporal, rutasAssets);
    } else {
      // 3b. Rama CLÁSICA: descarga del original desde Google Drive, análisis
      //     y render con el plan RECIBIDO (sin IA).
      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select("*")
        .eq("id", edit.video_id)
        .single();
      if (videoError || !videoData) {
        throw new Error("No se encontró el video asociado al trabajo de edición");
      }
      const video = videoData as VideoAsset;

      const rutaOriginal = path.join(dirTemporal, "original.mp4");
      await downloadDriveFile(video.drive_file_id, rutaOriginal);
      const probe = await probeVideo(rutaOriginal);
      await renderEditPlan(rutaOriginal, plan, rutaEditado, probe, dirTemporal);
    }

    // 4. Subir el resultado y marcar como completado.
    const outputUrl = await uploadEditedVideo(rutaEditado, `${editId}.mp4`);
    await supabase
      .from("edits")
      .update({ status: "completado", output_url: outputUrl, plan })
      .eq("id", editId);
  } catch (err) {
    const mensaje =
      err instanceof Error
        ? err.message
        : "Error desconocido durante el re-render";
    console.error(`[editor] Re-render ${editId} falló:`, mensaje);
    await supabase
      .from("edits")
      .update({ status: "error", error: mensaje })
      .eq("id", editId);
  } finally {
    // Limpiar el directorio temporal pase lo que pase.
    fs.rmSync(dirTemporal, { recursive: true, force: true });
  }
}
