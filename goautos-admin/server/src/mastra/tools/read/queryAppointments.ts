import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const queryAppointmentsTool = createTool({
  id: 'query_appointments',
  description: 'Buscar agendamientos y citas.',
  inputSchema: z.object({
    id: z.number().optional().describe('ID exacto de la cita'),
    date_from: z.string().optional().describe('Fecha desde (YYYY-MM-DD)'),
    date_to: z.string().optional().describe('Fecha hasta (YYYY-MM-DD)'),
    status: z.string().optional().describe('Estado de la cita'),
    vehicle_id: z.number().optional().describe('ID del vehículo'),
    customer_name: z.string().optional().describe('Nombre del cliente para filtrar'),
    limit: z.number().default(10).describe('Límite de resultados'),
    order_by: z
      .enum(['created_at', 'appointment_date', 'date'])
      .default('appointment_date')
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
      .from('appointments_public')
      .select('*')
      .eq('client_id', clientId);

    if (input.id) query = query.eq('id', input.id);
    if (input.status) query = query.ilike('status', `%${input.status}%`);
    if (input.vehicle_id) query = query.eq('vehicle_id', input.vehicle_id);
    if (input.date_from) query = query.gte('appointment_date', input.date_from);
    if (input.date_to) query = query.lte('appointment_date', input.date_to);

    query = query.order(input.order_by, { ascending: input.order_direction === 'asc' });
    query = query.limit(input.limit);

    const { data, error } = await query;

    if (error) return JSON.stringify({ error: error.message });

    let appointments = data || [];

    // Post-filter by customer_name on customer_name or name fields
    if (input.customer_name) {
      const search = input.customer_name.toLowerCase();
      appointments = appointments.filter(
        (a: any) =>
          a.customer_name?.toLowerCase().includes(search) ||
          a.name?.toLowerCase().includes(search)
      );
    }

    return JSON.stringify({ count: appointments.length, appointments });
  },
});
