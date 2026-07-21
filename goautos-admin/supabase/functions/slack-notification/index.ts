import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface OnboardingData {
  client: {
    name: string;
    logoUrl: string;
    primaryColor: string;
    email: string;
    phone: string;
  };
  dealerships: Array<{
    location: {
      lat: number;
      lng: number;
      address: string;
    };
    phone: string;
    email: string;
  }>;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Autoriza al llamante: service-role (ej. onboard-client) o secreto interno.
  // Sin esto, cualquiera con el anon key (público) podía spamear/inyectar links
  // de phishing en el canal interno de Slack.
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const internalSecret = Deno.env.get('INTERNAL_SECRET') || '';
  const authHeader = req.headers.get('authorization') || '';
  const internalHeader = req.headers.get('x-internal-secret') || '';
  const authorized =
    (serviceRole && authHeader === `Bearer ${serviceRole}`) ||
    (internalSecret && internalHeader === internalSecret);
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Webhook URL de Slack desde variable de entorno (nunca hardcodeada).
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL') || '';
    if (!slackWebhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL not configured');
    }

    const body = await req.json();

    // Contrato dual (retrocompatible):
    //  - Formato viejo: { onboardingData: { client, dealerships, user } }
    //  - Formato nuevo: { type, data: { companyName, domain, userEmail, planName } }
    //    (el que manda onboard-client.ts del CRM Goautos-ventas)
    let message: Record<string, unknown>;
    let logLabel = 'automotora';

    if (body?.onboardingData) {
      const onboardingData: OnboardingData = body.onboardingData;
      logLabel = onboardingData.client?.name || logLabel;

      const dealershipInfo = (onboardingData.dealerships || [])
        .map(
          (dealership, index) =>
            `📍 *Sucursal ${index + 1}*: ${dealership.location?.address ?? ''}\n   📞 ${
              dealership.phone
            } | 📧 ${dealership.email}`
        )
        .join('\n');

      message = {
        text: `🔩 *¡NUEVA TUERCA!* 🔩`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '🔩 ¡NUEVA TUERCA! 🔩' } },
          { type: 'section', text: { type: 'mrkdwn', text: `*Automotora:* ${onboardingData.client.name}\n*Color Principal:* ${onboardingData.client.primaryColor}` } },
          { type: 'section', text: { type: 'mrkdwn', text: `*Información de Contacto:*\n📧 ${onboardingData.client.email}\n📞 ${onboardingData.client.phone}` } },
          { type: 'section', text: { type: 'mrkdwn', text: `*Sucursales:*\n${dealershipInfo}` } },
          { type: 'section', text: { type: 'mrkdwn', text: `*Usuario Principal:*\n👤 ${onboardingData.user.firstName} ${onboardingData.user.lastName}\n📧 ${onboardingData.user.email}` } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `🎉 ¡Bienvenidos a la familia GoAuto! 🚗💨` }] },
        ],
      };
    } else {
      // Formato nuevo { type, data }
      const data = body?.data || {};
      const companyName = data.companyName || data.name || 'Automotora';
      logLabel = companyName;
      const lines = [
        `*Automotora:* ${companyName}`,
        data.domain ? `🌐 ${data.domain}` : null,
        data.userEmail ? `📧 ${data.userEmail}` : null,
        data.planName ? `📦 Plan: ${data.planName}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      message = {
        text: `🔩 *¡NUEVA TUERCA!* 🔩`,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '🔩 ¡NUEVA TUERCA! 🔩' } },
          { type: 'section', text: { type: 'mrkdwn', text: lines } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `🎉 ¡Bienvenidos a la familia GoAuto! 🚗💨` }] },
        ],
      };
    }

    console.log('Enviando notificación a Slack para:', logLabel);

    // Enviar mensaje a Slack
    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Slack webhook error: ${response.status} - ${errorText}`);
    }

    console.log(
      '🔩 ¡Notificación de NUEVA TUERCA enviada a Slack exitosamente!'
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notificación enviada a Slack exitosamente',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error enviando notificación a Slack:', error);

    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
