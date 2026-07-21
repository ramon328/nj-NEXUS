import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { ensureFreshMeliToken } from '../_shared/meli-token.ts';
import { pushMeliItemPrice } from '../_shared/meli-price.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Empuja el precio actual de GoAuto (vehicles.price) a las publicaciones ACTIVAS
// de MercadoLibre de un vehículo. Se invoca al cambiar el precio en el admin.
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vehicleId } = await req.json();

    if (!vehicleId) {
      return new Response(JSON.stringify({ error: 'vehicleId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Precio actual del vehículo en GoAuto (la verdad).
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, price')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (vehicle.price == null) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: 'Vehicle has no price' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Publicaciones ACTIVAS de ese vehículo (las cerradas/pausadas ML no deja editarlas).
    const { data: posts, error: postsError } = await supabase
      .from('meli_post')
      .select('id, meli_item_id, user_id, price')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active');

    if (postsError) {
      return new Response(
        JSON.stringify({ error: 'Error fetching publications', details: postsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: 'No active ML publications' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Integración (todas las posts del vehículo comparten user_id).
    const userId = posts[0].user_id;
    const { data: integration, error: integrationError } = await supabase
      .from('meli_integration')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Active MercadoLibre integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const accessToken = tokenResult.accessToken as string;

    const newPrice = Number(vehicle.price);
    let updated = 0;
    const errors: Array<{ meli_item_id: string; error: string }> = [];

    for (const post of posts) {
      if (!post.meli_item_id) continue;
      if (Number(post.price) === newPrice) {
        // El cache local ya está en el precio nuevo; igual empujamos por si ML
        // quedó desfasado, pero evitamos trabajo si claramente coincide.
      }
      const result = await pushMeliItemPrice(accessToken, post.meli_item_id, newPrice);
      if (!result.ok) {
        console.error(
          `No se pudo empujar precio a ML (${post.meli_item_id}):`,
          result.error
        );
        errors.push({ meli_item_id: post.meli_item_id, error: result.error || 'unknown' });
        continue;
      }
      await supabase
        .from('meli_post')
        .update({ price: newPrice, update_at: new Date().toISOString() })
        .eq('id', post.id);
      updated++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        total: posts.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-mercadolibre-publication-price:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
