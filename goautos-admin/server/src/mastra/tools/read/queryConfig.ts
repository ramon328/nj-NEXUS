import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const queryConfigTool = createTool({
  id: 'query_config',
  description:
    'Buscar configuraciones del sistema: info legal, sucursales, estados de vehículos, checklist, config del sitio web, marcas, modelos, colores, condiciones, tipos de combustible, categorías, tiers de comisiones.',
  inputSchema: z.object({
    entity: z
      .enum([
        'legal_info',
        'dealerships',
        'states',
        'checklist',
        'website',
        'brands',
        'models',
        'colors',
        'conditions',
        'fuel_types',
        'categories',
        'commission_tiers',
      ])
      .describe('Entidad de configuración a consultar'),
    limit: z.number().default(50).describe('Límite de resultados'),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    switch (input.entity) {
      case 'legal_info': {
        const { data, error } = await supabaseAdmin
          .from('legal_info')
          .select('*, dealership:dealership_id(id, name, address)')
          .eq('client_id', clientId)
          .limit(input.limit);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, legal_info: data || [] });
      }

      case 'dealerships': {
        const { data, error } = await supabaseAdmin
          .from('dealerships')
          .select('*')
          .eq('client_id', clientId)
          .limit(input.limit);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, dealerships: data || [] });
      }

      case 'states': {
        const { data, error } = await supabaseAdmin
          .from('clients_vehicles_states')
          .select('*')
          .eq('client_id', clientId)
          .order('order', { ascending: true })
          .limit(input.limit);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, states: data || [] });
      }

      case 'checklist': {
        const { data, error } = await supabaseAdmin
          .from('client_checklist_items')
          .select('*')
          .eq('client_id', clientId)
          .order('order', { ascending: true })
          .limit(input.limit);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, checklist: data || [] });
      }

      case 'website': {
        const { data, error } = await supabaseAdmin
          .from('client_website_config')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ website_config: data });
      }

      case 'brands': {
        const { data, error } = await supabaseAdmin
          .from('brands')
          .select('*')
          .eq('client_id', clientId)
          .order('name', { ascending: true })
          .limit(input.limit);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, brands: data || [] });
      }

      case 'models': {
        const { data, error } = await supabaseAdmin
          .from('models')
          .select('*, brand:brand_id(name)')
          .eq('client_id', clientId)
          .order('name', { ascending: true })
          .limit(input.limit);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, models: data || [] });
      }

      case 'colors': {
        const { data, error } = await supabaseAdmin
          .from('colors')
          .select('*')
          .eq('client_id', clientId)
          .order('name', { ascending: true })
          .limit(input.limit);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, colors: data || [] });
      }

      case 'conditions': {
        const { data, error } = await supabaseAdmin
          .from('conditions')
          .select('*')
          .eq('client_id', clientId)
          .order('name', { ascending: true })
          .limit(input.limit);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, conditions: data || [] });
      }

      case 'fuel_types': {
        const { data, error } = await supabaseAdmin
          .from('fuel_types')
          .select('*')
          .eq('client_id', clientId)
          .order('name', { ascending: true })
          .limit(input.limit);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, fuel_types: data || [] });
      }

      case 'categories': {
        const { data, error } = await supabaseAdmin
          .from('categories')
          .select('*')
          .eq('client_id', clientId)
          .order('name', { ascending: true })
          .limit(input.limit);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, categories: data || [] });
      }

      case 'commission_tiers': {
        const { data, error } = await supabaseAdmin
          .from('seller_commission_tiers')
          .select('*')
          .eq('client_id', clientId)
          .order('min_sales', { ascending: true })
          .limit(input.limit);

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ count: (data || []).length, commission_tiers: data || [] });
      }

      default:
        return JSON.stringify({ error: 'Entidad de configuración no válida' });
    }
  },
});
