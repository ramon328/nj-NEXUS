import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { Resend } from 'npm:resend@2.0.0';
import { reportError } from '../_shared/error-reporter.ts';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';
// Secretos leídos de variables de entorno (nunca hardcodeados).
// Setear en Supabase: SLACK_WEBHOOK_URL, RESEND_API_KEY, NOTIFICATION_EMAIL.
const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL') || '';
const resend = new Resend(Deno.env.get('RESEND_API_KEY') || '');
const NOTIFICATION_EMAIL = Deno.env.get('NOTIFICATION_EMAIL') || 'soporte@goauto.cl';

interface CancelSubscriptionRequest {
  client_id: number;
  cancellation_reason?: string;
  cancellation_details?: string;
}

const REASON_LABELS: Record<string, string> = {
  tooExpensive: 'Es muy caro',
  notUsing: 'No estoy usando el servicio',
  missingFeatures: 'Faltan funcionalidades que necesito',
  technicalIssues: 'Problemas tecnicos frecuentes',
  foundAlternative: 'Encontre una mejor alternativa',
  closingBusiness: 'Estoy cerrando el negocio',
  temporaryPause: 'Solo necesito una pausa temporal',
  other: 'Otro motivo',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { client_id, cancellation_reason, cancellation_details }: CancelSubscriptionRequest = await req.json();

    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'Missing client_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // ── Autorización (cierra el IDOR): el llamante debe ser un usuario autenticado
    // real. El anon key (público, embebido en el bundle) NO resuelve a un usuario,
    // así que getUser lo rechaza. Solo superadmin puede cancelar una automotora
    // ajena; el resto solo la suya. Sin esto, cualquiera con el anon key podía
    // cancelar en loop la suscripción de las ~200 automotoras.
    const jsonErr = (msg: string, status: number) =>
      new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return jsonErr('No autorizado', 401);

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return jsonErr('No autorizado', 401);

    const { data: profile } = await supabase
      .from('users')
      .select('rol, client_id')
      .eq('auth_id', userData.user.id)
      .single();
    if (!profile) return jsonErr('Perfil no encontrado', 403);

    const isSuperadmin = profile.rol === 'superadmin';
    if (!isSuperadmin && profile.client_id !== client_id) {
      return jsonErr('No puedes cancelar la suscripción de otra automotora', 403);
    }

    console.log('Cancelling subscription for client:', client_id);
    console.log('Reason:', cancellation_reason, 'Details:', cancellation_details);

    // Get client info for notifications
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('name, email')
      .eq('id', client_id)
      .single();

    if (clientError) {
      console.error('Error fetching client info:', clientError);
    }

    const clientName = clientData?.name || `Cliente #${client_id}`;
    const clientEmail = clientData?.email || '';

    // Step 1: Find active subscription. Con .single() a secas, 2+ filas
    // activas del mismo cliente (no hay UNIQUE por client_id) tiraban PGRST116
    // → 404 engañoso y la cancelación quedaba imposible. Tomamos la más reciente.
    const { data: subscription, error: findError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('client_id', client_id)
      .in('status', ['trial', 'active', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError || !subscription) {
      console.error('No active subscription found:', findError);
      return new Response(
        JSON.stringify({ error: 'No active subscription found for this client' }),
        { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log('Found subscription:', subscription.preapproval_id);

    // Step 2: Cancel in Mercado Pago
    const cancelResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${subscription.preapproval_id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      }
    );

    if (!cancelResponse.ok) {
      const errorData = await cancelResponse.json();
      console.error('Error cancelling preapproval in MP:', errorData);
      return new Response(
        JSON.stringify({ error: 'Error cancelling subscription in Mercado Pago', details: errorData }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log('Preapproval cancelled in MP');

    // Step 3: Update database with cancellation reason
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: cancellation_reason || null,
        cancellation_details: cancellation_details || null,
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Error updating subscription in database:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error updating subscription status', details: updateError }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log('Subscription cancelled successfully');

    // Step 4: Update client.subscription_status
    const { error: clientUpdateError } = await supabase
      .from('clients')
      .update({ subscription_status: 'cancelled' })
      .eq('id', client_id);

    if (clientUpdateError) {
      console.error('Error updating client subscription_status:', clientUpdateError);
      return new Response(
        JSON.stringify({ error: 'Subscription cancelled but failed to update client status', details: clientUpdateError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Step 5: Send notifications (Slack + Email)
    const reasonLabel = cancellation_reason ? (REASON_LABELS[cancellation_reason] || cancellation_reason) : 'No especificado';
    const detailsText = cancellation_details ? `\n📝 *Detalles:* ${cancellation_details}` : '';

    // Send Slack notification
    try {
      if (!SLACK_WEBHOOK_URL) throw new Error('SLACK_WEBHOOK_URL not configured');
      const slackMessage = {
        text: `🚨 *CANCELACION DE SUSCRIPCION* 🚨`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 CANCELACION DE SUSCRIPCION 🚨',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Automotora:* ${clientName}\n*Email:* ${clientEmail}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Motivo:* ${reasonLabel}${detailsText}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `📅 Fecha: ${new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
              },
            ],
          },
        ],
      };

      await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage),
      });
      console.log('Slack notification sent');
    } catch (slackError) {
      console.error('Error sending Slack notification:', slackError);
    }

    // Send email notification
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🚨 Cancelacion de Suscripcion</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Automotora:</strong> ${clientName}</p>
            <p><strong>Email:</strong> ${clientEmail}</p>
            <p><strong>Motivo:</strong> ${reasonLabel}</p>
            ${cancellation_details ? `<p><strong>Detalles:</strong> ${cancellation_details}</p>` : ''}
            <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      `;

      await resend.emails.send({
        from: 'GoAuto <reportes@goauto.cl>',
        to: [NOTIFICATION_EMAIL],
        subject: `🚨 Cancelacion: ${clientName}`,
        html: emailHtml,
      });
      console.log('Email notification sent');
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription cancelled successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    await reportError({ functionName: 'mp-cancel-subscription', error, clientId: undefined, severity: 'critical' });
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
