import type Anthropic from "@anthropic-ai/sdk";
import { normalizarImagen } from "./imagen";
import { getAnthropic, CLAUDE_MODEL } from "./anthropic";
import { listarFuentes } from "./medios";
import type {
  FormatoPost,
  PostDesignPlan,
  Proyecto,
  ProyectoAsset,
} from "./types";

// Diseñador de POSTS con IA (Claude visión): la IA compone carruseles o
// imágenes únicas usando las FOTOS del proyecto + textos, formas y stickers,
// bajo la filosofía "diseño como JSON". Genera un PostDesignPlan que la capa
// Remotion renderiza a PNG (uno por slide). Este archivo SOLO genera el plan;
// el llamador valida/renderiza.

// ---------- Dimensiones del lienzo por formato ----------

// El ancho es SIEMPRE 1080; el alto depende del formato. El tamaño de fuente
// que devuelve la IA está expresado en px sobre este lienzo de 1080 de ancho.
const DIMENSIONES: Record<FormatoPost, { ancho: number; alto: number }> = {
  cuadrado_1_1: { ancho: 1080, alto: 1080 },
  vertical_4_5: { ancho: 1080, alto: 1350 },
  historia_9_16: { ancho: 1080, alto: 1920 },
};

const ETIQUETA_FORMATO: Record<FormatoPost, string> = {
  cuadrado_1_1: "cuadrado 1:1 (feed)",
  vertical_4_5: "vertical 4:5 (feed, ocupa más pantalla)",
  historia_9_16: "historia/reel 9:16 (pantalla completa)",
};

// ---------- Esquema JSON estricto de PostDesignPlan ----------

