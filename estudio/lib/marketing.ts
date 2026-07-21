import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import type { HerramientaMarketing } from "@/lib/types";

// Las 5 herramientas de estrategia de marketing con IA.
// Mismo patrón que lib/ai.ts / lib/editor.ts: streaming (para no chocar con el
// timeout HTTP del SDK a max_tokens alto) + structured outputs
// (output_config.format con json_schema) para garantizar la forma exacta.

// ---------- Tipos de entrada de cada herramienta ----------

export interface EntradaIdeas {
  nicho: string;
  publico?: string;
  cantidad?: number; // default 10
}

export interface EntradaCopy {
  tema: string;
  tono?: string;
  plataforma?: string;
}

export interface EntradaGuionReel {
  idea: string;
  duracion_objetivo?: number; // segundos, default 30
  estilo?: string;
}

export interface EntradaCalendario {
  nicho: string;
  dias?: number; // default 30
  frecuencia?: string; // ej. "1 post al día"
}

export interface EntradaLeadMagnet {
  negocio: string;
  objetivo?: string;
}

// ---------- Tipos de resultado de cada herramienta ----------

export interface IdeaReel {
  titulo: string;
  gancho: string;
  formato: string;
  descripcion: string;
  por_que_funciona: string;
}

export interface ResultadoIdeas {
  ideas: IdeaReel[];
}

export interface ResultadoCopy {
  hooks: string[]; // 5 variantes de gancho
  caption_corta: string;
  caption_larga: string;
  cta: string[]; // 3 llamados a la acción
  hashtags: string[]; // 20 hashtags con #
}

export interface EscenaGuion {
  orden: number;
  desde: number; // segundo de inicio en el reel final
  hasta: number; // segundo de fin
  voz: string; // lo que se dice a cámara / voz en off
  texto_pantalla: string; // texto superpuesto
  plano_sugerido: string; // ej. "primer plano a cámara"
  broll: string; // material de apoyo sugerido
}

export interface ResultadoGuionReel {
  titulo: string;
  gancho: {
    texto_pantalla: string;
    voz: string;
    segundos: number; // cuánto dura el gancho
  };
  escenas: EscenaGuion[];
  cta_final: string;
  musica_mood: string;
  notas_edicion: string[];
}

export interface PilarContenido {
  nombre: string;
  proposito: string;
  porcentaje: number; // % del calendario que ocupa
}

export interface DiaCalendario {
  dia: number;
  pilar: string;
  formato: string;
  idea: string;
  gancho: string;
}

export interface ResultadoCalendario {
  pilares: PilarContenido[];
  calendario: DiaCalendario[];
}

export interface ConceptoLeadMagnet {
  titulo: string;
  formato: string; // ej. "PDF checklist", "mini-curso por email"
  promesa: string;
  contenido_esquema: string[];
  cta_captura: string;
  post_promocion: string;
}

export interface ResultadoLeadMagnet {
  conceptos: ConceptoLeadMagnet[];
}

// ---------- Error de validación de entrada (el route lo mapea a 400) ----------

export class ErrorDeEntrada extends Error {}

function textoRequerido(
  entrada: Record<string, unknown>,
  campo: string,
  descripcion: string
): string {
  const valor = entrada[campo];
  if (typeof valor !== "string" || !valor.trim()) {
    throw new ErrorDeEntrada(`Falta el campo "${campo}" (${descripcion})`);
  }
  return valor.trim();
}

function textoOpcional(
  entrada: Record<string, unknown>,
  campo: string
): string | undefined {
  const valor = entrada[campo];
  return typeof valor === "string" && valor.trim() ? valor.trim() : undefined;
}

function numeroOpcional(
  entrada: Record<string, unknown>,
  campo: string,
  porDefecto: number,
  min: number,
  max: number
): number {
  const crudo = entrada[campo];
  const n =
    typeof crudo === "number"
      ? crudo
      : typeof crudo === "string" && crudo.trim()
        ? Number(crudo)
        : porDefecto;
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(max, Math.max(min, Math.round(n)));
}

// ---------- Esquemas JSON (additionalProperties: false, todo requerido) ----------
// Nota: structured outputs no soporta minItems/maxItems ni min/max numéricos;
// las cantidades exactas se piden en el prompt y se normalizan después.

