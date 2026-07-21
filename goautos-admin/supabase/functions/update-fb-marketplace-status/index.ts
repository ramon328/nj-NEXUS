import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { updateProduct, deleteProductByRetailerId } from '../_shared/facebook-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type ActionType = 'pause' | 'activate' | 'delete';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { postId, action } = await req.json();
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

    if (!postId || !action) {
      return new Response(
        JSON.stringify({
          error: 'Post ID and action are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const validActions: ActionType[] = ['pause', 'activate', 'delete'];
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({
          error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Updating Facebook Marketplace post status:', postId, action);

    // Fetch the post with integration
    const { data: post, error: postError } = await supabase
      .from('fb_marketplace_post')
      .select(`
        *,
        integration:integration_id(*)
      `)
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('Post not found:', postError);
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const integration = post.integration;

    if (!integration?.access_token || !integration?.catalog_id) {
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

    let newStatus: string;
    let newAvailability: string;

    try {
      switch (action as ActionType) {
        case 'pause':
          // Update availability to out of stock
          await updateProduct(
            integration.catalog_id,
            post.fb_retailer_id,
            { availability: 'out of stock' },
            integration.access_token
          );
          newStatus = 'paused';
          newAvailability = 'out_of_stock';
          break;

        case 'activate':
          // Update availability to in stock
          await updateProduct(
            integration.catalog_id,
            post.fb_retailer_id,
            { availability: 'in stock' },
            integration.access_token
          );
          newStatus = 'active';
          newAvailability = 'available';
          break;

        case 'delete':
          // Delete product from catalog using retailer_id
          await deleteProductByRetailerId(
            integration.catalog_id,
            post.fb_retailer_id,
            integration.access_token
          );
          newStatus = 'deleted';
          newAvailability = 'discontinued';
          break;
      }
    } catch (fbError: any) {
      console.error('Facebook API error:', fbError);
      return new Response(
        JSON.stringify({
          error: 'Error al actualizar en Facebook',
          details: fbError.message || String(fbError),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update post in database
    const { error: updateError } = await supabase
      .from('fb_marketplace_post')
      .update({
        status: newStatus,
        availability: newAvailability,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', postId);

    if (updateError) {
      console.error('Error updating post in database:', updateError);
      // Don't fail - the Facebook update was successful
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          post_id: postId,
          action,
          new_status: newStatus,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating post status:', error);
    return new Response(
      JSON.stringify({
        error: 'Error al actualizar estado',
        details: error.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