// additionalProperties:false y required completos en cada nivel. Cada tipo de
// bloque (texto|imagen|forma|sticker) es una rama del oneOf, discriminada por
// "tipo" (const). Las coordenadas x/y/ancho/alto van en % (0–100); el tamaño de
// fuente en px sobre el lienzo de 1080; sticker.escala como % del ancho.
function construirSchemaPost(
  formato: FormatoPost,
  nSlides: number
): Record<string, unknown> {
  const bloqueTexto = {
    type: "object",
    additionalProperties: false,
    required: [
      "tipo",
      "texto",
      "x",
      "y",
      "ancho",
      "tamano",
      "peso",
      "color",
      "fuente",
      "alineacion",
      "caja",
    ],
    properties: {
      tipo: { type: "string", const: "texto" },
      texto: {
        type: "string",
        description: "Texto en español, corto y con jerarquía. Sin emojis.",
      },
      x: { type: "number", description: "Posición X de la esquina superior izquierda, en % del ancho (0–100)." },
      y: { type: "number", description: "Posición Y de la esquina superior izquierda, en % del alto (0–100)." },
      ancho: {
        type: "number",
        description:
          "Ancho de la caja de texto en % del lienzo (0–100); el texto se ajusta y salta de línea dentro.",
      },
      tamano: {
        type: "number",
        description:
          "Tamaño de fuente en px sobre el lienzo de 1080 de ancho. Títulos 70–130; subtítulos 40–64; cuerpo/CTA 28–44.",
      },
      peso: {
        type: "string",
        enum: ["normal", "bold", "black"],
        description: 'Grosor tipográfico: "black" para titulares potentes, "bold" para subtítulos, "normal" para cuerpo.',
      },
      color: { type: "string", description: "Color del texto en hex (ej. #FFFFFF). Alto contraste con el fondo." },
      fuente: {
        type: ["string", "null"],
        description:
          'Nombre EXACTO de una fuente de la biblioteca (ej. "impacto.ttf") o null para la del sistema. Máximo 2 fuentes en todo el carrusel.',
      },
      alineacion: {
        type: "string",
        enum: ["izquierda", "centro", "derecha"],
        description: "Alineación horizontal del texto dentro de su caja.",
      },
      caja: {
        anyOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["color", "radio"],
            properties: {
              color: { type: "string", description: "Color de la pastilla/caja detrás del texto, en hex (puede incluir alfa, ej. #000000CC)." },
              radio: { type: "number", description: "Radio de las esquinas de la pastilla en px (0 = recto)." },
            },
          },
          { type: "null" },
        ],
        description:
          "Pastilla de fondo detrás del texto para legibilidad sobre fotos, o null si no lleva. Úsala cuando el texto va sobre una imagen con detalle.",
      },
    },
  };

  const bloqueImagen = {
    type: "object",
    additionalProperties: false,
    required: ["tipo", "asset_id", "x", "y", "ancho", "alto", "ajuste", "radio", "sin_fondo"],
    properties: {
      tipo: { type: "string", const: "imagen" },
      asset_id: {
        type: "string",
        description:
          "Id EXACTO de una foto/sticker del proyecto (de los recibidos). NO inventes ids.",
      },
      sin_fondo: {
        type: "boolean",
        description:
          "true = RECORTA el sujeto de la foto (le quita el fondo, ej. deja el auto flotando sin el taller). Úsalo para un look editorial/premium: pon el auto RECORTADO sobre un fondo de color o gradiente diseñado, o combínalo en un collage. Con true, la imagen se muestra completa (contain), sin recorte de encuadre. false = foto normal con su fondo.",
      },
      x: { type: "number", description: "X de la esquina superior izquierda en % del ancho (0–100)." },
      y: { type: "number", description: "Y de la esquina superior izquierda en % del alto (0–100)." },
      ancho: { type: "number", description: "Ancho en % del lienzo (0–100)." },
      alto: { type: "number", description: "Alto en % del lienzo (0–100)." },
      ajuste: {
        type: "string",
        enum: ["cubrir", "contener"],
        description: '"cubrir" (rellena el marco recortando, object-fit cover) o "contener" (cabe entero sin recortar).',
      },
      radio: { type: "number", description: "Radio de esquinas en px (0 = recto). Úsalo con mesura para un look de tarjeta." },
    },
  };

  const bloqueForma = {
    type: "object",
    additionalProperties: false,
    required: ["tipo", "forma", "x", "y", "ancho", "alto", "color", "radio", "opacidad"],
    properties: {
      tipo: { type: "string", const: "forma" },
      forma: {
        type: "string",
        enum: ["rectangulo", "circulo", "linea"],
        description: 'Tipo de forma: "rectangulo" (bloques/badges), "circulo" (énfasis/puntos), "linea" (divisorias).',
      },
      x: { type: "number", description: "X de la esquina superior izquierda en % del ancho (0–100)." },
      y: { type: "number", description: "Y de la esquina superior izquierda en % del alto (0–100)." },
      ancho: { type: "number", description: "Ancho en % del lienzo (0–100). Para una línea, su largo." },
      alto: { type: "number", description: "Alto en % del lienzo (0–100). Para una línea, su grosor." },
      color: { type: "string", description: "Color de la forma en hex." },
      radio: { type: "number", description: "Radio de esquinas del rectángulo en px (0 = recto). Se ignora en círculo/línea." },
      opacidad: { type: "number", description: "Opacidad 0–1 (1 = opaca). Baja (0.1–0.4) para veladuras/acentos suaves." },
    },
  };

  const bloqueSticker = {
    type: "object",
    additionalProperties: false,
    required: ["tipo", "archivo", "asset_id", "x", "y", "escala"],
    properties: {
      tipo: { type: "string", const: "sticker" },
      archivo: {
        type: ["string", "null"],
        description:
          'Nombre EXACTO de un sticker de la biblioteca public/stickers (ej. "fuego.png"), o null si usas "asset_id".',
      },
      asset_id: {
        type: ["string", "null"],
        description:
          "Id EXACTO de un sticker/imagen del proyecto (de los recibidos), o null si usas la biblioteca.",
      },
      x: { type: "number", description: "X del centro del sticker en % del ancho (0–100)." },
      y: { type: "number", description: "Y del centro del sticker en % del alto (0–100)." },
      escala: {
        type: "number",
        description: "Tamaño como proporción del ancho del lienzo, entre 0.05 y 0.4. Úsalos con mesura, para acentuar.",
      },
    },
  };

  // Claude structured outputs soporta "anyOf" (no "oneOf"). Cada variante lleva
  // "tipo" con const distinto, así que anyOf se comporta como la unión buscada.
  const bloque = {
    anyOf: [bloqueTexto, bloqueImagen, bloqueForma, bloqueSticker],
  };

  const slide = {
    type: "object",
    additionalProperties: false,
    required: ["fondo", "bloques"],
    properties: {
      fondo: {
        type: "object",
        additionalProperties: false,
        required: ["tipo", "color", "color2", "asset_id", "overlay"],
        properties: {
          tipo: {
            type: "string",
            enum: ["color", "gradiente", "imagen"],
            description: '"color" (plano), "gradiente" (de color a color2) o "imagen" (foto del proyecto como fondo).',
          },
          color: {
            type: ["string", "null"],
            description: "Color de fondo (o color inicial del gradiente) en hex. null si el fondo es una imagen.",
          },
          color2: {
            type: ["string", "null"],
            description: "Color final del gradiente en hex. null salvo que tipo sea \"gradiente\".",
          },
          asset_id: {
            type: ["string", "null"],
            description: 'Id EXACTO de una foto del proyecto para el fondo (solo si tipo es "imagen"), o null.',
          },
          overlay: {
            type: ["number", "null"],
            description:
              "Velo oscuro sobre la imagen de fondo, 0–1 (0.3–0.55 recomendado cuando hay texto encima para legibilidad). null o 0 si no lleva.",
          },
        },
      },
      bloques: {
        type: "array",
        description:
          "Elementos del slide (textos, imágenes, formas, stickers), en orden de apilado (los últimos quedan encima).",
        items: bloque,
      },
    },
  };

  return {
    type: "object",
    additionalProperties: false,
    required: ["formato", "paleta", "slides"],
    properties: {
      formato: {
        type: "string",
        const: formato,
        description: `Formato del post (fijo para este diseño): ${formato}.`,
      },
      paleta: {
        type: "object",
        additionalProperties: false,
        required: ["fondo", "texto", "acento"],
        description: "Paleta guía coherente entre todos los slides (2–3 colores + neutro).",
        properties: {
          fondo: { type: "string", description: "Color de fondo dominante en hex." },
          texto: { type: "string", description: "Color de texto principal en hex (alto contraste con el fondo)." },
          acento: { type: "string", description: "Color de acento en hex (para énfasis, formas, detalles)." },
        },
      },
      slides: {
        type: "array",
        // Nota: los structured outputs de Claude NO soportan minItems/maxItems
        // con valores distintos de 0/1; la cantidad EXACTA se exige por prompt.
        description: `Slides del post: genera EXACTAMENTE ${nSlides} (ni más ni menos). Si es 1, es una imagen única; si son varios, un carrusel con narrativa (gancho → ideas → CTA).`,
        items: slide,
      },
    },
  };
}

