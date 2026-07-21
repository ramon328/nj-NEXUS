import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabase } from '../_shared/supabase-client.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get('client_id');

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Missing client_id parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // ── Autorización (cierra IDOR de lectura): antes cualquiera con el anon key
    // (público) podía leer status/card_last_four/amount de CUALQUIER automotora
    // por client_id. Mismo patrón que mp-cancel-subscription: usuario real,
    // superadmin ve todo, el resto solo su propio client_id.
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

    if (profile.rol !== 'superadmin' && profile.client_id !== parseInt(clientId)) {
      return jsonErr('No puedes ver la suscripción de otra automotora', 403);
    }

    console.log('Getting subscription status for client:', clientId);

    // Find active subscription for client
    const { data: subscription, error: findError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('client_id', parseInt(clientId))
      .in('status', ['trial', 'active', 'past_due'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('Error finding subscription:', findError);
      return new Response(
        JSON.stringify({ error: 'Error fetching subscription', details: findError }),
        { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // No subscription found
    if (!subscription) {
      console.log('No subscription found for client');
      return new Response(
        JSON.stringify({
          has_active_subscription: false,
          status: null,
          trial_ends_at: null,
          next_payment_date: null,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Check if subscription is truly active
    const now = new Date();
    let hasActiveSubscription = false;

    if (subscription.status === 'trial') {
      // Check if trial hasn't expired
      const trialEndsAt = new Date(subscription.trial_ends_at);
      hasActiveSubscription = now < trialEndsAt;
    } else if (subscription.status === 'active') {
      // Active subscription is always valid
      hasActiveSubscription = true;
    } else if (subscription.status === 'past_due') {
      // Past due means payment failed, but we might give grace period
      // For now, consider it inactive
      hasActiveSubscription = false;
    }

    console.log(`Subscription status: ${subscription.status}, active: ${hasActiveSubscription}`);

    return new Response(
      JSON.stringify({
        has_active_subscription: hasActiveSubscription,
        status: subscription.status,
        trial_ends_at: subscription.trial_ends_at,
        next_payment_date: subscription.next_payment_date,
        card_last_four: subscription.card_last_four,
        amount: subscription.amount,
        currency: subscription.currency,
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
