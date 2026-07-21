import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import type { EditPlan, GeneratedContent, VideoAsset } from "@/lib/types";

// Funciones de generación de contenido con Claude.
// Usan structured outputs (output_config.format con json_schema) para
// garantizar que la respuesta cumpla exactamente los tipos compartidos.

// ---------- Esquemas JSON (escritos a mano, additionalProperties: false) ----------

const GENERATED_CONTENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["caption", "description", "hashtags", "hook", "call_to_action"],
  properties: {
    caption: {
      type: "string",
      description:
        "Caption corto y atractivo para el Reel (máx. ~150 caracteres, con emojis si aportan).",
    },
    description: {
      type: "string",
      description:
        "Descripción más larga para acompañar la publicación, con contexto y valor para la audiencia.",
    },
    hashtags: {
      type: "array",
      description:
        "Entre 15 y 25 hashtags sin el símbolo # duplicado ni repetidos, mezclando alto, medio y bajo volumen.",
      items: { type: "string" },
    },
    hook: {
      type: "string",
      description: "Frase gancho para los primeros 2-3 segundos del video.",
    },
    call_to_action: {
      type: "string",
      description: "Llamado a la acción claro para el final del video o el caption.",
    },
  },
} as const;

const EDIT_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "resumen",
    "duracion_sugerida_segundos",
    "hook_inicial",
    "escenas",
    "texto_en_pantalla",
    "musica_sugerida",
    "formato",
  ],
  properties: {
    resumen: {
      type: "string",
      description: "Resumen del plan de edición en 2-3 frases.",
    },
    duracion_sugerida_segundos: {
      type: "number",
      description: "Duración final sugerida del Reel en segundos.",
    },
    hook_inicial: {
      type: "string",
      description: "Descripción del gancho visual/textual de los primeros segundos.",
    },
    escenas: {
      type: "array",
      description: "Escenas del corte final, en orden.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "orden",
          "desde_segundo",
          "hasta_segundo",
          "descripcion",
          "transicion",
        ],
        properties: {
          orden: { type: "integer", description: "Posición de la escena (1, 2, 3...)." },
          desde_segundo: {
            type: "number",
            description: "Segundo de inicio dentro del material original.",
          },
          hasta_segundo: {
            type: "number",
            description: "Segundo de fin dentro del material original.",
          },
          descripcion: {
            type: "string",
            description: "Qué se ve y qué se comunica en la escena.",
          },
          transicion: {
            type: "string",
            description: "Transición hacia la siguiente escena (corte seco, zoom, etc.).",
          },
        },
      },
    },
    texto_en_pantalla: {
      type: "array",
      description: "Textos superpuestos sugeridos, en orden de aparición.",
      items: { type: "string" },
    },
    musica_sugerida: {
      type: "string",
      description: "Estilo o referencia de música/audio en tendencia sugerido.",
    },
    formato: {
      type: "string",
      description: 'Formato de salida, p. ej. "Reel vertical 9:16".',
    },
  },
} as const;

// ---------- Utilidades ----------

function describirVideo(video: VideoAsset): string {
  const partes = [`- Nombre del archivo: ${video.name}`];
  if (video.duration_seconds != null) {
    partes.push(`- Duración: ${Math.round(video.duration_seconds)} segundos`);
  }
  if (video.size_bytes != null) {
    partes.push(`- Tamaño: ${(video.size_bytes / (1024 * 1024)).toFixed(1)} MB`);
  }
  if (video.mime_type) {
    partes.push(`- Tipo de archivo: ${video.mime_type}`);
  }
  return partes.join("\n");
}

// El JSON estructurado llega en el primer bloque de texto de la respuesta.
// Pueden venir bloques de thinking antes — se ignoran.
function extraerJson<T>(content: Array<{ type: string }>): T {
  const bloque = content.find(
    (b): b is { type: "text"; text: string } => b.type === "text"
  );
  if (!bloque) {
    throw new Error("La respuesta del modelo no contiene un bloque de texto");
  }
  return JSON.parse(bloque.text) as T;
}

// ---------- Generación de contenido para Instagram Reels ----------

export async function generateContent(
  video: VideoAsset,
  opts: { tono?: string; idioma?: string; instrucciones?: string } = {}
): Promise<GeneratedContent> {
  const client = getAnthropic();
  const idioma = opts.idioma || "español";
  const tono = opts.tono || "cercano y profesional";

  const prompt = `Eres un experto en marketing de redes sociales especializado en Instagram Reels.
A partir de los metadatos de un video, genera el contenido completo para publicarlo como Reel.

Metadatos del video:
${describirVideo(video)}

Requisitos:
- Idioma del contenido: ${idioma}.
- Tono: ${tono}.
- "caption": corto, llamativo y optimizado para engagement.
- "description": descripción más extensa que aporte contexto y valor.
- "hashtags": entre 15 y 25 hashtags SIN duplicados, mezclando hashtags de alto volumen (muy populares), volumen medio y bajo volumen (de nicho). Cada hashtag debe empezar con "#".
- "hook": frase gancho para los primeros 2-3 segundos del video.
- "call_to_action": llamado a la acción claro y concreto.
${opts.instrucciones ? `\nInstrucciones adicionales del usuario:\n${opts.instrucciones}\n` : ""}
Responde únicamente con el JSON solicitado.`;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      format: { type: "json_schema", schema: GENERATED_CONTENT_SCHEMA },
    },
    messages: [{ role: "user", content: prompt }],
  });

  const contenido = extraerJson<GeneratedContent>(response.content);
  // Red de seguridad: eliminamos hashtags duplicados conservando el orden.
  contenido.hashtags = Array.from(new Set(contenido.hashtags));
  return contenido;
}

// ---------- Plan de edición ----------

export async function generateEditPlan(
  video: VideoAsset,
  objetivo?: string
): Promise<EditPlan> {
  const client = getAnthropic();

  const prompt = `Eres un experto en marketing de redes sociales y editor de video especializado en Instagram Reels.
A partir de los metadatos de un video en bruto, propone un plan de edición detallado para convertirlo en un Reel de alto rendimiento.

Metadatos del video:
${describirVideo(video)}

Requisitos:
- "resumen": resumen del plan en 2-3 frases.
- "duracion_sugerida_segundos": duración final recomendada (los Reels suelen rendir mejor entre 15 y 60 segundos).
- "hook_inicial": gancho visual/textual para los primeros segundos.
- "escenas": lista ordenada de escenas; cada una con "orden", "desde_segundo", "hasta_segundo" (respetando la duración del material original si se conoce), "descripcion" y "transicion".
- "texto_en_pantalla": textos superpuestos sugeridos, en orden.
- "musica_sugerida": estilo o referencia de música/audio.
- "formato": formato de salida, p. ej. "Reel vertical 9:16".
${objetivo ? `\nObjetivo del video según el usuario:\n${objetivo}\n` : ""}
Responde únicamente con el JSON solicitado, en español.`;

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      format: { type: "json_schema", schema: EDIT_PLAN_SCHEMA },
    },
    messages: [{ role: "user", content: prompt }],
  });

  return extraerJson<EditPlan>(response.content);
}