// ---------- Personalidad de las fuentes (guía para elegir la vibra) ----------

// Reutilizamos la biblioteca de public/fuentes con una nota de personalidad
// orientada al DISEÑO EDITORIAL (impacto/elegancia), para que la IA elija con
// intención y respete el máximo de 2 fuentes por carrusel.
const PERSONALIDAD_FUENTES: Record<string, string> = {
  "impacto.ttf": "condensada potente, titulares con fuerza",
  "titulos-gruesos.ttf": "negrita máxima, titulares contundentes",
  "negra-ancha.ttf": "negra ancha de máxima presencia",
  "slab-gruesa.ttf": "slab de fuerza, presencia total",
  "geometrica-fuerte.ttf": "geométrica moderna y contundente",
  "condensada-alta.ttf": "condensada altísima, titulares apretados",
  "estrecha-deportiva.ttf": "estrecha con energía deportiva",
  "urbana-display.ttf": "display urbana llamativa, calle y energía",
  "serif-lujosa.ttf": "serif editorial de lujo, sofisticación",
  "serif-impacto.ttf": "serif para titulares dramáticos, editorial",
  "moderna-elegante.ttf": "sans premium para marcas, look profesional",
  "moderna-condensada.ttf": "limpia y alta, look moderno y minimalista",
  "geometrica-suave.ttf": "geométrica suave y amable, tech friendly",
  "redonda-amigable.ttf": "redonda amigable y cercana",
  "redondeada-retro.ttf": "retro redondeada, amigable y nostálgica",
  "script-elegante.ttf": "cursiva con estilo, elegancia y lifestyle",
  "caligrafia-fluida.ttf": "caligrafía fluida y romántica",
  "manuscrita-relajada.ttf": "manuscrita relajada, vibra casual",
  "manuscrita-natural.ttf": "manuscrita tipo nota a mano, cercana",
  "marcador.ttf": "marcador a mano, espontánea y directa",
  "comic-divertida.ttf": "estilo cómic, humor y desenfado",
  "infantil-gruesa.ttf": "divertida y gruesa, contenido juguetón",
  "burbuja-gruesa.ttf": "burbuja infantil redonda, alegre",
  "retro-juguetona.ttf": "retro divertida con mucha personalidad",
  "cartel-vintage.ttf": "cartel retro con carácter, nostálgico",
  "mono-bloque.ttf": "monoespaciada tipo bloque, look técnico",
  "moderna-tailand.ttf": "sans moderna con acento único",
};

