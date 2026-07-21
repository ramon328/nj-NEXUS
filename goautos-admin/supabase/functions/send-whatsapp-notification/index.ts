import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// GoAuto's Kapso credentials (used to send notifications to all tenants)
const GOAUTO_KAPSO_API_KEY = Deno.env.get('GOAUTO_KAPSO_API_KEY') || '';
const GOAUTO_PHONE_NUMBER_ID = Deno.env.get('GOAUTO_PHONE_NUMBER_ID') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationRequest {
  clientId: number;
  recipientPhone: string;
  notificationType: string;
  message: string;
  referenceType?: string;
  referenceId?: string;
}

// Send WhatsApp message via Kapso API
// Docs: https://docs.kapso.ai/api/meta/whatsapp/messages/send-a-message
async function sendKapsoMessage(
  recipientPhone: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Normalize phone number (remove + and spaces)
    const normalizedPhone = recipientPhone.replace(/[\s+]/g, '');

    console.log('📱 Sending WhatsApp notification to:', normalizedPhone);

    // Kapso API endpoint
    const apiUrl = `https://api.kapso.ai/meta/whatsapp/v24.0/${GOAUTO_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': GOAUTO_KAPSO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'text',
        text: { body: message },
      }),
    });

    const responseText = await response.text();
    console.log('📱 Response status:', response.status);
    console.log('📱 Response:', responseText.substring(0, 300));

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse response as JSON');
      return { success: false, error: `Invalid response: ${responseText.substring(0, 200)}` };
    }

    if (!response.ok) {
      console.error('Kapso API error:', data);
      return { success: false, error: data.error?.message || JSON.stringify(data) };
    }

    console.log('✅ Message sent successfully:', data.messages?.[0]?.id);

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error('Error calling Kapso API:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: NotificationRequest = await req.json();
    const { clientId, recipientPhone, notificationType, message, referenceType, referenceId } = body;

    if (!recipientPhone || !message) {
      return new Response(
        JSON.stringify({ error: 'recipientPhone and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify GoAuto credentials are configured
    if (!GOAUTO_KAPSO_API_KEY || !GOAUTO_PHONE_NUMBER_ID) {
      console.error('GoAuto Kapso credentials not configured');
      return new Response(
        JSON.stringify({ error: 'WhatsApp notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If clientId is provided, verify notifications are enabled
    if (clientId) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('whatsapp_notifications_enabled, whatsapp_notification_settings, notification_whatsapp')
        .eq('id', clientId)
        .single();

      if (clientError) {
        console.error('Error fetching client:', clientError);
      } else if (client) {
        // Check if notifications are enabled
        if (!client.whatsapp_notifications_enabled) {
          console.log('Notifications disabled for client:', clientId);
          return new Response(
            JSON.stringify({ success: false, error: 'Notifications disabled for this client' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if this specific notification type is enabled
        const settings = client.whatsapp_notification_settings || {};
        const settingKey = notificationType.replace(/-/g, '_');
        if (notificationType !== 'test' && settings[settingKey] === false) {
          console.log(`Notification type ${notificationType} disabled for client:`, clientId);
          return new Response(
            JSON.stringify({ success: false, error: `${notificationType} notifications disabled` }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Log the notification attempt
    const logEntry = {
      client_id: clientId,
      notification_type: notificationType,
      recipient_phone: recipientPhone,
      message_content: message,
      reference_type: referenceType || null,
      reference_id: referenceId || null,
      status: 'pending',
    };

    const { data: logData, error: logError } = await supabase
      .from('whatsapp_notification_log')
      .insert(logEntry)
      .select('id')
      .single();

    const logId = logData?.id;

    // Send the message
    const result = await sendKapsoMessage(recipientPhone, message);

    // Update log with result
    if (logId) {
      await supabase
        .from('whatsapp_notification_log')
        .update({
          status: result.success ? 'sent' : 'failed',
          external_message_id: result.messageId || null,
          error_message: result.error || null,
          sent_at: result.success ? new Date().toISOString() : null,
        })
        .eq('id', logId);
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messageId,
        logId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-whatsapp-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
