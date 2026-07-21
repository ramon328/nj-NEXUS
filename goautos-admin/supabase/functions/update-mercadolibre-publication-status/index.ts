import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { ensureFreshMeliToken } from '../_shared/meli-token.ts';
import { reportError } from '../_shared/error-reporter.ts';

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
    const { publicationId, action } = await req.json();
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

    if (!publicationId || !action) {
      return new Response(
        JSON.stringify({
          error: 'Publication ID and action are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Valid actions: pause, close, activate
    if (!['pause', 'close', 'activate'].includes(action)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid action. Must be: pause, close, or activate',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Updating MercadoLibre publication ${publicationId} - Action: ${action}`);

    // Get the publication
    const { data: publication, error: pubError } = await supabase
      .from('meli_post')
      .select('*')
      .eq('id', publicationId)
      .single();

    if (pubError || !publication) {
      console.error('Publication not found:', pubError);
      return new Response(
        JSON.stringify({ error: 'Publication not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get the MercadoLibre integration
    const { data: integration, error: integrationError } = await supabase
      .from('meli_integration')
      .select('*')
      .eq('user_id', publication.user_id)
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      console.error('MercadoLibre integration not found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Active MercadoLibre integration not found' }),
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

    // Map action to MercadoLibre status
    const statusMap = {
      pause: 'paused',
      close: 'closed',
      activate: 'active',
    };

    const newStatus = statusMap[action as keyof typeof statusMap];

    // Update status in MercadoLibre
    const meliResponse = await fetch(
      `https://api.mercadolibre.com/items/${publication.meli_item_id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      }
    );

    const meliData = await meliResponse.json();

    console.log('MercadoLibre API response:', meliResponse.status, meliData);

    if (!meliResponse.ok) {
      console.error('Error updating MercadoLibre publication:', meliData);
      return new Response(
        JSON.stringify({
          error: 'Failed to update publication status in MercadoLibre',
          details: meliData,
        }),
        {
          status: meliResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update status in our database
    const { error: updateError } = await supabase
      .from('meli_post')
      .update({
        status: meliData.status,
        update_at: new Date().toISOString(),
      })
      .eq('id', publicationId);

    if (updateError) {
      console.error('Error updating publication in database:', updateError);
      return new Response(
        JSON.stringify({
          error: 'MercadoLibre updated but failed to sync local database',
          details: updateError.message,
          meli_status: meliData.status,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Successfully updated publication ${publicationId} to ${newStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: meliData.status,
        message: `Publication ${action}d successfully`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in update-mercadolibre-publication-status function:', error);
    await reportError({ functionName: 'update-mercadolibre-publication-status', error });
    return new Response(
      JSON.stringify({
        error: error.message || 'An unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