const IDEAS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      description: "Ideas de reels, ordenadas de mayor a menor potencial viral.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titulo", "gancho", "formato", "descripcion", "por_que_funciona"],
        properties: {
          titulo: { type: "string", description: "Título interno corto de la idea." },
          gancho: {
            type: "string",
            description:
              "Gancho literal para el primer 1.5 segundos (texto en pantalla o primera frase).",
          },
          formato: {
            type: "string",
            description:
              'Formato del reel, ej. "hablar a cámara", "voz en off + b-roll", "tutorial", "antes/después", "POV", "lista rápida".',
          },
          descripcion: {
            type: "string",
            description: "Qué se muestra y qué se dice, en 2-3 frases accionables.",
          },
          por_que_funciona: {
            type: "string",
            description:
              "Razón psicológica/algorítmica por la que retiene y genera interacción.",
          },
        },
      },
    },
  },
} as const;

const COPY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["hooks", "caption_corta", "caption_larga", "cta", "hashtags"],
  properties: {
    hooks: {
      type: "array",
      description: "Exactamente 5 hooks distintos para el primer 1.5 segundos.",
      items: { type: "string" },
    },
    caption_corta: {
      type: "string",
      description: "Caption corto y directo (máx. ~125 caracteres), con 1-2 emojis si aportan.",
    },
    caption_larga: {
      type: "string",
      description:
        "Caption largo tipo micro-historia o valor accionable, con saltos de línea y CTA final.",
    },
    cta: {
      type: "array",
      description: "Exactamente 3 llamados a la acción distintos (comenta, guarda, comparte...).",
      items: { type: "string" },
    },
    hashtags: {
      type: "array",
      description:
        "Exactamente 20 hashtags SIN repetir, cada uno empezando con #, mezcla de alto/medio/bajo volumen.",
      items: { type: "string" },
    },
  },
} as const;

const GUION_REEL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["titulo", "gancho", "escenas", "cta_final", "musica_mood", "notas_edicion"],
  properties: {
    titulo: { type: "string", description: "Título del reel." },
    gancho: {
      type: "object",
      additionalProperties: false,
      required: ["texto_pantalla", "voz", "segundos"],
      properties: {
        texto_pantalla: {
          type: "string",
          description: "Texto superpuesto del gancho (corto, imposible de ignorar).",
        },
        voz: { type: "string", description: "Primera frase dicha a cámara o en voz en off." },
        segundos: {
          type: "number",
          description: "Duración del gancho en segundos (idealmente 1 a 3).",
        },
      },
    },
    escenas: {
      type: "array",
      description: "Escenas en orden, cubriendo desde el fin del gancho hasta el CTA.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "orden",
          "desde",
          "hasta",
          "voz",
          "texto_pantalla",
          "plano_sugerido",
          "broll",
        ],
        properties: {
          orden: { type: "integer", description: "Posición de la escena (1, 2, 3...)." },
          desde: { type: "number", description: "Segundo de inicio en el reel final." },
          hasta: { type: "number", description: "Segundo de fin en el reel final." },
          voz: { type: "string", description: "Lo que se dice en esta escena." },
          texto_pantalla: {
            type: "string",
            description: "Texto superpuesto de la escena (o cadena vacía si no lleva).",
          },
          plano_sugerido: {
            type: "string",
            description: 'Plano/encuadre, ej. "primer plano a cámara", "plano detalle de manos".',
          },
          broll: {
            type: "string",
            description: "Material de apoyo sugerido para cortar (o cadena vacía).",
          },
        },
      },
    },
    cta_final: {
      type: "string",
      description: "Llamado a la acción del cierre (qué decir y qué texto mostrar).",
    },
    musica_mood: {
      type: "string",
      description: 'Mood de música sugerido, ej. "chill lo-fi", "enérgica con beat marcado".',
    },
    notas_edicion: {
      type: "array",
      description:
        "Notas de edición accionables: ritmo de cortes, subtítulos karaoke, zooms, efectos de sonido.",
      items: { type: "string" },
    },
  },
} as const;

