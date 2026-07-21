import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { integrationId } = await req.json();

    if (!integrationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: integrationId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Look up integration from DB (same pattern as other functions)
    const { data: integration, error: integrationError } = await supabase
      .from('instagram_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const { access_token, ig_account_id } = integration;

    // Use Instagram Platform API (graph.instagram.com) — compatible with
    // Instagram Business Login tokens + instagram_business_manage_messages
    const response = await fetch(
      `https://graph.instagram.com/v21.0/${ig_account_id}/conversations` +
      `?fields=id,participants,messages{from,message,created_time}` +
      `&limit=20&access_token=${access_token}`
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('Instagram API error:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Failed to fetch conversations', details: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const conversations = (data.data || []).map((conv: any) => {
      // The other participant (not our business account)
      const otherParticipant = conv.participants?.data?.find(
        (p: any) => p.id !== ig_account_id
      );

      const lastMessage = conv.messages?.data?.[0];

      return {
        id: conv.id,
        username: otherParticipant?.username || 'Unknown',
        name: otherParticipant?.name || otherParticipant?.username || 'Unknown User',
        // IGSID of the other participant — needed to send replies
        participantIgsid: otherParticipant?.id || null,
        lastMessage: lastMessage?.message || '',
        timestamp: lastMessage?.created_time || new Date().toISOString(),
        unread: false,
      };
    });

    return new Response(
      JSON.stringify({ conversations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Unhandled error:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
