// Edge function READ-ONLY: tablero de conciliación de suscripciones para superadmin.
//
// Cruza 3 fuentes por automotora y las clasifica en un semáforo:
//   - goautos-admin : clients.subscription_status + fila en subscriptions (preapproval_id).
//   - MercadoPago   : GET /preapproval/{id} (LA VERDAD del cobro).
//   - CRM Ventas    : mp_subscriptions (OPCIONAL — solo si están seteados sus secrets).
//
// NO escribe NADA. Solo lee. Verifica que el llamante sea superadmin.
//
// Clasificación:
//   🟢 CUADRADO           : admin ∈ {active,trial} ∧ MP=authorized.
//   🟡 DESALINEADO        : hay fila/preapproval pero los estados no calzan.
//   🔴 SIN_PAGO_VERIFICADO: admin=active pero SIN fila en subscriptions ni preapproval en MP
//                           (acceso por DEFAULT de columna) → el grupo de las ~148.
//   ⚪ INACTIVO           : admin ∈ {cancelled, past_due, none} (sin acceso, informativo).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
// CRM (opcional): si no están seteados, la columna del CRM se omite sin romper.
const VENTAS_URL = Deno.env.get('GOAUTO_VENTAS_SUPABASE_URL') || '';
const VENTAS_KEY = Deno.env.get('GOAUTO_VENTAS_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

/** Traduce el status crudo (o el código http_XXX de error) a una etiqueta clara para el PM. */
function mpLabel(ok: boolean, status: string): string {
  if (ok) {
    const m: Record<string, string> = {
      authorized: 'al día',
      paused: 'pausada',
      cancelled: 'cancelada',
      pending: 'pendiente de pago',
    };
    return m[status] || status;
  }
  const m: Record<string, string> = {
    http_404: 'no existe en MP',
    http_400: 'id inválido',
    http_401: 'token inválido',
    http_403: 'sin permiso',
    http_429: 'MP saturado (reintentar)',
    fetch_error: 'error de red',
  };
  if (m[status]) return m[status];
  if (status.startsWith('http_5')) return 'MP caído (5xx)';
  return status;
}

/** Consulta el estado real de una preapproval en MercadoPago. */
async function fetchMpPreapproval(preapprovalId: string) {
  try {
    const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` },
    });
    if (!res.ok) {
      const status = `http_${res.status}`;
      return { ok: false, status, label: mpLabel(false, status) };
    }
    const data = await res.json();
    return {
      ok: true,
      status: data.status, // authorized | paused | cancelled | pending
      label: mpLabel(true, data.status),
      next_payment_date: data.next_payment_date ?? null,
      amount: data.auto_recurring?.transaction_amount ?? null,
    };
  } catch (e) {
    console.error('MP fetch failed:', preapprovalId, e);
    return { ok: false, status: 'fetch_error', label: mpLabel(false, 'fetch_error') };
  }
}

/** Corre tareas async con un límite de concurrencia (rate-limit amable con MP). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1) Verificar que el llamante sea superadmin.
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'No autorizado' }, 401);

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: 'No autorizado' }, 401);

    const { data: profile } = await admin
      .from('users')
      .select('rol')
      .eq('auth_id', userData.user.id)
      .single();

    if (profile?.rol !== 'superadmin') return json({ error: 'Solo superadmin' }, 403);

    // Fail-fast de configuración: sin token de MP, cada GET daría 401 y TODA
    // automotora activa saldría "desalineada" (ámbar) — alarma falsa masiva.
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      return json({ error: 'MERCADOPAGO_ACCESS_TOKEN no configurado' }, 500);
    }

    // 2) Leer clients + subscriptions de goautos-admin.
    const { data: clients, error: clientsErr } = await admin
      .from('clients')
      .select('id, name, domain, subscription_status, onboarding_status, is_active, created_at')
      .order('name', { ascending: true });
    if (clientsErr) return json({ error: 'Error leyendo clients', details: clientsErr.message }, 500);

    const { data: subs } = await admin
      .from('subscriptions')
      .select('id, client_id, status, preapproval_id, next_payment_date, trial_ends_at, amount, payer_email, created_at')
      .order('created_at', { ascending: false });

    // Última suscripción por client_id.
    const subByClient = new Map<number, any>();
    for (const s of subs || []) {
      if (!subByClient.has(s.client_id)) subByClient.set(s.client_id, s);
    }

    // 3) Consultar MercadoPago por cada preapproval_id (concurrencia limitada).
    const withPreapproval = (subs || []).filter((s) => s.preapproval_id);
    const mpResults = await mapLimit(withPreapproval, 5, async (s) => ({
      preapproval_id: s.preapproval_id,
      mp: await fetchMpPreapproval(s.preapproval_id),
    }));
    const mpByPreapproval = new Map<string, any>();
    for (const r of mpResults) mpByPreapproval.set(r.preapproval_id, r.mp);

    // Un 401 de MP siempre es credencial inválida/expirada (un preapproval
    // inexistente da 404). Con esto el tablero avisa "token inválido" en vez de
    // pintar todo como desalineado.
    const mpAuthError = mpResults.some((r) => r.mp?.status === 'http_401');

    // 4) CRM (opcional). supabase-js NO lanza en errores de PostgREST: hay que
    // leer `error`, si no un CRM inalcanzable se ve como "CRM sin datos" (señal
    // invertida en el tablero que es la red de seguridad).
    const crmByEmail = new Map<string, any>();
    let crmAvailable = false;
    let crmError: string | null = null;
    if (VENTAS_URL && VENTAS_KEY) {
      try {
        const ventas = createClient(VENTAS_URL, VENTAS_KEY);
        const { data: crmSubs, error: crmErr } = await ventas
          .from('mp_subscriptions')
          .select('payer_email, status, last_payment_status, next_payment_date, client_id');
        if (crmErr) {
          console.error('CRM query error (se omite):', crmErr.message);
          crmError = crmErr.message;
        } else {
          for (const c of crmSubs || []) {
            if (c.payer_email) crmByEmail.set(String(c.payer_email).toLowerCase(), c);
          }
          crmAvailable = true;
        }
      } catch (e) {
        console.error('CRM query failed (se omite):', e);
        crmError = String(e);
      }
    }

    // 5) Clasificar cada automotora.
    const ACTIVE = new Set(['active', 'trial']);
    const rows = (clients || []).map((c) => {
      const sub = subByClient.get(c.id) || null;
      const mp = sub?.preapproval_id ? mpByPreapproval.get(sub.preapproval_id) : null;
      const crm = sub?.payer_email ? crmByEmail.get(String(sub.payer_email).toLowerCase()) : null;

      const adminActive = ACTIVE.has(c.subscription_status);
      let verdict: string;

      if (!adminActive) {
        verdict = 'INACTIVO';
      } else if (!sub || !sub.preapproval_id) {
        // Activo por default, sin ninguna suscripción real detrás.
        verdict = 'SIN_PAGO_VERIFICADO';
      } else if (mp?.ok && mp.status === 'authorized') {
        verdict = 'CUADRADO';
      } else {
        // Hay preapproval pero MP no confirma authorized, o no se pudo consultar.
        verdict = 'DESALINEADO';
      }

      return {
        client_id: c.id,
        name: c.name,
        domain: c.domain,
        admin_status: c.subscription_status,
        onboarding_status: c.onboarding_status,
        is_active: c.is_active,
        subscription: sub
          ? {
              status: sub.status,
              preapproval_id: sub.preapproval_id,
              next_payment_date: sub.next_payment_date,
              amount: sub.amount,
              payer_email: sub.payer_email,
            }
          : null,
        mercadopago: mp || null,
        crm: crm ? { status: crm.status, last_payment_status: crm.last_payment_status } : null,
        verdict,
      };
    });

    const summary = rows.reduce((acc, r) => {
      acc[r.verdict] = (acc[r.verdict] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return json({
      generated_at: new Date().toISOString(),
      crm_available: crmAvailable,
      crm_error: crmError,
      mp_auth_error: mpAuthError,
      total: rows.length,
      summary,
      rows,
    });
  } catch (error) {
    console.error('reconciliation error:', error);
    return json({ error: 'Error interno', details: (error as Error).message }, 500);
  }
});
