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
    // recipientIgsid: Instagram-Scoped User ID of the person to reply to
    // (comes from conversation participants, not the conversation ID itself)
    const { integrationId, conversationId, recipientIgsid, message } = await req.json();
    const recipient = recipientIgsid || conversationId; // fallback for backwards compat
    console.log(
      'Sending message for integration:',
      integrationId,
      'conversation:',
      conversationId
    );

    if (!message || !message.trim()) {
      throw new Error('Message cannot be empty');
    }

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

    // Send message using Instagram Platform API (graph.instagram.com)
    // Compatible with Instagram Business Login tokens + instagram_business_manage_messages
    const response = await fetch(
      `https://graph.instagram.com/v21.0/${ig_account_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          recipient: { id: recipient },
          message: { text: message },
        }),
      }
    );

    const responseData = await response.json();

    if (!response.ok || responseData.error) {
      console.error('Instagram API error:', responseData);
      throw new Error('Error sending message to Instagram');
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.message_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in instagram-send-message function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
