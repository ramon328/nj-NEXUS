import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { ensureFreshMeliToken } from '../_shared/meli-token.ts';
import { pushMeliItemPrice } from '../_shared/meli-price.ts';

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
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!integrationId) {
      return new Response(
        JSON.stringify({ error: 'Integration ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Syncing MercadoLibre publications for integration:', integrationId);

    // Get the MercadoLibre integration
    const { data: integration, error: integrationError } = await supabase
      .from('meli_integration')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      console.error('MercadoLibre integration not found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'MercadoLibre integration not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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

    // Validate token before proceeding
    const validateResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!validateResponse.ok) {
      console.error('Token validation failed:', validateResponse.status);
      return new Response(
        JSON.stringify({
          error: 'Token de MercadoLibre inválido. Por favor, reconecta tu cuenta.',
          tokenExpired: true,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get all publications for this user (con el precio actual de GoAuto para
    // poder empujarlo a ML: el precio del vehículo es la fuente de verdad).
    const { data: publications, error: pubError } = await supabase
      .from('meli_post')
      .select('*, vehicle:vehicle_id(price)')
      .eq('user_id', integration.user_id);

    if (pubError) {
      console.error('Error fetching publications:', pubError);
      return new Response(
        JSON.stringify({ error: 'Error fetching publications' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!publications || publications.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No publications to sync',
          updated: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${publications.length} publications to sync`);

    let updatedCount = 0;
    const errors = [];

    // Sync each publication
    for (const publication of publications) {
      if (!publication.meli_item_id) {
        console.log(`Skipping publication ${publication.id} - no meli_item_id`);
        continue;
      }

      try {
        // Get item status from MercadoLibre API
        const meliResponse = await fetch(
          `https://api.mercadolibre.com/items/${publication.meli_item_id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!meliResponse.ok) {
          console.error(
            `Error fetching item ${publication.meli_item_id}:`,
            meliResponse.status
          );
          errors.push({
            publication_id: publication.id,
            meli_item_id: publication.meli_item_id,
            error: `HTTP ${meliResponse.status}`,
          });
          continue;
        }

        const itemData = await meliResponse.json();

        // Sincroniza estado/título/url desde ML hacia `meli_post` (la "vista de
        // ML"). NUNCA tocamos `vehicles.*`. El PRECIO es la excepción: GoAuto
        // manda → si el aviso está activo y su precio en ML difiere del de
        // GoAuto (vehicles.price), lo EMPUJAMOS a ML. Luego `meli_post.price`
        // refleja el precio real que quedó en ML.
        const updates: Record<string, unknown> = {};
        if (itemData.status !== undefined && itemData.status !== publication.status) {
          updates.status = itemData.status;
        }

        let effectiveMlPrice = itemData.price;
        const goautoPrice = publication.vehicle?.price;
        if (
          goautoPrice != null &&
          itemData.status === 'active' &&
          Number(goautoPrice) !== Number(itemData.price)
        ) {
          const pricePush = await pushMeliItemPrice(
            accessToken,
            publication.meli_item_id,
            Number(goautoPrice)
          );
          if (pricePush.ok) {
            effectiveMlPrice = Number(goautoPrice); // ML ahora = GoAuto
            console.log(
              `Precio empujado a ML (${publication.meli_item_id}): ${itemData.price} -> ${goautoPrice}`
            );
          } else {
            console.error(
              `No se pudo empujar precio a ML (${publication.meli_item_id}):`,
              pricePush.error
            );
          }
        }
        if (
          effectiveMlPrice !== undefined &&
          effectiveMlPrice !== null &&
          Number(effectiveMlPrice) !== Number(publication.price)
        ) {
          updates.price = effectiveMlPrice;
        }
        if (
          itemData.listing_type_id &&
          itemData.listing_type_id !== publication.type_post
        ) {
          updates.type_post = itemData.listing_type_id;
        }
        if (itemData.title && itemData.title !== publication.title) {
          updates.title = itemData.title;
        }
        if (itemData.permalink && itemData.permalink !== publication.url_post) {
          updates.url_post = itemData.permalink;
        }

        if (Object.keys(updates).length === 0) {
          console.log(`Publication ${publication.id} already up to date`);
          continue;
        }

        updates.update_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from('meli_post')
          .update(updates)
          .eq('id', publication.id);

        if (updateError) {
          console.error(`Error updating publication ${publication.id}:`, updateError);
          errors.push({
            publication_id: publication.id,
            meli_item_id: publication.meli_item_id,
            error: updateError.message,
          });
          continue;
        }

        console.log(
          `Updated publication ${publication.id} - Changed fields:`,
          Object.keys(updates).filter((k) => k !== 'update_at')
        );
        updatedCount++;
      } catch (error) {
        console.error(
          `Exception syncing publication ${publication.id}:`,
          error.message
        );
        errors.push({
          publication_id: publication.id,
          meli_item_id: publication.meli_item_id,
          error: error.message,
        });
      }
    }

    console.log(`Sync completed. Updated ${updatedCount} of ${publications.length} publications`);

    return new Response(
      JSON.stringify({
        success: true,
        updated: updatedCount,
        total: publications.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in sync-mercadolibre-publications function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An unknown error occurred',
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
