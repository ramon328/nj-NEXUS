import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// ChileAutos API endpoints
const CA_AUTH_URL = Deno.env.get('CHILEAUTOS_AUTH_URL') || 'https://id.csnglobal.net/connect/token';

interface ChileautosTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Obtiene un token de acceso de ChileAutos usando client credentials.
 * Credentials are shared for GoAutos as integrator (from env vars).
 */
async function getChileautosToken(
  clientId: string,
  clientSecret: string
): Promise<ChileautosTokenResponse> {
  const formData = new URLSearchParams();
  formData.append('client_id', clientId);
  formData.append('client_secret', clientSecret);
  formData.append('grant_type', 'client_credentials');

  const response = await fetch(CA_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('ChileAutos auth error:', errorText);
    throw new Error(`Error de autenticación con ChileAutos: ${response.status}`);
  }

  return await response.json();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, refresh } = await req.json();

    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'clientId es requerido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Processing ChileAutos auth for client ${clientId}, refresh: ${refresh}`);

    // Step 1: Verify the tenant has an integration record
    const { data: integration, error: fetchError } = await supabase
      .from('chileautos_integration')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (fetchError || !integration) {
      console.error('Error fetching integration:', fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No se encontró integración de ChileAutos para este cliente',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 2: Read shared credentials from environment variables
    const caClientId = Deno.env.get('CHILEAUTOS_CLIENT_ID');
    const caClientSecret = Deno.env.get('CHILEAUTOS_CLIENT_SECRET');

    if (!caClientId || !caClientSecret) {
      console.error('CHILEAUTOS_CLIENT_ID or CHILEAUTOS_CLIENT_SECRET not set in env');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Las credenciales de ChileAutos no están configuradas en el servidor',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 3: Check shared token cache in chileautos_system_config
    const { data: systemConfig } = await supabase
      .from('chileautos_system_config')
      .select('*')
      .eq('id', 1)
      .single();

    if (!refresh && systemConfig?.access_token && systemConfig?.token_expires_at) {
      const expiresAt = new Date(systemConfig.token_expires_at);
      const now = new Date();
      const bufferMinutes = 5;

      if (expiresAt > new Date(now.getTime() + bufferMinutes * 60 * 1000)) {
        console.log('Shared token still valid, no refresh needed');

        // Update tenant integration status to active
        await supabase
          .from('chileautos_integration')
          .update({
            status: 'active',
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', integration.id);

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Token todavía válido',
            expires_at: systemConfig.token_expires_at,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 4: Get new token from ChileAutos using shared credentials
    console.log('Getting new token from ChileAutos API (shared credentials)');
    const tokenData = await getChileautosToken(caClientId, caClientSecret);

    // Calculate expiry (ChileAutos tokens typically expire in 1 hour)
    const expiresInSeconds = tokenData.expires_in || 3600;
    const expiryDate = new Date(Date.now() + expiresInSeconds * 1000);

    // Step 5: Update shared token cache in chileautos_system_config
    const { error: configUpdateError } = await supabase
      .from('chileautos_system_config')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: expiryDate.toISOString(),
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (configUpdateError) {
      console.error('Error updating shared token cache:', configUpdateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error al guardar el token compartido',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 6: Update tenant integration status to active
    await supabase
      .from('chileautos_integration')
      .update({
        status: 'active',
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    console.log('Shared token updated successfully, expires at:', expiryDate.toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Autenticación exitosa',
        expires_at: expiryDate.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unhandled error in ChileAutos auth:', error);

    // Try to update integration status to error
    try {
      const { clientId } = await req.clone().json();
      if (clientId) {
        await supabase
          .from('chileautos_integration')
          .update({
            status: 'error',
            last_error: error.message || 'Error de autenticación',
            updated_at: new Date().toISOString(),
          })
          .eq('client_id', clientId);
      }
    } catch (e) {
      console.error('Error updating status:', e);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Error interno del servidor',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
