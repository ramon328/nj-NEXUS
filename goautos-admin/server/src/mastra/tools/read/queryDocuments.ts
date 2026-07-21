import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const queryDocumentsTool = createTool({
  id: 'query_documents',
  description:
    'Buscar documentos, cotizaciones, reservas y cierres de negocio.',
  inputSchema: z.object({
    type: z
      .enum(['documents', 'quotations', 'reservations', 'close_deals', 'templates'])
      .default('documents')
      .describe('Tipo de documento a buscar'),
    id: z.number().optional().describe('ID exacto del registro'),
    vehicle_id: z.number().optional().describe('ID del vehículo'),
    customer_id: z.number().optional().describe('ID del cliente'),
    status: z.string().optional().describe('Estado del documento'),
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

    switch (input.type) {
      case 'quotations': {
        let query = supabaseAdmin
          .from('vehicles_quotations')
          .select('*, vehicle:vehicle_id(id, brand:brand_id(name), model:model_id(name), year, license_plate, price), customer:customer_id(id, first_name, last_name, email, phone)')
          .eq('client_id', clientId);

        if (input.id) query = query.eq('id', input.id);
        if (input.vehicle_id) query = query.eq('vehicle_id', input.vehicle_id);
        if (input.customer_id) query = query.eq('customer_id', input.customer_id);
        if (input.status) query = query.ilike('status', `%${input.status}%`);
        if (input.date_from) query = query.gte('quotation_date', input.date_from);
        if (input.date_to) query = query.lte('quotation_date', input.date_to);

        query = query.order(input.order_by, { ascending: input.order_direction === 'asc' });
        query = query.limit(input.limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, quotations: data || [] });
      }

      case 'reservations': {
        let query = supabaseAdmin
          .from('vehicles_reservations')
          .select('*, vehicle:vehicle_id(id, brand:brand_id(name), model:model_id(name), year, license_plate, price), customer:customer_id(id, first_name, last_name, email, phone)')
          .eq('client_id', clientId);

        if (input.id) query = query.eq('id', input.id);
        if (input.vehicle_id) query = query.eq('vehicle_id', input.vehicle_id);
        if (input.customer_id) query = query.eq('customer_id', input.customer_id);
        if (input.status) query = query.ilike('status', `%${input.status}%`);
        if (input.date_from) query = query.gte('reservation_date', input.date_from);
        if (input.date_to) query = query.lte('reservation_date', input.date_to);

        query = query.order(input.order_by, { ascending: input.order_direction === 'asc' });
        query = query.limit(input.limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, reservations: data || [] });
      }

      case 'close_deals': {
        let query = supabaseAdmin
          .from('vehicles_close_deal')
          .select('*, vehicle:vehicle_id(id, brand:brand_id(name), model:model_id(name), year, license_plate, price), customer:customer_id(id, first_name, last_name, email, phone)')
          .eq('client_id', clientId);

        if (input.id) query = query.eq('id', input.id);
        if (input.vehicle_id) query = query.eq('vehicle_id', input.vehicle_id);
        if (input.customer_id) query = query.eq('customer_id', input.customer_id);
        if (input.status) query = query.ilike('status', `%${input.status}%`);

        query = query.order(input.order_by, { ascending: input.order_direction === 'asc' });
        query = query.limit(input.limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, close_deals: data || [] });
      }

      case 'templates': {
        let query = supabaseAdmin
          .from('document_templates')
          .select('*')
          .eq('client_id', clientId);

        if (input.id) query = query.eq('id', input.id);

        query = query.order(input.order_by, { ascending: input.order_direction === 'asc' });
        query = query.limit(input.limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, templates: data || [] });
      }

      default: {
        let query = supabaseAdmin
          .from('vehicles_documents')
          .select('*, vehicle:vehicle_id(id, brand:brand_id(name), model:model_id(name), year, license_plate)')
          .eq('client_id', clientId);

        if (input.id) query = query.eq('id', input.id);
        if (input.vehicle_id) query = query.eq('vehicle_id', input.vehicle_id);
        if (input.status) query = query.ilike('status', `%${input.status}%`);
        if (input.date_from) query = query.gte('created_at', input.date_from);
        if (input.date_to) query = query.lte('created_at', input.date_to);

        query = query.order(input.order_by, { ascending: input.order_direction === 'asc' });
        query = query.limit(input.limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, documents: data || [] });
      }
    }
  },
});
