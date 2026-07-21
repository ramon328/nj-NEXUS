import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { exchangeToken } from '../_shared/instagram-api.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const META_APP_SECRET = '058142ccf19458690aca0de9ab9a063d';
const REFRESH_THRESHOLD_DAYS = 30;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get integrations that need token refresh
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(
      thirtyDaysFromNow.getDate() + REFRESH_THRESHOLD_DAYS
    );

    const { data: integrations, error: fetchError } = await supabase
      .from('instagram_integrations')
      .select('*')
      .lt('token_expires_at', thirtyDaysFromNow.toISOString());

    if (fetchError) {
      throw new Error(`Failed to fetch integrations: ${fetchError.message}`);
    }

    const results = [];

    for (const integration of integrations || []) {
      try {
        // Exchange current token for a new one
        const tokenData = await exchangeToken(
          integration.access_token,
          META_APP_SECRET
        );

        if (tokenData.error) {
          results.push({
            id: integration.id,
            success: false,
            error: tokenData.error,
          });
          continue;
        }

        // Fetch updated followers count
        const userResponse = await fetch(
          `https://graph.instagram.com/me?fields=id,username,followers_count&access_token=${tokenData.access_token}`
        );

        const userData = await userResponse.json();

        // Calculate new expiry date
        const expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);

        // Update the integration with new token, expiry and followers count
        const { error: updateError } = await supabase
          .from('instagram_integrations')
          .update({
            access_token: tokenData.access_token,
            token_expires_at: expiryDate.toISOString(),
            followers_count:
              userData.followers_count || integration.followers_count || 0,
          })
          .eq('id', integration.id);

        results.push({
          id: integration.id,
          success: !updateError,
          error: updateError?.message,
          followers_updated: userData.followers_count ? true : false,
        });
      } catch (error) {
        results.push({
          id: integration.id,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in refresh-instagram-token:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