const CALENDARIO_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pilares", "calendario"],
  properties: {
    pilares: {
      type: "array",
      description: "3 a 5 pilares de contenido; los porcentajes deben sumar 100.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nombre", "proposito", "porcentaje"],
        properties: {
          nombre: { type: "string", description: "Nombre del pilar." },
          proposito: {
            type: "string",
            description: "Qué logra este pilar (alcance, confianza, venta, comunidad...).",
          },
          porcentaje: {
            type: "number",
            description: "Porcentaje del calendario que ocupa (0-100).",
          },
        },
      },
    },
    calendario: {
      type: "array",
      description: "Una entrada por día de publicación, en orden.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dia", "pilar", "formato", "idea", "gancho"],
        properties: {
          dia: { type: "integer", description: "Día del plan (1, 2, 3...)." },
          pilar: { type: "string", description: "Pilar al que pertenece (nombre exacto)." },
          formato: {
            type: "string",
            description: 'Formato, ej. "reel", "carrusel", "historia", "reel tutorial".',
          },
          idea: { type: "string", description: "Idea concreta del contenido de ese día." },
          gancho: { type: "string", description: "Gancho sugerido para ese contenido." },
        },
      },
    },
  },
} as const;

const LEAD_MAGNET_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["conceptos"],
  properties: {
    conceptos: {
      type: "array",
      description: "3 conceptos de lead magnet, del más rápido de crear al más ambicioso.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "titulo",
          "formato",
          "promesa",
          "contenido_esquema",
          "cta_captura",
          "post_promocion",
        ],
        properties: {
          titulo: { type: "string", description: "Título vendedor del lead magnet." },
          formato: {
            type: "string",
            description: 'Formato, ej. "PDF checklist", "plantilla Notion", "mini-curso por email".',
          },
          promesa: {
            type: "string",
            description: "Resultado concreto que obtiene quien lo descarga.",
          },
          contenido_esquema: {
            type: "array",
            description: "Esquema del contenido, sección por sección.",
            items: { type: "string" },
          },
          cta_captura: {
            type: "string",
            description: 'CTA para pedirlo, ej. "Comenta GUÍA y te la envío por DM".',
          },
          post_promocion: {
            type: "string",
            description: "Idea de reel/post para promocionar el lead magnet.",
          },
        },
      },
    },
  },
} as const;

// ---------- Contexto experto compartido ----------

const CONTEXTO_EXPERTO = `Eres un estratega senior de marketing en redes sociales (Instagram, TikTok, YouTube Shorts) al día con lo que funciona en 2026:
- El gancho decide todo: tienes menos de 1.5 segundos para frenar el scroll. Ganchos que funcionan: contradicción ("deja de hacer X"), curiosidad abierta, resultado concreto con número, "POV", error común, antes/después.
- La retención manda sobre los likes: cortes cada 2-4 segundos, texto en pantalla, bucles abiertos ("al final te muestro..."), payoff claro al cierre.
- Los CTAs de guardado y compartido pesan más que los de like; los comentarios con palabra clave ("comenta X y te lo mando") disparan el alcance y capturan leads.
- Los pilares de contenido equilibran alcance (temas amplios), confianza (autoridad, prueba social), comunidad (cercanía) y venta (oferta directa) — nunca todo venta.
- Habla claro y accionable, cero relleno corporativo. Todo el contenido en español neutro con toque cercano.`;

// ---------- Llamada al modelo (streaming + json_schema) ----------

// El JSON estructurado llega en el primer bloque de texto; pueden venir bloques
// de thinking antes. Si no hay texto (max_tokens agotado, refusal...), se lanza
// un error con el stop_reason para poder diagnosticar.
function extraerJson<T>(response: {
  content: Array<{ type: string; text?: string }>;
  stop_reason?: string | null;
}): T {
  const bloque = response.content.find(
    (b): b is { type: "text"; text: string } => b.type === "text"
  );
  if (!bloque) {
    const tipos = response.content.map((b) => b.type).join(", ") || "(ninguno)";
    throw new Error(
      `La respuesta del modelo no contiene un bloque de texto (stop_reason=${response.stop_reason ?? "?"}, bloques=[${tipos}])`
    );
  }
  return JSON.parse(bloque.text) as T;
}

async function generarConSchema<T>(
  prompt: string,
  schema: Record<string, unknown>
): Promise<T> {
  const client = getAnthropic();
  // Streaming para no chocar con el timeout HTTP del SDK a max_tokens alto
  // (el calendario de 30 días y los guiones generan JSON grandes).
  const stream = client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    output_config: {
      format: { type: "json_schema", schema },
    },
    messages: [{ role: "user", content: prompt }],
  });
  const response = await stream.finalMessage();
  return extraerJson<T>(response);
}

