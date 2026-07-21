import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const queryFinancingTool = createTool({
  id: 'query_financing',
  description:
    'Buscar financiamientos en la base de datos. Usar para preguntas sobre financiamientos activos, cuotas, pagos pendientes.',
  inputSchema: z.object({
    id: z.number().optional().describe('ID exacto del financiamiento'),
    customer_id: z.number().optional().describe('ID del cliente'),
    vehicle_id: z.number().optional().describe('ID del vehículo'),
    include_payments: z
      .boolean()
      .optional()
      .describe('Incluir detalle de pagos'),
    limit: z.number().default(10).describe('Límite de resultados'),
    order_by: z
      .enum(['created_at', 'start_date'])
      .default('created_at')
      .describe('Campo para ordenar'),
    order_direction: z
      .enum(['asc', 'desc'])
      .default('desc')
      .describe('Dirección del orden'),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    const selectFields = input.include_payments
      ? '*, payments:financing_payment(*)'
      : '*';

    let query = supabaseAdmin
      .from('financing')
      .select(selectFields)
      .eq('client_id', clientId);

    if (input.id) query = query.eq('id', input.id);
    if (input.customer_id) query = query.eq('customer_id', input.customer_id);
    if (input.vehicle_id) query = query.eq('vehicle_id', input.vehicle_id);

    query = query.order(input.order_by, { ascending: input.order_direction === 'asc' });
    query = query.limit(input.limit);

    const { data, error } = await query;

    if (error) return JSON.stringify({ error: error.message });

    const financing = data || [];

    return JSON.stringify({ count: financing.length, financing });
  },
});
