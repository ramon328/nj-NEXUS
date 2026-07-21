import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integrationId } = await req.json();
    console.log('Fetching posts for integration:', integrationId);

    // Get the integration details using the shared Supabase client
    const { data: integration, error: integrationError } = await supabase
      .from('instagram_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError) {
      console.error('Error fetching integration:', integrationError);
      throw new Error('Integration not found');
    }

    const { access_token, ig_account_id } = integration;

    // Fetch posts from Instagram Graph API
    const response = await fetch(
      `https://graph.instagram.com/v21.0/${ig_account_id}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count&access_token=${access_token}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Instagram API error:', error);
      throw new Error('Error fetching Instagram posts');
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in instagram-posts function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