function seccionFuentes(): string {
  const fuentes = listarFuentes();
  if (!fuentes.length) {
    return 'No hay fuentes en la biblioteca: usa "fuente": null (fuente del sistema).';
  }
  const lista = fuentes
    .map((f) => {
      const p = PERSONALIDAD_FUENTES[f.archivo];
      return `- ${f.archivo}${p ? ` (${p})` : ""}`;
    })
    .join("\n");
  return `Fuentes disponibles (usa el nombre EXACTO en "fuente", o null para la del sistema). MÁXIMO 2 fuentes en todo el carrusel:
${lista}

Orientación: para TÍTULOS con fuerza usa impacto / titulos-gruesos / geometrica-fuerte / negra-ancha; para ELEGANCIA usa serif-lujosa / moderna-elegante / serif-impacto; para lifestyle/cercanía usa script-elegante / manuscrita-relajada.`;
}

// ---------- Descarga de imágenes del proyecto para el content de visión ----------

// Resuelve una public_url a una URL absoluta descargable. Las URLs relativas
// ("/api/media/..." de los assets "mini:") se resuelven contra
// MEDIA_PUBLIC_URL (o http://localhost:3000 si está vacía). Las absolutas se
// usan tal cual.
function resolverUrlAsset(publicUrl: string): string {
  const url = (publicUrl ?? "").trim();
  if (/^https?:\/\//i.test(url)) return url;
  const base = (process.env.MEDIA_PUBLIC_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
  const ruta = url.startsWith("/") ? url : `/${url}`;
  return `${base}${ruta}`;
}

// Lado máximo (px) al mandar la imagen a la IA: límite de resolución del tier
// estándar de Claude, y además baja mucho el peso (una foto HEIC de ~1.7 MB
// queda en decenas de KB JPEG).
const LADO_MAX_VISION = 1568;

interface ImagenDescargada {
  asset: ProyectoAsset;
  mediaType: "image/jpeg" | "image/png";
  base64: string;
}

// Descarga una imagen del proyecto por HTTP y la NORMALIZA (HEIC→JPEG, EXIF,
// tamaño) con lib/imagen para que Claude visión pueda procesarla —Claude NO
// soporta HEIC, de ahí el 400 "Could not process image"—. Best-effort: null si
// falla (se omite esa imagen y se sigue con las demás). Para assets "mini:" con
// auth se manda el Bearer BACKEND_SECRET si existe.
async function descargarImagen(
  asset: ProyectoAsset
): Promise<ImagenDescargada | null> {
  try {
    const url = resolverUrlAsset(asset.public_url);
    const headers = process.env.BACKEND_SECRET
      ? { authorization: `Bearer ${process.env.BACKEND_SECRET}` }
      : undefined;
    const res = await fetch(url, headers ? { headers } : undefined);
    if (!res.ok) {
      console.warn(
        `[postDesign] No se pudo descargar la imagen del asset ${asset.id} ("${asset.nombre}"): HTTP ${res.status}`
      );
      return null;
    }
    const original = Buffer.from(await res.arrayBuffer());
    if (original.byteLength < 100) {
      console.warn(
        `[postDesign] Imagen del asset ${asset.id} vacía o corrupta; se omite del análisis`
      );
      return null;
    }
    const norm = await normalizarImagen(original, {
      ladoMax: LADO_MAX_VISION,
      calidad: 82,
    });
    if (!norm) {
      console.warn(
        `[postDesign] No se pudo decodificar la imagen del asset ${asset.id} ("${asset.nombre}"); se omite`
      );
      return null;
    }
    return {
      asset,
      mediaType: norm.mediaType,
      base64: norm.data.toString("base64"),
    };
  } catch (err) {
    console.warn(
      `[postDesign] No se pudo normalizar la imagen del asset ${asset.id} ("${asset.nombre}"): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

// ---------- Extracción del plan de la respuesta ----------

// El JSON estructurado llega en el PRIMER bloque de texto (pueden venir bloques
// de thinking antes). Si no hay texto (agotó max_tokens pensando o refusó), se
// lanza con el stop_reason para diagnosticar.
function extraerPlan(response: {
  content: Array<{ type: string; text?: string }>;
  stop_reason?: string | null;
}): PostDesignPlan {
  const bloque = response.content.find(
    (b): b is { type: "text"; text: string } => b.type === "text"
  );
  if (!bloque) {
    const tipos = response.content.map((b) => b.type).join(", ") || "(ninguno)";
    throw new Error(
      `La respuesta del modelo no contiene un bloque de texto (stop_reason=${
        response.stop_reason ?? "?"
      }, bloques=[${tipos}])`
    );
  }
  return JSON.parse(bloque.text) as PostDesignPlan;
}

// ---------- Generación del diseño de post ----------

export interface GenerarDisenoPostParams {
  proyecto: Proyecto;
  assets: ProyectoAsset[];
  instruccion: string;
  formato: FormatoPost;
  nSlides: number;
}

// Genera un PostDesignPlan con Claude visión: ve las FOTOS y STICKERS del
// proyecto (hasta 12, en base64) y compone un carrusel/imagen con jerarquía y
// paleta coherentes. Si no hay fotos/stickers, igual diseña con fondos de
// color/gradiente + textos. El llamador valida/renderiza.
export async function generarDisenoPost({
  proyecto,
  assets,
  instruccion,
  formato,
  nSlides,
}: GenerarDisenoPostParams): Promise<PostDesignPlan> {
  const client = getAnthropic();

  const nSlidesSeguro = Math.max(1, Math.min(10, Math.round(nSlides || 1)));
  const dims = DIMENSIONES[formato] ?? DIMENSIONES.cuadrado_1_1;

  // Fotos y stickers del proyecto para la visión (máx. 12). Se descargan en
  // paralelo; las que fallen se descartan (best-effort: aún se puede diseñar).
  const imagenesAsset = assets
    .filter((a) => a.tipo === "foto" || a.tipo === "sticker")
    .slice(0, 12);
  const descargadas = (
    await Promise.all(imagenesAsset.map((a) => descargarImagen(a)))
  ).filter((x): x is ImagenDescargada => x !== null);

  // Ids REALES disponibles para el prompt (anti-alucinación). Solo estos se
  // pueden usar como asset_id en el plan.
  const idsFoto = descargadas
    .filter((d) => d.asset.tipo === "foto")
    .map((d) => d.asset.id);
  const idsSticker = descargadas
    .filter((d) => d.asset.tipo === "sticker")
    .map((d) => d.asset.id);
  const idsDisponibles = [...idsFoto, ...idsSticker];

  // Content mixto: cada imagen precedida de su asset_id y nombre.
  const bloques: Anthropic.ContentBlockParam[] = [];
  for (const d of descargadas) {
    const rol = d.asset.tipo === "sticker" ? "STICKER" : "FOTO";
    bloques.push({
      type: "text",
      text: `Imagen asset_id=${d.asset.id} (${rol}: ${d.asset.nombre})`,
    });
    bloques.push({
      type: "image",
      source: { type: "base64", media_type: d.mediaType, data: d.base64 },
    });
  }

  const seccionAssets = idsDisponibles.length
    ? `IMÁGENES DEL PROYECTO disponibles (arriba las ves). USA SOLO estos asset_id — no inventes otros:
${descargadas
  .map(
    (d) =>
      `- asset_id: ${d.asset.id} — ${
        d.asset.tipo === "sticker" ? "sticker" : "foto"
      } — "${d.asset.nombre}"`
  )
  .join("\n")}
Las FOTOS son las protagonistas: úsalas como fondo (fondo.tipo "imagen" con su asset_id) o como bloque imagen ocupando gran parte del slide.`
    : "El proyecto no tiene fotos ni stickers utilizables: diseña con fondos de color o gradiente y una tipografía fuerte y bien compuesta (sin bloques de imagen ni fondos tipo imagen).";

  const estructuraCarrusel =
    nSlidesSeguro === 1
      ? "Es UNA sola imagen: haz una composición fuerte y autosuficiente (gancho + un mensaje claro, con jerarquía tipográfica marcada)."
      : `Es un CARRUSEL de ${nSlidesSeguro} slides. Estructura la narrativa:
- Slide 1 = GANCHO potente: título grande y, si hay foto fuerte, úsala de protagonista.
- Slides intermedios = UNA idea por slide (imagen + poco texto). No satures de texto.
- Último slide = CTA claro (una acción: "sígueme", "guarda", "escríbenos", "link en bio").

⚠️ CADA SLIDE DEBE SER DISTINTO — es lo más importante. PROHIBIDO repetir el mismo slide (misma foto + mismo texto) varias veces; eso es un error grave.
- FOTOS DIFERENTES: usa una foto DISTINTA en cada slide siempre que haya suficientes (tienes varias). No pongas la misma foto de fondo en todos.
- TEXTOS DIFERENTES: cada slide dice algo distinto (título, subtítulo o dato propio del slide), acorde a su lugar en la narrativa. Nada de repetir "MA.LORCA / Tu garage de confianza" en los 5.
- COMPOSICIONES DIFERENTES: varía el layout entre slides (foto a sangre completa; foto a media pantalla con panel de color al lado; texto grande sobre foto oscurecida; slide de solo tipografía sobre color; collage de 2 fotos; etc.). Que el carrusel se sienta rico y editorial, no una plantilla clonada.
Exprime el material al MÁXIMO: diseña cada slide con intención propia, como si cada uno fuera una pieza aparte que además conversa con las demás.`;

  const promptFinal = `Eres un diseñador gráfico senior de redes sociales (2026), con nivel de Canva Pro / editorial premium. Diseñas posts que PARAN EL SCROLL: composición con intención, jerarquía tipográfica fuerte y paletas coherentes.

Proyecto: ${proyecto.nombre}${
    proyecto.descripcion?.trim()
      ? `\nDescripción: ${proyecto.descripcion.trim()}`
      : ""
  }

Instrucción del usuario:
${instruccion?.trim() ? instruccion.trim() : "Criterio libre: diseña el post más atractivo posible con este material."}

Formato: ${ETIQUETA_FORMATO[formato]}. Cada slide es un lienzo de ${dims.ancho} x ${dims.alto} px. TODAS las coordenadas (x, y, ancho, alto) van en PORCENTAJE del lienzo (0–100); el tamaño de fuente ("tamano") va en px sobre un lienzo de 1080 de ancho.

${seccionAssets}

${seccionFuentes()}

${estructuraCarrusel}

REGLAS DE DISEÑO (nivel Canva/editorial premium):
- ZONAS SEGURAS: deja márgenes de ~6% en los bordes (nada de texto pegado al borde). En formato historia 9:16 deja LIBRES el 12% superior y el 12% inferior (ahí va la UI de Instagram).
- JERARQUÍA TIPOGRÁFICA FUERTE: 1 título grande por slide (tamano 70–130 px), subtítulos/cuerpo más chicos (40–64 y 28–44). MÁXIMO 2 fuentes en TODO el carrusel. Peso "black"/"bold" para titulares.
- CONTRASTE ALTO texto/fondo. Si el texto va sobre una FOTO, garantiza legibilidad: usa fondo.overlay entre 0.3 y 0.55, o una "caja" (pastilla) detrás del texto. Nunca texto claro sobre fondo claro ni oscuro sobre oscuro.
- PALETA limitada y coherente ENTRE slides: 2–3 colores + un neutro. Respeta la paleta que declaras en "paleta" (fondo, texto, acento) a lo largo de todos los slides.
- La FOTO es la PROTAGONISTA cuando aporta: úsala de fondo (fondo.tipo "imagen" con asset_id) o como bloque imagen ocupando gran parte del slide, con "ajuste": "cubrir".
- ✂️ RECORTAR EL FONDO (look premium): en un bloque imagen puedes poner "sin_fondo": true para RECORTAR el sujeto (el auto queda "flotando" sin el taller/fondo). Úsalo para composiciones editoriales: pon el AUTO RECORTADO sobre un fondo de COLOR o GRADIENTE de marca (fondo.tipo "gradiente" o "color"), con el título grande al lado o detrás. Es lo que hace ver PROFESIONAL un post de automotora. Úsalo en 1-2 slides del carrusel (no en todos, para variar). Si NO recortas, deja "sin_fondo": false.
- 🖼️ COLLAGE: un slide puede combinar VARIAS fotos (2-4 bloques imagen) para mostrar detalles (frente, interior, motor, llantas). Repártelas en una grilla limpia con aire, o mezcla una foto grande + 2 chicas. No las encimes ni las amontones; deja márgenes.
- COMPOSICIÓN con intención: regla de tercios, alineaciones limpias, aire (espacio negativo). No centres todo por defecto ni amontones elementos.
- STICKERS y FORMAS con MESURA, solo para acentuar: líneas divisorias (forma "linea"), círculos de énfasis (forma "circulo"), badges/pastillas (forma "rectangulo" con radio), o un sticker puntual. No los repartas por todos lados.
- SOLO usa asset_id que EXISTAN entre las imágenes recibidas (los listados arriba). Para stickers de la biblioteca usa nombres EXACTOS de public/stickers (ej. "fuego.png", "flecha-derecha-amarillo.png", "corazon.png") en "archivo".
- Textos SIN emojis (las fuentes no los renderizan): la emoción va en el diseño, el color y los stickers.
- Colores SIEMPRE en hex (ej. #1A1A1A). No uses nombres de color.

Genera EXACTAMENTE ${nSlidesSeguro} slide(s). El campo "formato" debe ser "${formato}". Responde únicamente con el JSON solicitado.`;

  bloques.push({ type: "text", text: promptFinal });

  // Igual que el motor de edición: el plan es un JSON grande y con thinking
  // adaptativo + imágenes el modelo gasta presupuesto razonando antes de emitir
  // el JSON. Damos margen amplio (más slides ⇒ más tokens) y usamos streaming
  // para no chocar con el timeout HTTP del SDK a max_tokens alto.
  // Techo amplio para que el JSON NUNCA se corte por presupuesto. effort "medium":
  // el prompt ya exige explícitamente slides DISTINTOS, así que el modelo no
  // necesita razonar de más para variar (con "high" tardaba 7-9 MINUTOS y 30-40k
  // tokens de puro sobre-pensar). En "medium" da los 5 slides distintos en ~4s.
  // (Que los slides salieran IGUALES era un bug de render —selectComposition
  // reusada—, no del modelo; ya está arreglado en renderPost.ts.)
  const maxTokens = Math.min(64000, 32000 + nSlidesSeguro * 4000);
  const t0 = Date.now();
  const stream = client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: construirSchemaPost(formato, nSlidesSeguro),
      },
    },
    messages: [{ role: "user", content: bloques }],
  });
  const response = await stream.finalMessage();
  console.log(
    `[postDesign] modelo respondió en ${Date.now() - t0}ms ` +
      `(slides=${nSlidesSeguro}, stop=${response.stop_reason}, ` +
      `out=${response.usage?.output_tokens ?? "?"} tokens)`
  );

  const plan = extraerPlan(response);
  // Blindaje: el "formato" del plan siempre es el recibido (el schema ya lo
  // fija con const, pero lo forzamos por si acaso).
  plan.formato = formato;
  return plan;
}
