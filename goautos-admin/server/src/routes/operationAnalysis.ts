import { Hono } from 'hono';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import type { AuthUser } from '../lib/auth';

const operationAnalysis = new Hono();

// Salida estructurada del analista: briefing + jugadas accionables + patrones.
const AnalysisSchema = z.object({
  headline: z
    .string()
    .describe('1-2 frases: estado general de la operación + lo más urgente AHORA.'),
  health_label: z
    .enum(['critico', 'atencion', 'bien', 'excelente'])
    .describe('Estado general de la operación en una palabra.'),
  plays: z
    .array(
      z.object({
        title: z.string().describe('Qué hacer, corto y directo.'),
        why: z.string().describe('Por qué, con el número real del JSON.'),
        impact: z.enum(['alto', 'medio', 'bajo']),
        action_label: z
          .string()
          .describe('Texto del botón de acción, o "" si no hay ruta clara.'),
        href: z
          .string()
          .describe('Ruta interna de la app para la acción, o "" si no aplica.'),
      })
    )
    .max(3)
    .describe('Las 3 jugadas más importantes, ordenadas por impacto (la #1 primero).'),
  patterns: z
    .array(z.string())
    .max(3)
    .describe('Hasta 3 observaciones no obvias (oportunidades o riesgos) que el dueño quizás no vio.'),
});

const SYSTEM_PROMPT = `Sos el analista de negocio de una automotora chilena, dentro de la plataforma GoAuto. Te paso un snapshot en JSON de la operación (KPIs, inventario, márgenes, antigüedad de stock, leads, ventas del período). Tu trabajo: leer esos números y decirle al dueño/administrador qué está pasando y qué hacer ahora.

REGLAS:
- Basate SOLO en los datos del JSON. No inventes cifras, marcas ni autos que no estén. Si un dato no está o es 0, no lo uses ni lo inventes.
- Sé concreto y accionable: nombrá el auto/marca/número real cuando lo tengas (ej. montos en pesos chilenos, días en stock, cantidades).
- Priorizá por impacto en plata y en riesgo: capital parado en stock viejo, margen bajo, leads sin atender, autos sin publicar, ventas sin aprobar, baja rotación.
- Español de Chile, claro y directo, tono de colega senior. NO uses voseo argentino (nada de "tenés/podés"; usá "tienes/puedes"). Sin emojis.
- "headline": 1-2 frases — estado general + lo más urgente.
- "plays": máximo 3, ordenadas por impacto (la más importante primero). Cada una con title (qué hacer), why (por qué, citando el número real), impact y, si corresponde, action_label + href. Si no hay ruta clara, dejá action_label y href como "".
- "patterns": hasta 3 observaciones no obvias (oportunidades o riesgos). Si no encontrás nada relevante, devolvé una lista vacía.

RUTAS válidas para href (usá EXACTAMENTE estas o ""):
- /vehiculos?alertFilter=liquidate  (autos con +300 días en stock)
- /vehiculos?alertFilter=old-stock  (autos 90-300 días)
- /vehiculos?alertFilter=unpublished  (sin publicar)
- /vehiculos?alertFilter=no-photo  (sin foto)
- /vehiculos  (inventario general)
- /ventas?alertFilter=pending-sales  (ventas por aprobar)
- /leads?alertFilter=pending-leads  (leads sin atender)
- /leads  (leads en general)`;

operationAnalysis.post('/api/operation-analysis', async (c) => {
  // Solo usuarios autenticados (authMiddleware ya corrió en /api/*).
  const authUser = (c as any).get('authUser') as AuthUser | undefined;
  if (!authUser) {
    return c.json({ error: 'No autenticado' }, 401);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Body inválido' }, 400);
  }

  const context = body?.context;
  if (!context || typeof context !== 'object') {
    return c.json({ error: 'Falta el contexto de la operación' }, 400);
  }

  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: AnalysisSchema,
      system: SYSTEM_PROMPT,
      prompt: `Snapshot de la operación (JSON):\n\n${JSON.stringify(
        context
      )}\n\nAnalizá y devolvé el briefing, las jugadas y los patrones según el esquema.`,
      maxTokens: 1800,
    });

    return c.json({ analysis: object });
  } catch (err: any) {
    console.error('[operation-analysis] error:', err?.message || err);
    return c.json({ error: 'No se pudo generar el análisis' }, 500);
  }
});

export default operationAnalysis;
