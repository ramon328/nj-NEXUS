import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { refreshLongLivedToken, getUserInfo } from '../_shared/facebook-api.ts';
import { reportError } from '../_shared/error-reporter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const FB_APP_ID = Deno.env.get('FB_MARKETPLACE_APP_ID') || '';
const FB_APP_SECRET = Deno.env.get('FB_MARKETPLACE_APP_SECRET') || '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integrationId } = await req.json();

    // If integrationId is provided, refresh only that integration
    // Otherwise, refresh all integrations that are expiring soon

    let integrations;

    if (integrationId) {
      // Refresh specific integration
      const { data, error } = await supabase
        .from('fb_marketplace_integration')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Integration not found' }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      integrations = [data];
    } else {
      // Find all integrations expiring in the next 7 days
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + 7);

      const { data, error } = await supabase
        .from('fb_marketplace_integration')
        .select('*')
        .eq('status', 'active')
        .lt('expires_at', expiryThreshold.toISOString());

      if (error) {
        console.error('Error fetching integrations:', error);
        return new Response(
          JSON.stringify({ error: 'Error fetching integrations' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      integrations = data || [];
    }

    if (integrations.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No integrations to refresh',
          refreshed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Refreshing', integrations.length, 'Facebook Marketplace tokens');

    const results = {
      refreshed: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const integration of integrations) {
      try {
        console.log('Refreshing token for integration:', integration.id);

        // Refresh the long-lived token
        const newTokenData = await refreshLongLivedToken(
          integration.access_token,
          FB_APP_ID,
          FB_APP_SECRET
        );

        // Calculate new expiry (60 days from now)
        const expiresInSeconds = newTokenData.expires_in || 60 * 24 * 60 * 60;
        const newExpiryDate = new Date(Date.now() + expiresInSeconds * 1000);

        // Optionally verify token works by getting user info
        let userName = integration.fb_user_name;
        try {
          const userInfo = await getUserInfo(newTokenData.access_token);
          userName = userInfo.name;
        } catch (userError) {
          console.warn('Could not verify user info:', userError);
        }

        // Update the integration
        const { error: updateError } = await supabase
          .from('fb_marketplace_integration')
          .update({
            access_token: newTokenData.access_token,
            expires_at: newExpiryDate.toISOString(),
            fb_user_name: userName,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', integration.id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        results.refreshed++;
        results.details.push({
          integration_id: integration.id,
          status: 'success',
          new_expiry: newExpiryDate.toISOString(),
        });

        console.log('Token refreshed for integration:', integration.id);
      } catch (refreshError) {
        console.error('Error refreshing integration:', integration.id, refreshError);

        // Mark integration as expired if refresh fails
        const { error: expireError } = await supabase
          .from('fb_marketplace_integration')
          .update({
            status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('id', integration.id);

        if (expireError) {
          console.error('Error marking integration as expired:', expireError);
        }

        results.errors++;
        results.details.push({
          integration_id: integration.id,
          status: 'error',
          error: refreshError.message || String(refreshError),
        });
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
    console.error('Error in token refresh:', error);
    await reportError({ functionName: 'refresh-fb-marketplace-token', error, severity: 'critical' });
    return new Response(
      JSON.stringify({
        error: 'Error al refrescar tokens',
        details: error.message || String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
