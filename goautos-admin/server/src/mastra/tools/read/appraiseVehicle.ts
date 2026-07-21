import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const appraiseVehicleTool = createTool({
  id: 'appraise_vehicle',
  description:
    'Tasar un vehículo buscando publicaciones reales en el mercado chileno (Chileautos, Yapo, Kavak, etc.) y calculando el rango de precio de mercado.',
  inputSchema: z.object({
    query: z
      .string()
      .describe('Descripción del vehículo a tasar (marca, modelo, año, versión, km, etc.)'),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const res = await fetch(`${supabaseUrl}/functions/v1/car_appraiser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: input.query, client_id: clientId }),
    });

    const result = await res.json();

    if (!res.ok) {
      return JSON.stringify({ error: result.error || 'Error al tasar vehículo' });
    }

    // Return compact summary
    const summary: any = {};

    if (result.vehicle_details) summary.vehicle_details = result.vehicle_details;
    if (result.price_analysis) summary.price_analysis = result.price_analysis;
    if (result.estimated_range) summary.estimated_range = result.estimated_range;
    if (result.confidence) summary.confidence = result.confidence;

    // Include only top 5 sources
    if (result.sources && Array.isArray(result.sources)) {
      summary.sources = result.sources.slice(0, 5);
    }

    // If the result doesn't match expected structure, return it as-is
    if (Object.keys(summary).length === 0) {
      return JSON.stringify(result);
    }

    return JSON.stringify(summary);
  },
});
