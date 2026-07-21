import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getUserInfo,
  getBusinessAccounts,
  getBusinessCatalogs,
  createVehicleCatalog,
} from '../_shared/facebook-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Facebook App credentials
const FB_APP_ID = Deno.env.get('FB_MARKETPLACE_APP_ID') || Deno.env.get('FB_APP_ID') || '';
const FB_APP_SECRET = Deno.env.get('FB_MARKETPLACE_APP_SECRET') || Deno.env.get('FB_APP_SECRET') || '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!FB_APP_ID || !FB_APP_SECRET) {
      console.error('Facebook App credentials not configured. Set FB_MARKETPLACE_APP_ID and FB_MARKETPLACE_APP_SECRET in Supabase secrets.');
      return new Response(
        JSON.stringify({ error: 'La integración de Facebook no está configurada. Contacta al soporte.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code, clientId, redirectUri } = await req.json();

    if (!code || !clientId || !redirectUri) {
      return new Response(
        JSON.stringify({
          error: 'Code, clientId and redirectUri are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Processing Facebook Marketplace auth callback');

    // Step 1: Exchange code for short-lived access token
    console.log('Step 1: Exchanging code for access token');
    console.log('Using redirect URI:', redirectUri);
    const tokenData = await exchangeCodeForToken(
      code,
      FB_APP_ID,
      FB_APP_SECRET,
      redirectUri
    );

    // Step 2: Exchange for long-lived token (60 days)
    console.log('Step 2: Exchanging for long-lived token');
    const longLivedTokenData = await exchangeForLongLivedToken(
      tokenData.access_token,
      FB_APP_ID,
      FB_APP_SECRET
    );

    // Calculate expiry date (default 60 days if not provided)
    const expiresInSeconds = longLivedTokenData.expires_in || 60 * 24 * 60 * 60;
    const expiryDate = new Date(Date.now() + expiresInSeconds * 1000);

    // Step 3: Get user info
    console.log('Step 3: Getting user info');
    const userInfo = await getUserInfo(longLivedTokenData.access_token);

    // Step 4: Get business accounts
    console.log('Step 4: Getting business accounts');
    const businessAccounts = await getBusinessAccounts(longLivedTokenData.access_token);

    if (!businessAccounts.data || businessAccounts.data.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No se encontraron Business Manager asociados a esta cuenta',
          details: 'Para usar Facebook Ads necesitas tener un Business Manager configurado. Créalo en business.facebook.com',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Use the first business account
    const business = businessAccounts.data[0];
    console.log('Using business:', business.name, business.id);

    // Step 5: Get or create vehicle catalog
    console.log('Step 5: Getting/creating vehicle catalog');
    let catalog: { id: string; name: string } | null = null;

    const catalogs = await getBusinessCatalogs(business.id, longLivedTokenData.access_token);

    // Look for existing commerce catalog (or any catalog we can use)
    const existingVehicleCatalog = catalogs.data?.find(
      (c) => c.vertical === 'commerce' || c.name.includes('GoAuto')
    );

    if (existingVehicleCatalog) {
      catalog = { id: existingVehicleCatalog.id, name: existingVehicleCatalog.name };
      console.log('Found existing vehicle catalog:', catalog.name);
    } else {
      // Create new vehicle catalog
      catalog = await createVehicleCatalog(
        business.id,
        `GoAuto - ${business.name} Vehicles`,
        longLivedTokenData.access_token
      );
      console.log('Created new vehicle catalog:', catalog.name);
    }

    // Step 6: Check for existing integration
    console.log('Step 6: Checking for existing integration');
    const { data: existingIntegration, error: checkError } = await supabase
      .from('fb_marketplace_integration')
      .select('*')
      .eq('client_id', clientId)
      .eq('fb_business_id', business.id)
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

    // Prepare integration data
    const integrationData = {
      client_id: parseInt(clientId),
      fb_business_id: business.id,
      fb_business_name: business.name,
      catalog_id: catalog.id,
      catalog_name: catalog.name,
      access_token: longLivedTokenData.access_token,
      token_type: 'long_lived',
      expires_at: expiryDate.toISOString(),
      fb_user_id: userInfo.id,
      fb_user_name: userInfo.name,
      email: userInfo.email || null,
      default_cta: 'LEARN_MORE',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Step 7: Insert or update integration
    let result;
    if (existingIntegration) {
      console.log('Updating existing integration');
      result = await supabase
        .from('fb_marketplace_integration')
        .update({
          ...integrationData,
          created_at: existingIntegration.created_at, // Keep original creation date
        })
        .eq('id', existingIntegration.id);
    } else {
      console.log('Creating new integration');
      result = await supabase.from('fb_marketplace_integration').insert(integrationData);
    }

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

    console.log('Integration saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          business_name: business.name,
          catalog_name: catalog.name,
          catalog_id: catalog.id,
          user_name: userInfo.name,
          expires_at: expiryDate.toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unhandled error in Facebook Marketplace auth:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
