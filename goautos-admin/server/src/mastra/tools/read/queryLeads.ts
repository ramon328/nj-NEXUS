import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const queryLeadsTool = createTool({
  id: 'query_leads',
  description:
    'Buscar leads/prospectos en la base de datos. Usar para preguntas sobre leads específicos, último lead, leads por estado, tipo o cliente.',
  inputSchema: z.object({
    id: z.number().optional().describe('ID exacto del lead'),
    status: z
      .enum(['pending', 'assigned', 'completed', 'cancelled'])
      .optional()
      .describe('Estado del lead'),
    type: z
      .enum([
        'buy-direct',
        'buy-consignment',
        'search-request',
        'sell-vehicle',
        'sell-financing',
        'sell-transfer',
        'contact-general',
      ])
      .optional()
      .describe('Tipo de lead'),
    category: z
      .enum(['buy', 'sell'])
      .optional()
      .describe('Categoría del lead'),
    customer_name: z.string().optional().describe('Nombre del cliente'),
    date_from: z.string().optional().describe('Fecha desde (YYYY-MM-DD)'),
    date_to: z.string().optional().describe('Fecha hasta (YYYY-MM-DD)'),
    limit: z.number().default(10).describe('Límite de resultados'),
    order_by: z
      .enum(['created_at', 'updated_at'])
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

    let query = supabaseAdmin
      .from('leads')
      .select(
        `*, customer:customer_id(id, first_name, last_name, email, phone, rut),
        vehicle:vehicle_id(id, year, price, license_plate, brand:brand_id(name), model:model_id(name)),
        search_brand:brand_id(name), search_model:model_id(name)`
      )
      .eq('client_id', clientId);

    if (input.id) query = query.eq('id', input.id);
    if (input.status) query = query.eq('status', input.status);
    if (input.type) query = query.eq('type', input.type);

    if (input.category === 'buy') {
      query = query.in('type', [
        'buy-direct',
        'buy-consignment',
        'search-request',
      ]);
    } else if (input.category === 'sell') {
      query = query.in('type', [
        'sell-vehicle',
        'sell-financing',
        'sell-transfer',
        'contact-general',
      ]);
    }

    if (input.date_from) query = query.gte('created_at', input.date_from);
    if (input.date_to)
      query = query.lte('created_at', `${input.date_to}T23:59:59`);

    query = query.order(input.order_by, { ascending: input.order_direction === 'asc' });
    query = query.limit(input.limit);

    const { data, error } = await query;

    if (error) return JSON.stringify({ error: error.message });

    let leads = data || [];

    // Post-filter by customer_name
    if (input.customer_name) {
      leads = leads.filter((l: any) => {
        const fullName =
          `${l.customer?.first_name || ''} ${l.customer?.last_name || ''}`.toLowerCase();
        return fullName.includes(input.customer_name!.toLowerCase());
      });
    }

    return JSON.stringify({ count: leads.length, leads });
  },
});
