import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { reportError } from '../_shared/error-reporter.ts';
import { verifyMpSignature } from '../_shared/mp-signature.ts';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';
// Secret del webhook de MercadoPago. Si no está seteado, la firma NO se chequea
// (degradación segura). La validación arranca en modo LOG-ONLY: se registra si la
// firma calculó válida en mp_webhook_events, pero NUNCA se rechaza todavía.
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') || '';

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-signature, x-request-id',
      },
    });
  }

  // Leer el body crudo UNA sola vez y parsear después.
  let body: any = {};
  try {
    const rawText = await req.text();
    body = rawText ? JSON.parse(rawText) : {};
  } catch (_) {
    body = {};
  }
  console.log('Webhook received:', JSON.stringify(body, null, 2));

  const topic: string | null = body?.type || body?.action || null;
  const resourceId: string | null = body?.data?.id ? String(body.data.id) : null;

  // Anti-SSRF: data.id se interpola en la URL del GET a api.mercadopago.com con
  // NUESTRO access token. Un id como '../v1/payments/123' o 'search?limit=100'
  // redirige esa llamada autenticada a endpoints arbitrarios. Rechazar ids mal
  // formados antes de rutear (los ids reales de MP son alfanuméricos hex/numéricos).
  const RESOURCE_ID_RE = /^[A-Za-z0-9_-]+$/;
  const resourceIdValid = !resourceId || RESOURCE_ID_RE.test(resourceId);

  // Validación de firma en modo LOG-ONLY (no rechaza).
  let sig = { checked: false, valid: null as boolean | null, requestId: null as string | null };
  try {
    sig = await verifyMpSignature(req, resourceId, MP_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Signature check error:', e);
  }

  // Registrar la notificación ANTES de procesar (auditoría + firma log-only + dedup).
  let eventId: number | null = null;
  try {
    const headersObj = Object.fromEntries(req.headers.entries());
    const { data: inserted, error: logError } = await supabase
      .from('mp_webhook_events')
      .insert({
        topic,
        resource_id: resourceId,
        signature_checked: sig.checked,
        signature_valid: sig.valid,
        request_id: sig.requestId,
        raw_headers: headersObj,
        raw_body: body,
      })
      .select('id')
      .single();
    if (logError) console.error('Error logging webhook event:', logError);
    eventId = inserted?.id ?? null;
  } catch (e) {
    console.error('Failed to log webhook event:', e);
  }

  // ok=false marca la fila como NO procesada (visible al filtrar fallas). note
  // registra el detalle (tanto de fallas como de no-ops legítimos), sin mentir con
  // processed=true cuando un handler tragó un error internamente.
  const markProcessed = async (result?: { ok: boolean; note?: string }) => {
    if (!eventId) return;
    const ok = result?.ok ?? true;
    try {
      await supabase
        .from('mp_webhook_events')
        .update({
          processed: ok,
          processed_at: new Date().toISOString(),
          error: result?.note ?? null,
        })
        .eq('id', eventId);
    } catch (_) {
      // no-op: el logging no debe romper la respuesta
    }
  };

  try {
    // Rechazar ids mal formados (anti-SSRF) sin procesar.
    if (!resourceIdValid) {
      console.warn('Rejecting malformed data.id');
      await markProcessed({ ok: false, note: 'malformed_data_id' });
      return jsonResponse({ received: true });
    }

    // Handle preapproval events
    if (body?.data?.id && body?.type === 'subscription_preapproval') {
      console.log('Processing preapproval event');
      const r = await handlePreapprovalEvent(body.data.id, body.action);
      await markProcessed(r);
      return jsonResponse({ received: true });
    }

    // Handle payment events
    if (body?.action === 'payment.created' && body?.data?.id) {
      console.log('Processing payment event');
      const r = await handlePaymentEvent(body.data.id);
      await markProcessed(r);
      return jsonResponse({ received: true });
    }

    // Unknown event type - still return 200 to avoid retries
    console.log('Unknown webhook event type:', topic);
    await markProcessed({ ok: true, note: 'unknown_event_type' });
    return jsonResponse({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    await reportError({ functionName: 'mp-webhook-subscription', error, severity: 'critical' });
    await markProcessed({ ok: false, note: error?.message || 'unknown error' });
    // Return 200 to avoid MP retries, but error is tracked
    return jsonResponse({ received: true, error: error?.message });
  }
});

type HandlerResult = { ok: boolean; note?: string };

async function handlePreapprovalEvent(preapprovalId: string, action: string): Promise<HandlerResult> {
  console.log(`Handling preapproval ${preapprovalId} with action: ${action}`);

  // Fetch preapproval details from MP
  const response = await fetch(
    `https://api.mercadopago.com/preapproval/${preapprovalId}`,
    {
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    console.error('Error fetching preapproval from MP:', response.status);
    return { ok: false, note: `mp_fetch_http_${response.status}` };
  }

  const preapprovalData = await response.json();
  console.log('Preapproval data:', JSON.stringify(preapprovalData, null, 2));

  // Find subscription in DB
  const { data: subscription, error: findError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('preapproval_id', preapprovalId)
    .maybeSingle();

  if (findError) {
    console.error('Error looking up subscription:', findError);
    return { ok: false, note: `subscription_lookup_error: ${findError.message}` };
  }
  if (!subscription) {
    // Caso esperado y frecuente: la suscripción vive en el CRM, no en el admin.
    // No es un fallo — se registra como no-op para no ensuciar la métrica de errores.
    console.log('Subscription not in admin DB (likely lives in CRM):', preapprovalId);
    return { ok: true, note: 'subscription_not_found_in_admin' };
  }

  // Update subscription based on MP status
  const updates: any = {};

  switch (preapprovalData.status) {
    case 'authorized':
      // Preapproval is active - check if still in trial or should be active
      const now = new Date();
      const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
      updates.status = trialEndsAt && now < trialEndsAt ? 'trial' : 'active';
      break;

    case 'paused':
      updates.status = 'past_due';
      break;

    case 'cancelled':
      updates.status = 'cancelled';
      updates.cancelled_at = new Date().toISOString();
      break;

    default:
      console.log('Unknown preapproval status:', preapprovalData.status);
  }

  // Apply updates if any
  if (Object.keys(updates).length === 0) {
    return { ok: true, note: `no_change_for_status_${preapprovalData.status}` };
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', subscription.id);

  if (updateError) {
    console.error('Error updating subscription:', updateError);
    return { ok: false, note: `subscription_update_error: ${updateError.message}` };
  }

  console.log('Subscription updated successfully:', updates);

  // Also update client.subscription_status
  const { error: clientUpdateError } = await supabase
    .from('clients')
    .update({ subscription_status: updates.status })
    .eq('id', subscription.client_id);

  if (clientUpdateError) {
    console.error('Error updating client subscription_status:', clientUpdateError);
    return { ok: false, note: `client_update_error: ${clientUpdateError.message}` };
  }

  return { ok: true };
}

async function handlePaymentEvent(paymentId: string): Promise<HandlerResult> {
  console.log(`Handling payment ${paymentId}`);

  // Fetch payment details from MP
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    console.error('Error fetching payment from MP:', response.status);
    return { ok: false, note: `mp_fetch_http_${response.status}` };
  }

  const paymentData = await response.json();
  console.log('Payment data:', JSON.stringify(paymentData, null, 2));

  // Find subscription by preapproval_id (stored in payment metadata or external_reference)
  const preapprovalId = paymentData.metadata?.preapproval_id || paymentData.external_reference;

  if (!preapprovalId) {
    console.log('Payment is not subscription-related (no preapproval_id)');
    return { ok: true, note: 'payment_not_subscription_related' };
  }

  const { data: subscription, error: findError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('preapproval_id', preapprovalId)
    .maybeSingle();

  if (findError) {
    console.error('Error looking up subscription for payment:', findError);
    return { ok: false, note: `subscription_lookup_error: ${findError.message}` };
  }
  if (!subscription) {
    console.log('Subscription not in admin DB (likely lives in CRM):', preapprovalId);
    return { ok: true, note: 'subscription_not_found_in_admin' };
  }

  // Check if payment already exists (idempotencia por payment_id)
  const { data: existingPayment } = await supabase
    .from('subscription_payments')
    .select('id')
    .eq('payment_id', paymentId)
    .maybeSingle();

  if (existingPayment) {
    console.log('Payment already recorded:', paymentId);
    return { ok: true, note: 'payment_already_recorded' };
  }

  // Create payment record
  const { error: paymentError } = await supabase
    .from('subscription_payments')
    .insert({
      subscription_id: subscription.id,
      payment_id: paymentId,
      amount: paymentData.transaction_amount,
      status: paymentData.status,
      paid_at: paymentData.status === 'approved' ? paymentData.date_approved : null,
      failure_reason: paymentData.status_detail,
    });

  if (paymentError) {
    console.error('Error creating payment record:', paymentError);
    return { ok: false, note: `payment_insert_error: ${paymentError.message}` };
  }

  console.log('Payment record created');

  // Update subscription status based on payment.
  // next_payment_date NO se estima localmente: la fecha autoritativa la escribe el
  // evento subscription_preapproval (GET /preapproval). Aquí solo reflejamos el
  // resultado del cobro para no pisar la fecha real según el orden de eventos.
  const updates: any = {};
  if (paymentData.status === 'approved') {
    updates.status = 'active';
  } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
    updates.status = 'past_due';
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true, note: `payment_status_${paymentData.status}` };
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', subscription.id);

  if (updateError) {
    console.error('Error updating subscription:', updateError);
    return { ok: false, note: `subscription_update_error: ${updateError.message}` };
  }

  console.log('Subscription updated after payment:', updates);

  const { error: clientUpdateError } = await supabase
    .from('clients')
    .update({ subscription_status: updates.status })
    .eq('id', subscription.client_id);

  if (clientUpdateError) {
    console.error('Error updating client subscription_status:', clientUpdateError);
    return { ok: false, note: `client_update_error: ${clientUpdateError.message}` };
  }

  return { ok: true };
}
