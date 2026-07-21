import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integrationId, conversationId } = await req.json();
    console.log(
      'Fetching messages for integration:',
      integrationId,
      'conversation:',
      conversationId
    );

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
    console.log('Using account ID:', ig_account_id);

    // Fetch messages using Instagram Platform API (graph.instagram.com)
    // Compatible with Instagram Business Login tokens + instagram_business_manage_messages
    const response = await fetch(
      `https://graph.instagram.com/v21.0/${conversationId}/messages` +
      `?fields=id,from,message,created_time&limit=50&access_token=${access_token}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Instagram API error:', error);
      throw new Error('Error fetching Instagram messages');
    }

    const data = await response.json();

    // Instagram Platform API returns { data: [...] } directly
    const rawMessages = data.data || data.messages?.data || [];

    if (rawMessages.length === 0) {
      return new Response(JSON.stringify({ messages: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = rawMessages.map((msg: any) => {
      return {
        id: msg.id,
        from: {
          id: msg.from.id,
          username: msg.from.username || '',
          name: msg.from.name || '',
        },
        text: msg.message,
        timestamp: msg.created_time,
        isFromPage: msg.from.id === ig_account_id,
      };
    });

    // Sort messages by timestamp (newest last)
    messages.sort((a: any, b: any) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    return new Response(JSON.stringify({ messages }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in instagram-messages function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