// Normaliza un hashtag para que siempre empiece con "#" y no traiga espacios.
function normalizarHashtag(tag: string): string {
  const limpio = tag.trim().replace(/\s+/g, "");
  if (!limpio) return "";
  return limpio.startsWith("#") ? limpio : `#${limpio}`;
}

// ---------- 1. Generadora de ideas de reels ----------

export async function generarIdeas(entrada: EntradaIdeas): Promise<ResultadoIdeas> {
  const cantidad = Math.min(20, Math.max(3, Math.round(entrada.cantidad ?? 10)));
  const prompt = `${CONTEXTO_EXPERTO}

Genera exactamente ${cantidad} ideas de reels para este nicho:
- Nicho: ${entrada.nicho}
${entrada.publico ? `- Público objetivo: ${entrada.publico}` : "- Público objetivo: dedúcelo del nicho."}

Requisitos:
- Variedad de formatos (a cámara, voz en off + b-roll, tutorial, lista, antes/después, POV, mito vs realidad...). No repitas formato más de 2-3 veces.
- "gancho": la frase LITERAL para el primer 1.5 segundos, lista para copiar (no una descripción del gancho).
- "descripcion": qué grabar y qué decir, tan concreto que se pueda producir hoy mismo con un teléfono.
- "por_que_funciona": la palanca de retención o interacción que activa (curiosidad, identificación, guardado como referencia, debate en comentarios...).
- Ordena las ideas de mayor a menor potencial viral.

Responde únicamente con el JSON solicitado, en español.`;

  const resultado = await generarConSchema<ResultadoIdeas>(prompt, IDEAS_SCHEMA);
  resultado.ideas = (resultado.ideas ?? []).slice(0, cantidad);
  return resultado;
}

// ---------- 2. Copywriter (hooks, captions, CTAs, hashtags) ----------

export async function generarCopy(entrada: EntradaCopy): Promise<ResultadoCopy> {
  const plataforma = entrada.plataforma || "Instagram";
  const tono = entrada.tono || "cercano y directo";
  const prompt = `${CONTEXTO_EXPERTO}

Escribe el copy completo para publicar este contenido:
- Tema del contenido: ${entrada.tema}
- Plataforma principal: ${plataforma}
- Tono: ${tono}

Requisitos:
- "hooks": exactamente 5 variantes de gancho para el primer 1.5 segundos, cada una con una palanca distinta (curiosidad, contradicción, número/resultado, identificación "esto te pasa a ti", urgencia). Frases literales listas para poner en pantalla o decir a cámara.
- "caption_corta": máx. ~125 caracteres, directa, con 1-2 emojis solo si aportan.
- "caption_larga": micro-historia o valor accionable en 3-6 líneas cortas separadas por saltos de línea, que termine con un CTA; escaneable, sin párrafos densos.
- "cta": exactamente 3 llamados a la acción distintos, priorizando guardar/compartir/comentar palabra clave sobre el simple "dale like".
- "hashtags": exactamente 20, SIN duplicados, todos empezando con "#": ~5 de alto volumen, ~10 de volumen medio y ~5 de nicho específico. Nada de hashtags genéricos irrelevantes tipo #love.

Responde únicamente con el JSON solicitado, en español.`;

  const resultado = await generarConSchema<ResultadoCopy>(prompt, COPY_SCHEMA);
  // Red de seguridad: normalizar y deduplicar hashtags, y acotar cantidades.
  resultado.hooks = (resultado.hooks ?? []).slice(0, 5);
  resultado.cta = (resultado.cta ?? []).slice(0, 3);
  resultado.hashtags = Array.from(
    new Set((resultado.hashtags ?? []).map(normalizarHashtag).filter(Boolean))
  ).slice(0, 20);
  return resultado;
}

// ---------- 3. Guionista de reels con timing ----------

// Nota fija que conecta esta herramienta con el editor de video: el guion se
// puede pegar como instrucción al pedir la edición de un proyecto.
const NOTA_CONEXION_EDITOR =
  "Este guion sirve tal cual como instrucción para la IA de edición: crea un proyecto, sube tus clips y pega el guion (voz, textos en pantalla y tiempos) al pedir el video — el editor colocará cortes, textos y subtítulos siguiendo esta estructura.";

