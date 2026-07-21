import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';

interface CreateSubscriptionRequest {
  card_number: string;
  cardholder: string;
  expiration_month: string;
  expiration_year: string;
  security_code: string;
  payer_email: string;
  client_id: number;
  transaction_amount: number;
  is_payment_update?: boolean; // True if updating payment method for existing subscription (no trial)
}

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
    const {
      card_number,
      cardholder,
      expiration_month,
      expiration_year,
      security_code,
      payer_email,
      client_id,
      transaction_amount,
      is_payment_update,
    }: CreateSubscriptionRequest = await req.json();

    // Validate required fields
    if (!card_number || !cardholder || !expiration_month || !expiration_year || !security_code || !payer_email || !client_id || !transaction_amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // ── Autorización (cierra hueco crítico): sin esto, cualquiera con el anon
    // key (público) podía (a) usar nuestro token de MP como oráculo de tarjetas
    // robadas (carding → riesgo de bloqueo de la cuenta MP) y (b) reactivarse
    // el acceso de cualquier client_id creando un trial. Mismo patrón probado
    // de mp-cancel-subscription: usuario real; superadmin cualquiera, el resto
    // solo su propia automotora. El caller (subscriptionService.getAuthHeaders)
    // ya manda el Bearer de la sesión, así que el flujo legítimo no cambia.
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

    if (profile.rol !== 'superadmin' && profile.client_id !== client_id) {
      return jsonErr('No puedes crear la suscripción de otra automotora', 403);
    }

    console.log('Creating subscription for client:', client_id, 'is_payment_update:', is_payment_update);

    // Step 1: Create card token
    const cardTokenRequestBody = {
      card_number,
      cardholder: {
        name: cardholder,
      },
      expiration_month,
      expiration_year,
      security_code,
    };

    console.log('Creating card token...');
    const createTokenResponse = await fetch(
      'https://api.mercadopago.com/v1/card_tokens',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardTokenRequestBody),
      }
    );

    if (!createTokenResponse.ok) {
      const errorData = await createTokenResponse.json();
      console.error('Error creating card token:', errorData);
      return new Response(
        JSON.stringify({ error: 'Error creating card token', details: errorData }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const tokenData = await createTokenResponse.json();
    const cardTokenId = tokenData.id;
    const cardLastFour = tokenData.last_four_digits;
    console.log('Card token created:', cardTokenId);

    // Step 2: Create subscription (preapproval)
    // If is_payment_update is true, don't give trial - charge immediately
    const trialEndsAt = new Date();
    if (!is_payment_update) {
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);
    }

    // Build auto_recurring config - with or without trial
    const autoRecurring: Record<string, unknown> = {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: transaction_amount,
      currency_id: 'CLP',
    };

    // Only add free_trial for new subscriptions (not payment updates)
    if (!is_payment_update) {
      autoRecurring.free_trial = {
        frequency: 7,
        frequency_type: 'days',
      };
    }

    const subscriptionBody = {
      reason: 'Suscripción GoAutos',
      external_reference: `client_${client_id}`,
      payer_email: payer_email,
      card_token_id: cardTokenId,
      auto_recurring: autoRecurring,
      back_url: `${Deno.env.get('FRONTEND_URL') || 'https://portal.goauto.cl'}/subscription-success`,
      status: 'authorized',
    };

    console.log('Creating preapproval...');
    const subscriptionResponse = await fetch(
      'https://api.mercadopago.com/preapproval',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(subscriptionBody),
      }
    );

    if (!subscriptionResponse.ok) {
      const errorData = await subscriptionResponse.json();
      console.error('Error creating preapproval:', errorData);
      return new Response(
        JSON.stringify({ error: 'Error creating subscription', details: errorData }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const subscriptionData = await subscriptionResponse.json();
    console.log('Preapproval created:', subscriptionData.id);

    // Step 3: Save subscription to database
    // Use 'active' status for payment updates (no trial), 'trial' for new subscriptions
    const subscriptionStatus = is_payment_update ? 'active' : 'trial';
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const { data: subscription, error: dbError } = await supabase
      .from('subscriptions')
      .insert({
        client_id: client_id,
        preapproval_id: subscriptionData.id,
        status: subscriptionStatus,
        plan_type: 'basic',
        amount: transaction_amount,
        currency: 'CLP',
        trial_ends_at: is_payment_update ? null : trialEndsAt.toISOString(),
        card_last_four: cardLastFour,
        next_payment_date: is_payment_update ? nextPaymentDate.toISOString() : trialEndsAt.toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error saving subscription to database:', dbError);
      return new Response(
        JSON.stringify({ error: 'Error saving subscription', details: dbError }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log('Subscription saved to database:', subscription.id);

    // Step 4: Update client.subscription_status
    const { error: clientUpdateError } = await supabase
      .from('clients')
      .update({ subscription_status: subscriptionStatus })
      .eq('id', client_id);

    if (clientUpdateError) {
      console.error('Error updating client subscription_status:', clientUpdateError);
      // No retornar error, solo log - la suscripción ya se creó
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscription.id,
        trial_ends_at: is_payment_update ? null : trialEndsAt.toISOString(),
        preapproval_id: subscriptionData.id,
        is_payment_update: is_payment_update || false,
        status: subscriptionStatus,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
