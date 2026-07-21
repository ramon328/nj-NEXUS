import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { MeliUser } from '../../../src/types/Mercadolibre.ts';

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
    const { code, clientId, codeVerifier, redirectUri: clientRedirectUri } = await req.json();

    if (!code || !clientId || !codeVerifier) {
      return new Response(
        JSON.stringify({
          error: 'Code, clientId and codeVerifier are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get credentials from environment variables (Supabase secrets)
    const MERCADOLIBRE_APP_ID = Deno.env.get('MERCADOLIBRE_APP_ID') || '8320956027534200';
    const MERCADOLIBRE_CLIENT_SECRET = Deno.env.get('MERCADOLIBRE_CLIENT_SECRET') || 'EDL8Mcgvy5qyD8slMHmkqagGJPluH2vH';

    // Use the redirect URI from the client (origin-based) or fall back to env variable
    const redirectUri = clientRedirectUri || Deno.env.get('MERCADOLIBRE_REDIRECT_URI') || 'https://www.portal.goauto.cl/mercadolibre';

    console.log('Exchanging code for access token with PKCE');

    // Exchange code for access token with PKCE
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('client_id', MERCADOLIBRE_APP_ID);
    formData.append('client_secret', MERCADOLIBRE_CLIENT_SECRET);
    formData.append('code', code);
    formData.append('code_verifier', codeVerifier);
    formData.append('redirect_uri', redirectUri);

    const tokenResponse = await fetch(
      'https://api.mercadolibre.com/oauth/token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );

    const tokenData = await tokenResponse.json();

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Error getting access token:', JSON.stringify(tokenData));
      return new Response(
        JSON.stringify({
          error: 'Failed to get access token',
          details: tokenData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch user details with the access token
    const userResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: {
        Authorization: 'Bearer ' + tokenData.access_token,
      },
    });

    if (!userResponse.ok) {
      console.error('Error fetching user details:', await userResponse.text());
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch Mercadolibre user details',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userData: MeliUser = await userResponse.json();
    console.log(userData);

    console.log('User data received:', userData.id, userData.nickname);

    // Calculate token expiry date (Mercadolibre tokens expire in seconds)
    const expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);

    // Check if integration already exists for this client and Mercadolibre account
    const { data: existingIntegration, error: checkError } = await supabase
      .from('meli_integration')
      .select('*')
      .eq('user_id', clientId)
      .eq('meli_id', userData.id)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing integration:', checkError);
      return new Response(
        JSON.stringify({
          error: 'Failed to check existing integration',
          details: checkError,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Processing integration for client:', clientId);

    // Validate and parse clientId - handle both numeric and string formats
    const parsedClientId = typeof clientId === 'number' ? clientId : parseInt(clientId, 10);
    if (isNaN(parsedClientId)) {
      console.error('Invalid clientId format:', clientId);
      return new Response(
        JSON.stringify({
          error: 'Invalid clientId format',
          details: 'clientId must be a valid number',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const integrationData = {
      user_id: parsedClientId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      expires_at: expiryDate.toISOString(),
      created_at: new Date().toISOString(),
      update_at: new Date().toISOString(),
      status: 'active',
      country: userData.country_id || null,
      first_name: userData.first_name || null,
      last_name: userData.last_name || null,
      email: userData.email || null,
      photo_url: userData.thumbnail?.picture_url || null,
      site_id: userData.site_id || null,
      nickname: userData.nickname || null,
      meli_id: userData.id || null,
    };

    console.log('Saving integration data');

    // Only insert if integration doesn't exist, return error if it does
    if (existingIntegration) {
      console.error('Integration already exists for this user and Mercadolibre account');
      return new Response(
        JSON.stringify({
          error: 'Integration already exists',
          details: 'An integration for this Mercadolibre account already exists for this user',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Creating new integration');
    const result = await supabase.from('meli_integration').insert(integrationData);

    if (result.error) {
      console.error('Error saving integration data:', result.error);
      return new Response(
        JSON.stringify({
          error: 'Failed to save integration data',
          details: result.error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: integrationData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unhandled error in Mercadolibre callback:', error, error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error,
        stack: error,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
