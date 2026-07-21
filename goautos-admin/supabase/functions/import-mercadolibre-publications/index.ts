import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { ensureFreshMeliToken } from '../_shared/meli-token.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integrationId } = await req.json();
    const authHeader = req.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integrationId) {
      return new Response(
        JSON.stringify({ error: 'Integration ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Importing MercadoLibre publications for integration:', integrationId);

    // Get the MercadoLibre integration
    const { data: integration, error: integrationError } = await supabase
      .from('meli_integration')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'MercadoLibre integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Asegurar token fresco (refresh robusto centralizado en _shared/meli-token).
    const tokenResult = await ensureFreshMeliToken(integration);
    if (!tokenResult.ok) {
      return new Response(
        JSON.stringify({
          error: tokenResult.error,
          tokenExpired: tokenResult.tokenExpired ?? false,
          details: tokenResult.details,
        }),
        {
          status: tokenResult.tokenExpired ? 401 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const accessToken = tokenResult.accessToken;

    // Get user info to get the seller_id
    const userResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Token inválido. Reconecta tu cuenta.', tokenExpired: true }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData = await userResponse.json();
    const sellerId = userData.id;

    console.log('Fetching publications for seller:', sellerId);

    // Get existing meli_item_ids already linked in our system
    const { data: existingPosts } = await supabase
      .from('meli_post')
      .select('meli_item_id')
      .eq('user_id', integration.user_id);

    const existingItemIds = new Set((existingPosts || []).map((p: any) => p.meli_item_id));

    // Trae TODOS los avisos de un status (paginando la búsqueda y pidiendo los
    // detalles en lotes de 20, que es el máximo real del multiget /items?ids=).
    // Cualquier fallo de la API se ACUMULA (no se traga con break) para poder
    // avisarle al usuario que la lista puede venir incompleta.
    const MULTIGET_MAX = 20; // límite duro del endpoint /items?ids=
    const SEARCH_LIMIT = 50; // límite del /items/search
    const fetchErrors: string[] = [];

    const fetchByStatus = async (status: string) => {
      let offset = 0;
      let total = 0;

      do {
        const searchUrl = `https://api.mercadolibre.com/users/${sellerId}/items/search?status=${status}&offset=${offset}&limit=${SEARCH_LIMIT}`;
        const searchResponse = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!searchResponse.ok) {
          console.error(`Error searching ${status} items:`, searchResponse.status);
          fetchErrors.push(`No se pudieron listar los avisos ${status} (HTTP ${searchResponse.status}).`);
          break;
        }

        const searchData = await searchResponse.json();
        total = searchData.paging?.total || 0;
        const results: string[] = searchData.results || [];

        // Multiget en lotes de 20.
        for (let i = 0; i < results.length; i += MULTIGET_MAX) {
          const chunk = results.slice(i, i + MULTIGET_MAX);
          const itemsResponse = await fetch(
            `https://api.mercadolibre.com/items?ids=${chunk.join(',')}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!itemsResponse.ok) {
            console.error(`Error fetching item details (${status}):`, itemsResponse.status);
            fetchErrors.push(`No se pudieron traer los detalles de algunos avisos ${status} (HTTP ${itemsResponse.status}).`);
            continue;
          }

          const itemsData = await itemsResponse.json();
          for (const item of itemsData) {
            if (item.code === 200 && item.body) {
              const body = item.body;
              // Saltar los que ya están vinculados en nuestro sistema.
              if (!existingItemIds.has(body.id)) {
                allItems.push({
                  meli_item_id: body.id,
                  title: body.title,
                  price: body.price,
                  currency_id: body.currency_id,
                  status: body.status,
                  permalink: body.permalink,
                  thumbnail: body.thumbnail,
                  listing_type_id: body.listing_type_id,
                  category_id: body.category_id,
                  date_created: body.date_created,
                });
              }
            }
          }
        }

        offset += SEARCH_LIMIT;
      } while (offset < total);
    };

    const allItems: any[] = [];
    await fetchByStatus('active');
    await fetchByStatus('paused');

    console.log(`Found ${allItems.length} unlinked publications (${fetchErrors.length} errores parciales)`);

    return new Response(
      JSON.stringify({
        success: true,
        publications: allItems,
        total: allItems.length,
        // Si hubo fallos parciales, el frontend avisa que la lista puede estar incompleta.
        partialError: fetchErrors.length > 0 ? fetchErrors.join(' ') : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in import-mercadolibre-publications:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
