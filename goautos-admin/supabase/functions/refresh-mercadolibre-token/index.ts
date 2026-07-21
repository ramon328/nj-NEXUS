import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { refreshMeliToken } from '../_shared/meli-token.ts';

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

    // Fetch the integration to get the refresh_token
    const { data: integration, error: fetchError } = await supabase
      .from('meli_integration')
      .select('id, refresh_token')
      .eq('id', integrationId)
      .single();

    if (fetchError || !integration) {
      console.error('Error fetching integration:', fetchError);
      return new Response(
        JSON.stringify({
          error: 'Integration not found',
          details: fetchError,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!integration.refresh_token) {
      return new Response(
        JSON.stringify({
          error: 'No refresh token found for this integration',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Refreshing MercadoLibre token for integration:', integrationId);

    // Refresh + persist robustamente (reintentos + recuperación de carreras).
    const result = await refreshMeliToken(integration.id, integration.refresh_token);

    if (!result.ok) {
      console.error('Error refreshing access token:', result.error, result.details);
      return new Response(
        JSON.stringify({
          error: result.error || 'Failed to refresh access token',
          tokenExpired: result.tokenExpired ?? false,
          details: result.details,
        }),
        {
          status: result.tokenExpired ? 401 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Refrescamos en ML pero no logramos guardar los tokens nuevos: NO mentir
    // con "éxito" — la integración se romperá en la próxima llamada.
    if (result.persisted === false) {
      console.error('Refreshed at ML but failed to persist for integration:', integrationId);
      return new Response(
        JSON.stringify({
          error:
            'Renovamos la sesión con MercadoLibre pero no se pudo guardar. Intenta de nuevo en unos segundos.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Token refreshed successfully for integration:', integrationId);

    return new Response(
      JSON.stringify({
        success: true,
        expiresAt: result.expiresAt,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unhandled error in refresh-mercadolibre-token:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
