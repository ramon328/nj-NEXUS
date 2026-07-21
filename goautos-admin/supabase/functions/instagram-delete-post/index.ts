import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';

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
    const { integrationId, mediaId } = await req.json();

    if (!integrationId || !mediaId) {
      return new Response(
        JSON.stringify({ error: 'integrationId and mediaId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the integration to retrieve access token
    const { data: integration, error: integrationError } = await supabase
      .from('instagram_integrations')
      .select('access_token')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete the media via Instagram Graph API
    const response = await fetch(
      `https://graph.instagram.com/v21.0/${mediaId}?access_token=${integration.access_token}`,
      { method: 'DELETE' }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Instagram API error deleting post:', JSON.stringify(data));
      return new Response(
        JSON.stringify({
          error: data.error?.message || 'Error al eliminar la publicación',
          details: data,
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in instagram-delete-post:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
