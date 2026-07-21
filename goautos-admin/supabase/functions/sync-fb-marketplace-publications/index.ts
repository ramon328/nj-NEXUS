import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { getCatalogProducts } from '../_shared/facebook-api.ts';

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
        JSON.stringify({
          error: 'Integration ID is required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Syncing Facebook Marketplace publications for integration:', integrationId);

    // Fetch the integration
    const { data: integration, error: integrationError } = await supabase
      .from('fb_marketplace_integration')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!integration.access_token || !integration.catalog_id) {
      return new Response(
        JSON.stringify({
          error: 'Integration is missing access token or catalog ID',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if token is expired
    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      // Update integration status
      await supabase
        .from('fb_marketplace_integration')
        .update({ status: 'expired' })
        .eq('id', integrationId);

      return new Response(
        JSON.stringify({
          error: 'Token de Facebook expirado. Por favor, reconecta tu cuenta.',
          tokenExpired: true,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch all posts for this integration
    const { data: posts, error: postsError } = await supabase
      .from('fb_marketplace_post')
      .select('*')
      .eq('integration_id', integrationId)
      .in('status', ['active', 'paused', 'pending']);

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return new Response(
        JSON.stringify({ error: 'Error fetching posts' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No posts to sync',
          synced: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all products from Facebook catalog
    let fbProducts: Record<string, any> = {};
    let fbSyncAvailable = false;

    try {
      const catalogResponse = await getCatalogProducts(
        integration.catalog_id,
        integration.access_token,
        100 // Limit to 100 products per sync
      );

      // Create a map by retailer_id
      for (const product of catalogResponse.data || []) {
        if (product.retailer_id) {
          fbProducts[product.retailer_id] = product;
        }
      }
      fbSyncAvailable = true;
      console.log('Fetched', Object.keys(fbProducts).length, 'products from Facebook Catalog');
    } catch (fbError: any) {
      console.error('Error fetching Facebook Catalog products:', fbError);
      // For vehicle catalogs, this endpoint may not be supported
      console.log('Skipping FB catalog sync due to error');
    }

    // Sync each post
    const results = {
      synced: 0,
      updated: 0,
      errors: 0,
    };

    for (const post of posts) {
      try {
        // If we couldn't fetch FB products, just update sync timestamp
        if (!fbSyncAvailable) {
          await supabase
            .from('fb_marketplace_post')
            .update({
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', post.id);
          results.synced++;
          continue;
        }

        const fbProduct = fbProducts[post.fb_retailer_id];

        if (!fbProduct) {
          // Product might have been deleted on Facebook
          if (post.status !== 'deleted') {
            await supabase
              .from('fb_marketplace_post')
              .update({
                status: 'deleted',
                sync_error: 'Producto no encontrado en el catálogo de Facebook',
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', post.id);
            results.updated++;
          }
          continue;
        }

        // Map Facebook availability to our status
        let newStatus = post.status;
        let newAvailability = post.availability;

        if (fbProduct.availability) {
          switch (fbProduct.availability) {
            case 'in stock':
              newStatus = 'active';
              newAvailability = 'available';
              break;
            case 'out of stock':
              newStatus = 'paused';
              newAvailability = 'out_of_stock';
              break;
            case 'discontinued':
              newStatus = 'deleted';
              newAvailability = 'discontinued';
              break;
          }
        }

        // Check if status changed
        if (newStatus !== post.status || newAvailability !== post.availability) {
          await supabase
            .from('fb_marketplace_post')
            .update({
              status: newStatus,
              availability: newAvailability,
              sync_error: null,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', post.id);
          results.updated++;
        } else {
          // Just update sync time
          await supabase
            .from('fb_marketplace_post')
            .update({
              sync_error: null,
              last_synced_at: new Date().toISOString(),
            })
            .eq('id', post.id);
        }

        results.synced++;
      } catch (postError: any) {
        console.error('Error syncing post:', post.id, postError);
        await supabase
          .from('fb_marketplace_post')
          .update({
            sync_error: postError.message || String(postError),
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', post.id);
        results.errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error syncing publications:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al sincronizar publicaciones',
        details: error.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
