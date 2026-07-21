import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Meta app credentials
const META_APP_ID = '1353273672429524';
const META_APP_SECRET = '058142ccf19458690aca0de9ab9a063d';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, clientId } = await req.json();

    if (!code || !clientId) {
      return new Response(
        JSON.stringify({ error: 'Code and clientId are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const redirectUri = 'https://portal.goauto.cl/instagram';

    console.log('code:', code);

    // Step 1: Exchange code for Instagram access token
    console.log('Exchanging code for Instagram access token...');
    const formData = new URLSearchParams();
    formData.append('client_id', META_APP_ID);
    formData.append('client_secret', META_APP_SECRET);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', redirectUri);
    formData.append('code', code);

    const tokenResponse = await fetch(
      'https://graph.instagram.com/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );

    const tokenData = await tokenResponse.json();
    console.log('tokenData:', JSON.stringify(tokenData));

    if (!tokenResponse.ok || tokenData.error) {
      console.error('Error getting access token:', JSON.stringify(tokenData));
      return new Response(
        JSON.stringify({
          error: 'Para conectar tu cuenta de Instagram con GoAuto, escríbenos por el grupo de WhatsApp y te ayudamos a conectarte.',
          details: tokenData,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const accessToken = tokenData.access_token;
    const userId = tokenData.user_id?.toString();
    const permissions = tokenData.permissions || [];
    let tokenExpiresIn = 3600; // Short-lived default

    console.log('Got token for user:', userId);
    console.log('Permissions:', permissions);

    // Step 2: Try to exchange for long-lived token (Instagram Platform API)
    // For Instagram Business Login, use graph.instagram.com ONLY
    console.log('Trying to exchange for long-lived token...');
    let finalToken = accessToken;

    try {
      // Instagram Platform API endpoint for token exchange
      const longLivedUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${META_APP_SECRET}&access_token=${accessToken}`;
      console.log('Trying token exchange URL: https://graph.instagram.com/access_token');

      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();
      console.log('Long-lived response:', JSON.stringify(longLivedData));

      if (longLivedData.access_token && !longLivedData.error) {
        finalToken = longLivedData.access_token;
        tokenExpiresIn = longLivedData.expires_in || 5184000; // ~60 days
        console.log('Got long-lived token successfully');
      } else {
        console.log('Could not get long-lived token, using short-lived token');
        // For Instagram Business Login, the initial token might already be long-lived
        // Set default expiry of 60 days if we can't get a new one
        tokenExpiresIn = 5184000;
      }
    } catch (e) {
      console.warn('Token exchange failed:', e.message);
      tokenExpiresIn = 5184000; // Default to 60 days
    }

    // Step 3: Try to get user info using Instagram Platform API
    let username: string | null = null;
    let followersCount = 0;
    let profilePictureUrl: string | null = null;
    let biography: string | null = null;
    let name: string | null = null;
    let accountType: string | null = null;

    // Try multiple endpoints and field combinations
    const profileFields = 'id,username,profile_picture_url,biography,name,followers_count,account_type';
    const basicFields = 'id,username';
    const userInfoEndpoints = [
      // Full profile fields (most useful)
      `https://graph.instagram.com/v21.0/me?fields=${profileFields}&access_token=${finalToken}`,
      `https://graph.instagram.com/me?fields=${profileFields}&access_token=${finalToken}`,
      // Basic fields fallback
      `https://graph.instagram.com/v21.0/me?fields=${basicFields}&access_token=${finalToken}`,
      `https://graph.instagram.com/me?fields=${basicFields}&access_token=${finalToken}`,
      // Using the user ID directly
      `https://graph.instagram.com/v21.0/${userId}?fields=${profileFields}&access_token=${finalToken}`,
      `https://graph.instagram.com/${userId}?fields=${basicFields}&access_token=${finalToken}`,
      // No fields (default response)
      `https://graph.instagram.com/v21.0/me?access_token=${finalToken}`,
      `https://graph.instagram.com/me?access_token=${finalToken}`,
    ];

    let correctUserId = userId; // Start with token user_id

    for (const url of userInfoEndpoints) {
      try {
        console.log('Trying user info URL:', url.replace(finalToken, 'TOKEN...'));
        const userResponse = await fetch(url);
        const userData = await userResponse.json();
        console.log('User info response:', JSON.stringify(userData));

        if (userData.username && !userData.error) {
          username = userData.username;
          followersCount = userData.followers_count || 0;
          profilePictureUrl = userData.profile_picture_url || null;
          biography = userData.biography || null;
          name = userData.name || null;
          accountType = userData.account_type || null;
          // Use the ID from user info response if available (more reliable)
          if (userData.id) {
            correctUserId = userData.id.toString();
            console.log('Using ID from user info:', correctUserId);
          }
          console.log('SUCCESS! Got username:', username, 'account_type:', accountType);
          break;
        } else if (userData.error) {
          console.warn('API error:', userData.error.message);
        }
      } catch (e) {
        console.warn('Request failed:', e.message);
      }
    }

    // Update userId to the correct one from user info
    const finalUserId = correctUserId;

    // If no username could be fetched, the account is likely Personal (not Business/Creator).
    // Personal accounts can complete OAuth but ALL graph.instagram.com calls fail.
    // Do NOT save a broken integration — return error so the client sees a clear message.
    if (!username) {
      console.error('Could not get username from any endpoint.');
      return new Response(
        JSON.stringify({
          error:
            'Para conectar tu cuenta de Instagram con GoAuto, escríbenos por el grupo de WhatsApp y te ayudamos a conectarte.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate token expiry
    const expiryDate = new Date(Date.now() + tokenExpiresIn * 1000);

    // Check if integration already exists
    const { data: existingIntegration, error: checkError } = await supabase
      .from('instagram_integrations')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking for existing integration:', checkError);
    }

    const integrationData = {
      client_id: parseInt(clientId),
      ig_account_id: finalUserId,
      username: username,
      followers_count: followersCount,
      profile_picture_url: profilePictureUrl,
      biography: biography,
      name: name,
      account_type: accountType,
      fb_page_id: null,
      access_token: finalToken,
      token_expires_at: expiryDate.toISOString(),
    };

    console.log('Saving integration:', JSON.stringify(integrationData));

    let result;
    if (existingIntegration) {
      console.log('Updating existing integration:', existingIntegration.id);
      result = await supabase
        .from('instagram_integrations')
        .update(integrationData)
        .eq('id', existingIntegration.id);
    } else {
      console.log('Creating new integration');
      result = await supabase
        .from('instagram_integrations')
        .insert(integrationData);
    }

    if (result.error) {
      console.error('Error saving integration:', result.error);
      return new Response(
        JSON.stringify({
          error: 'Failed to save integration',
          details: result.error,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: integrationData,
        note: username ? null : 'Could not fetch username due to API issues, but token is valid',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unhandled error:', error.message, error.stack);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
