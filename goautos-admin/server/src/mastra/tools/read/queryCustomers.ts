import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const queryCustomersTool = createTool({
  id: 'query_customers',
  description:
    'Buscar clientes en la base de datos. Usar para preguntas sobre clientes específicos, búsquedas por nombre, email, teléfono o RUT.',
  inputSchema: z.object({
    id: z.number().optional().describe('ID exacto del cliente'),
    name: z.string().optional().describe('Nombre del cliente'),
    email: z.string().optional().describe('Email del cliente'),
    phone: z.string().optional().describe('Teléfono del cliente'),
    rut: z.string().optional().describe('RUT del cliente'),
    limit: z.number().default(10).describe('Límite de resultados'),
    order_by: z
      .enum(['created_at', 'first_name', 'last_name'])
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
      .from('customers')
      .select('*')
      .eq('client_id', clientId);

    if (input.id) query = query.eq('id', input.id);
    if (input.name)
      query = query.or(
        `first_name.ilike.%${input.name}%,last_name.ilike.%${input.name}%`
      );
    if (input.email) query = query.ilike('email', `%${input.email}%`);
    if (input.phone) query = query.ilike('phone', `%${input.phone}%`);
    if (input.rut) query = query.ilike('rut', `%${input.rut}%`);

    query = query.order(input.order_by, { ascending: input.order_direction === 'asc' });
    query = query.limit(input.limit);

    const { data, error } = await query;

    if (error) return JSON.stringify({ error: error.message });

    const customers = data || [];

    return JSON.stringify({ count: customers.length, customers });
  },
});
