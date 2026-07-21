import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { reportError } from '../_shared/error-reporter.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const WEBHOOK_SECRET = Deno.env.get('KAPSO_WEBHOOK_SECRET') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RegisterWebhookRequest {
  kapsoApiKey: string;
  phoneNumberId: string;
  clientId: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: RegisterWebhookRequest = await req.json();
    const { kapsoApiKey, phoneNumberId, clientId } = body;

    console.log('📱 Registering Kapso webhook for client:', clientId);

    // Our webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/kapso-webhook`;

    // Register webhook with Kapso
    // Kapso API: https://docs.kapso.io/api
    const kapsoResponse = await fetch('https://api.kapso.io/v1/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${kapsoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        phone_number_id: phoneNumberId,
        events: [
          'whatsapp.message.received',
          'whatsapp.message.sent',
          'whatsapp.message.delivered',
          'whatsapp.message.read',
          'whatsapp.message.failed',
        ],
        headers: {
          'x-webhook-secret': WEBHOOK_SECRET,
        },
        payload_version: 'v2',
      }),
    });

    if (!kapsoResponse.ok) {
      const errorText = await kapsoResponse.text();
      console.error('Kapso API error:', kapsoResponse.status, errorText);

      // If webhook already exists, that's fine
      if (kapsoResponse.status === 409 || errorText.includes('already exists')) {
        console.log('Webhook already exists, continuing...');
      } else {
        throw new Error(`Kapso API error: ${kapsoResponse.status} - ${errorText}`);
      }
    }

    const kapsoData = kapsoResponse.ok ? await kapsoResponse.json() : null;
    console.log('Kapso webhook registered:', kapsoData);

    // Update the integration with webhook info
    const { error: updateError } = await supabase
      .from('kapso_integrations')
      .update({
        webhook_url: webhookUrl,
        webhook_secret: WEBHOOK_SECRET,
        last_sync_at: new Date().toISOString(),
      })
      .eq('client_id', clientId);

    if (updateError) {
      console.error('Error updating integration:', updateError);
      await reportError({ functionName: 'kapso-register-webhook', error: updateError.message, clientId });
    }

    return new Response(
      JSON.stringify({
        success: true,
        webhookUrl,
        message: 'Webhook registrado correctamente',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error registering webhook:', error);
    await reportError({ functionName: 'kapso-register-webhook', error });
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Error al registrar webhook. Puedes configurarlo manualmente en Kapso.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
