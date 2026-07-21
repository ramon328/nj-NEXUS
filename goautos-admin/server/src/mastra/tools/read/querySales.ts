import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const querySalesTool = createTool({
  id: 'query_sales',
  description:
    'Buscar ventas en la base de datos. Usar para preguntas sobre ventas específicas, últimas ventas, ventas por vendedor, fecha o estado.',
  inputSchema: z.object({
    id: z.number().optional().describe('ID exacto de la venta'),
    seller_id: z.string().optional().describe('ID del vendedor'),
    status: z
      .enum(['pending', 'approved'])
      .optional()
      .describe('Estado de la venta'),
    customer_name: z.string().optional().describe('Nombre del cliente'),
    date_from: z.string().optional().describe('Fecha desde (YYYY-MM-DD)'),
    date_to: z.string().optional().describe('Fecha hasta (YYYY-MM-DD)'),
    payment_method: z.string().optional().describe('Método de pago'),
    limit: z.number().default(10).describe('Límite de resultados'),
    order_by: z
      .enum(['sale_date', 'sale_price', 'created_at'])
      .default('sale_date')
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
      .from('vehicles_sales')
      .select(
        `*, customer:customer_id(id, first_name, last_name, email, phone, rut),
        vehicle:vehicle_id(id, year, price, license_plate, brand:brand_id(name), model:model_id(name)),
        seller:seller_id(id, first_name, last_name),
        vehicles!inner!vehicles_sales_vehicle_id_fkey(client_id)`
      )
      .eq('vehicles.client_id', clientId);

    if (input.id) query = query.eq('id', input.id);
    if (input.seller_id) query = query.eq('seller_id', input.seller_id);
    if (input.status) query = query.eq('status', input.status);
    if (input.payment_method)
      query = query.ilike('payment_method', `%${input.payment_method}%`);
    if (input.date_from) query = query.gte('sale_date', input.date_from);
    if (input.date_to)
      query = query.lte('sale_date', `${input.date_to}T23:59:59`);

    query = query.order(input.order_by, { ascending: input.order_direction === 'asc' });
    query = query.limit(input.limit);

    const { data, error } = await query;

    if (error) return JSON.stringify({ error: error.message });

    let sales = data || [];

    // Post-filter by customer_name
    if (input.customer_name) {
      sales = sales.filter((s: any) => {
        const fullName =
          `${s.customer?.first_name || ''} ${s.customer?.last_name || ''}`.toLowerCase();
        return fullName.includes(input.customer_name!.toLowerCase());
      });
    }

    // Remove the vehicles join helper from results
    sales = sales.map((s: any) => {
      const { vehicles, ...rest } = s;
      return rest;
    });

    return JSON.stringify({ count: sales.length, sales });
  },
});