export async function generarGuionReel(
  entrada: EntradaGuionReel
): Promise<ResultadoGuionReel> {
  const duracion = Math.min(180, Math.max(10, Math.round(entrada.duracion_objetivo ?? 30)));
  const prompt = `${CONTEXTO_EXPERTO}

Escribe el guion completo de un reel de ~${duracion} segundos para esta idea:
- Idea: ${entrada.idea}
${entrada.estilo ? `- Estilo deseado: ${entrada.estilo}` : ""}

Requisitos:
- "gancho": los primeros 1-3 segundos. "texto_pantalla" corto e imposible de ignorar; "voz" es la primera frase exacta. El gancho NO explica, provoca.
- "escenas": cubren desde el fin del gancho hasta el segundo ~${duracion}, con tiempos "desde"/"hasta" contiguos y realistas (escenas de 3-8 segundos; ninguna toma larga estática). "voz" con las palabras exactas a decir, "texto_pantalla" con el rótulo de apoyo (o "" si no lleva), "plano_sugerido" y "broll" concretos.
- Estructura de retención: gancho → promesa/contexto en 1 escena → desarrollo con 2-4 beats (cada uno aporta algo nuevo) → payoff que cierra el bucle → CTA.
- "cta_final": qué decir y qué texto mostrar en el cierre; prioriza guardar/compartir o comentar una palabra clave.
- "musica_mood": mood concreto acorde a la energía del guion.
- "notas_edicion": 3-6 notas accionables (ritmo de cortes cada 2-4 s, subtítulos karaoke, zooms de énfasis, efecto de sonido en el beat clave...).

Responde únicamente con el JSON solicitado, en español.`;

  const resultado = await generarConSchema<ResultadoGuionReel>(prompt, GUION_REEL_SCHEMA);
  // Garantizar la nota que conecta el guion con el editor de proyectos.
  const notas = Array.isArray(resultado.notas_edicion) ? resultado.notas_edicion : [];
  if (!notas.some((n) => /instrucci[oó]n|proyecto/i.test(n))) {
    notas.push(NOTA_CONEXION_EDITOR);
  }
  resultado.notas_edicion = notas;
  return resultado;
}

// ---------- 4. Calendario de contenido ----------

export async function generarCalendario(
  entrada: EntradaCalendario
): Promise<ResultadoCalendario> {
  const dias = Math.min(60, Math.max(7, Math.round(entrada.dias ?? 30)));
  const frecuencia = entrada.frecuencia || "1 publicación al día";
  const prompt = `${CONTEXTO_EXPERTO}

Diseña un plan de contenido de ${dias} días para este nicho:
- Nicho: ${entrada.nicho}
- Frecuencia de publicación: ${frecuencia}

Requisitos:
- "pilares": 3 a 5 pilares que equilibren alcance, confianza, comunidad y venta; los "porcentaje" deben sumar 100 y la venta directa no debe superar ~20%.
- "calendario": una entrada por día de publicación según la frecuencia, con "dia" correlativo dentro del plan de ${dias} días. Cada entrada con su "pilar" (nombre exacto de la lista), "formato" (mayoría reels; intercala carruseles/historias donde aporten), una "idea" concreta y su "gancho" literal.
- Alterna los pilares de forma natural (nunca dos días seguidos de venta) y haz que las ideas escalen: las primeras semanas construyen alcance y confianza, las últimas capitalizan con más comunidad y venta.
- Nada de ideas genéricas tipo "comparte un tip": cada idea debe poder grabarse hoy mismo sin pensar más.

Responde únicamente con el JSON solicitado, en español.`;

  return generarConSchema<ResultadoCalendario>(prompt, CALENDARIO_SCHEMA);
}

// ---------- 5. Diseño de lead magnets ----------

export async function generarLeadMagnet(
  entrada: EntradaLeadMagnet
): Promise<ResultadoLeadMagnet> {
  const prompt = `${CONTEXTO_EXPERTO}

Diseña 3 conceptos de lead magnet para este negocio:
- Negocio: ${entrada.negocio}
${entrada.objetivo ? `- Objetivo: ${entrada.objetivo}` : "- Objetivo: captar leads cualificados que luego compren."}

Requisitos:
- Cada concepto resuelve UN problema urgente y específico del cliente ideal en menos de 15 minutos de consumo — nada de "guía completa de todo".
- "titulo": vendedor y específico (con número o resultado si encaja).
- "formato": el más simple que cumpla la promesa (checklist PDF, plantilla, calculadora, mini-curso por email, prompt pack...).
- "promesa": el resultado concreto que la persona obtiene al usarlo.
- "contenido_esquema": el esquema sección por sección, listo para redactar.
- "cta_captura": cómo pedirlo en redes (prioriza "comenta PALABRA y te lo mando por DM", link en bio o historia con sticker).
- "post_promocion": la idea de reel/post que lo promociona, con su gancho.
- Ordena del más rápido de crear al más ambicioso.

Responde únicamente con el JSON solicitado, en español.`;

  const resultado = await generarConSchema<ResultadoLeadMagnet>(prompt, LEAD_MAGNET_SCHEMA);
  resultado.conceptos = (resultado.conceptos ?? []).slice(0, 3);
  return resultado;
}

