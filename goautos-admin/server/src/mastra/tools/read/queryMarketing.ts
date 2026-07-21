import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { supabaseAdmin } from '../../../lib/supabase';

export const queryMarketingTool = createTool({
  id: 'query_marketing',
  description:
    'Buscar información de integraciones de marketing: Instagram, MercadoLibre, Facebook Marketplace, ChileAutos, emails.',
  inputSchema: z.object({
    platform: z
      .enum(['instagram', 'mercadolibre', 'facebook', 'chileautos', 'emails'])
      .optional()
      .describe('Plataforma de marketing a consultar. Si no se especifica, retorna el estado de todas.'),
    vehicle_id: z.number().optional().describe('ID del vehículo'),
    status: z.string().optional().describe('Estado de la publicación'),
    date_from: z.string().optional().describe('Fecha desde (YYYY-MM-DD)'),
    date_to: z.string().optional().describe('Fecha hasta (YYYY-MM-DD)'),
    limit: z.number().default(10).describe('Límite de resultados'),
  }),
  execute: async (params: any) => {
    const input = params.context;
    const clientId = params.runtimeContext.get("clientId");

    switch (input.platform) {
      case 'instagram': {
        const { data: integration, error } = await supabaseAdmin
          .from('instagram_integrations')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle();

        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ connected: !!integration, integration });
      }

      case 'mercadolibre': {
        const { data: integration } = await supabaseAdmin
          .from('meli_integration')
          .select('*')
          .eq('user_id', clientId)
          .maybeSingle();

        let postsQuery = supabaseAdmin
          .from('meli_post')
          .select('*, vehicle:vehicle_id(id, brand:brand_id(name), model:model_id(name), year, license_plate)')
          .eq('client_id', clientId);

        if (input.vehicle_id) postsQuery = postsQuery.eq('vehicle_id', input.vehicle_id);
        if (input.status) postsQuery = postsQuery.ilike('status', `%${input.status}%`);
        if (input.date_from) postsQuery = postsQuery.gte('created_at', input.date_from);
        if (input.date_to) postsQuery = postsQuery.lte('created_at', input.date_to);

        postsQuery = postsQuery.order('created_at', { ascending: false }).limit(input.limit);

        const { data: posts, error } = await postsQuery;
        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({
          connected: !!integration,
          integration: integration ? { id: integration.id, user_id: integration.user_id, nickname: integration.nickname } : null,
          posts_count: (posts || []).length,
          posts: posts || [],
        });
      }

      case 'facebook': {
        const { data: integration } = await supabaseAdmin
          .from('fb_marketplace_integration')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle();

        let postsQuery = supabaseAdmin
          .from('fb_marketplace_post')
          .select('*, vehicle:vehicle_id(id, brand:brand_id(name), model:model_id(name), year, license_plate)')
          .eq('client_id', clientId);

        if (input.vehicle_id) postsQuery = postsQuery.eq('vehicle_id', input.vehicle_id);
        if (input.status) postsQuery = postsQuery.ilike('status', `%${input.status}%`);
        if (input.date_from) postsQuery = postsQuery.gte('created_at', input.date_from);
        if (input.date_to) postsQuery = postsQuery.lte('created_at', input.date_to);

        postsQuery = postsQuery.order('created_at', { ascending: false }).limit(input.limit);

        const { data: posts, error } = await postsQuery;
        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({
          connected: !!integration,
          integration: integration ? { id: integration.id, page_name: integration.page_name } : null,
          posts_count: (posts || []).length,
          posts: posts || [],
        });
      }

      case 'chileautos': {
        const { data: integration } = await supabaseAdmin
          .from('chileautos_integration')
          .select('*')
          .eq('client_id', clientId)
          .maybeSingle();

        let listingsQuery = supabaseAdmin
          .from('chileautos_listing')
          .select('*, vehicle:vehicle_id(id, brand:brand_id(name), model:model_id(name), year, license_plate)')
          .eq('client_id', clientId);

        if (input.vehicle_id) listingsQuery = listingsQuery.eq('vehicle_id', input.vehicle_id);
        if (input.status) listingsQuery = listingsQuery.ilike('status', `%${input.status}%`);
        if (input.date_from) listingsQuery = listingsQuery.gte('created_at', input.date_from);
        if (input.date_to) listingsQuery = listingsQuery.lte('created_at', input.date_to);

        listingsQuery = listingsQuery.order('created_at', { ascending: false }).limit(input.limit);

        const { data: listings, error } = await listingsQuery;
        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({
          connected: !!integration,
          integration: integration ? { id: integration.id, dealer_id: integration.dealer_id } : null,
          listings_count: (listings || []).length,
          listings: listings || [],
        });
      }

      case 'emails': {
        let query = supabaseAdmin
          .from('marketing_emails_history')
          .select('*')
          .eq('client_id', clientId);

        if (input.date_from) query = query.gte('created_at', input.date_from);
        if (input.date_to) query = query.lte('created_at', input.date_to);

        query = query.order('created_at', { ascending: false }).limit(input.limit);

        const { data, error } = await query;
        if (error) return JSON.stringify({ error: error.message });

        return JSON.stringify({ count: (data || []).length, emails: data || [] });
      }

      default: {
        // Return connection status for all platforms
        const [instagram, mercadolibre, facebook, chileautos] = await Promise.all([
          supabaseAdmin
            .from('instagram_integrations')
            .select('id')
            .eq('client_id', clientId)
            .maybeSingle(),
          supabaseAdmin
            .from('meli_integration')
            .select('id')
            .eq('user_id', clientId)
            .maybeSingle(),
          supabaseAdmin
            .from('fb_marketplace_integration')
            .select('id')
            .eq('client_id', clientId)
            .maybeSingle(),
          supabaseAdmin
            .from('chileautos_integration')
            .select('id')
            .eq('client_id', clientId)
            .maybeSingle(),
        ]);

        return JSON.stringify({
          platforms: {
            instagram: { connected: !!instagram.data },
            mercadolibre: { connected: !!mercadolibre.data },
            facebook_marketplace: { connected: !!facebook.data },
            chileautos: { connected: !!chileautos.data },
          },
        });
      }
    }
  },
});
