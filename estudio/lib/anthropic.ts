import Anthropic from "@anthropic-ai/sdk";

// Modelo por defecto de la plataforma. Sonnet ofrece la mejor relación
// costo/calidad para el análisis de video y la generación de contenido.
// Se puede cambiar sin tocar código con la variable ANTHROPIC_MODEL
// (por ejemplo: claude-opus-4-8 para máxima calidad).
export const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Falta ANTHROPIC_API_KEY en .env.local");
    }
    client = new Anthropic();
  }
  return client;
}