// ---------- Despachador: valida la entrada, ejecuta y deriva el título ----------

// Recorta un texto para usarlo dentro de un título legible.
function recortar(texto: string, largo = 60): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > largo ? `${limpio.slice(0, largo - 1)}…` : limpio;
}

export const HERRAMIENTAS_MARKETING: HerramientaMarketing[] = [
  "ideas",
  "copywriting",
  "guion_reel",
  "calendario",
  "lead_magnet",
];

export function esHerramientaMarketing(valor: unknown): valor is HerramientaMarketing {
  return (
    typeof valor === "string" &&
    (HERRAMIENTAS_MARKETING as string[]).includes(valor)
  );
}

// Ejecuta la herramienta pedida validando su entrada. Lanza ErrorDeEntrada
// (→ 400) cuando faltan campos; cualquier otro error viene de la IA (→ 500).
export async function ejecutarHerramienta(
  herramienta: HerramientaMarketing,
  entrada: Record<string, unknown>
): Promise<{ titulo: string; resultado: Record<string, unknown> }> {
  switch (herramienta) {
    case "ideas": {
      const nicho = textoRequerido(entrada, "nicho", "el nicho o tema de la cuenta");
      const datos: EntradaIdeas = {
        nicho,
        publico: textoOpcional(entrada, "publico"),
        cantidad: numeroOpcional(entrada, "cantidad", 10, 3, 20),
      };
      const resultado = await generarIdeas(datos);
      return {
        titulo: `Ideas de reels — ${recortar(nicho)}`,
        resultado: resultado as unknown as Record<string, unknown>,
      };
    }
    case "copywriting": {
      const tema = textoRequerido(entrada, "tema", "el tema del contenido a publicar");
      const datos: EntradaCopy = {
        tema,
        tono: textoOpcional(entrada, "tono"),
        plataforma: textoOpcional(entrada, "plataforma"),
      };
      const resultado = await generarCopy(datos);
      return {
        titulo: `Copy — ${recortar(tema)}`,
        resultado: resultado as unknown as Record<string, unknown>,
      };
    }
    case "guion_reel": {
      const idea = textoRequerido(entrada, "idea", "la idea del reel a guionizar");
      const datos: EntradaGuionReel = {
        idea,
        duracion_objetivo: numeroOpcional(entrada, "duracion_objetivo", 30, 10, 180),
        estilo: textoOpcional(entrada, "estilo"),
      };
      const resultado = await generarGuionReel(datos);
      return {
        titulo: resultado.titulo?.trim() || `Guion — ${recortar(idea)}`,
        resultado: resultado as unknown as Record<string, unknown>,
      };
    }
    case "calendario": {
      const nicho = textoRequerido(entrada, "nicho", "el nicho o tema de la cuenta");
      const dias = numeroOpcional(entrada, "dias", 30, 7, 60);
      const datos: EntradaCalendario = {
        nicho,
        dias,
        frecuencia: textoOpcional(entrada, "frecuencia"),
      };
      const resultado = await generarCalendario(datos);
      return {
        titulo: `Calendario ${dias} días — ${recortar(nicho)}`,
        resultado: resultado as unknown as Record<string, unknown>,
      };
    }
    case "lead_magnet": {
      const negocio = textoRequerido(entrada, "negocio", "a qué se dedica el negocio");
      const datos: EntradaLeadMagnet = {
        negocio,
        objetivo: textoOpcional(entrada, "objetivo"),
      };
      const resultado = await generarLeadMagnet(datos);
      const primero = resultado.conceptos[0]?.titulo;
      return {
        titulo: primero
          ? `Lead magnet — ${recortar(primero)}`
          : `Lead magnets — ${recortar(negocio)}`,
        resultado: resultado as unknown as Record<string, unknown>,
      };
    }
  }
}
