import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const queryExpensesTool = createTool({
  id: 'query_expenses',
  description:
    'Buscar gastos fijos mensuales, gastos de vehículos y categorías de transacciones.',
  inputSchema: z.object({
    type: z
      .enum(['fixed', 'vehicle_extras', 'categories'])
      .default('fixed')
      .describe('Tipo de gasto a buscar'),
    vehicle_id: z.number().optional().describe('ID del vehículo (para vehicle_extras)'),
    is_active: z.boolean().optional().describe('Filtrar por activo/inactivo (para fixed)'),
    category: z.string().optional().describe('Categoría o descripción para filtrar'),
    date_from: z.string().optional().describe('Fecha desde (YYYY-MM-DD)'),
    date_to: z.string().optional().describe('Fecha hasta (YYYY-MM-DD)'),
    limit: z.number().default(10).describe('Límite de resultados'),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    switch (input.type) {
      case 'fixed': {
        let query = supabaseAdmin
          .from('fixed_monthly_expenses')
          .select('*')
          .eq('client_id', clientId);

        // Default to active only
        const isActive = input.is_active !== undefined ? input.is_active : true;
        query = query.eq('is_active', isActive);

        if (input.date_from) query = query.gte('created_at', input.date_from);
        if (input.date_to) query = query.lte('created_at', input.date_to);

        query = query.order('created_at', { ascending: false }).limit(input.limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        const expenses = data || [];
        const total_monthly = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

        return JSON.stringify({ count: expenses.length, total_monthly, expenses });
      }

      case 'vehicle_extras': {
        let query = supabaseAdmin
          .from('vehicles_extras')
          .select('*, vehicle:vehicle_id!inner(id, client_id, brand:brand_id(name), model:model_id(name), year, license_plate)')
          .eq('vehicle.client_id', clientId)
          .eq('type', 'expense');

        if (input.vehicle_id) query = query.eq('vehicle_id', input.vehicle_id);
        if (input.date_from) query = query.gte('created_at', input.date_from);
        if (input.date_to) query = query.lte('created_at', input.date_to);

        query = query.order('created_at', { ascending: false }).limit(input.limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        let expenses = data || [];

        // Post-filter by category on description field
        if (input.category) {
          const search = input.category.toLowerCase();
          expenses = expenses.filter(
            (e: any) => e.description?.toLowerCase().includes(search)
          );
        }

        const total = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

        return JSON.stringify({ count: expenses.length, total, expenses });
      }

      case 'categories': {
        const { data, error } = await supabaseAdmin
          .from('transaction_categories')
          .select('*')
          .eq('client_id', clientId)
          .order('name', { ascending: true });

        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({ count: (data || []).length, categories: data || [] });
      }

      default:
        return JSON.stringify({ error: 'Tipo de gasto no válido' });
    }
  },
});
