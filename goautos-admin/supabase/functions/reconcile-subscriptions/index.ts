// Reconciliación de suscripciones con MercadoPago como fuente de verdad.
// Mata la "suscripción vencida invisible": después del alta, nadie actualizaba
// next_payment_date ni el estado (el webhook del admin no recibe los eventos del
// flujo nuevo — van al CRM — y no había cron). Un cliente cuya tarjeta rebota o
// que cancela en MP seguía "trial/active" (= con acceso) para siempre.
//
// CERCO DE SEGURIDAD (no romper a los ~151 clientes legados que pagan manual):
//   - Solo reconcilia filas de `subscriptions` con preapproval_id real.
//   - Y SOLO si el cliente tiene access_source IN ('trial','paid_verified')
//     (los del flujo de pago automático). Los legados son 'inherited_default'
//     y no tienen preapproval → quedan FUERA por partida doble.
//   - Un error de MP (404/5xx/timeout) NUNCA muta nada: solo se reporta.
//     El único evento que corta acceso es un "cancelled" CONFIRMADO por MP.
//   - paused (dunning: MP reintenta el cobro) marca la suscripción past_due
//     pero NO toca clients.subscription_status → el cliente conserva acceso
//     durante la gracia; recién el cancelled definitivo de MP lo corta.
//
// MODOS:
//   - report (default): calcula el diff y lo deja en reconciliation_runs. Cero
//     escrituras fuera del log. Es el modo del cron hasta que validemos.
//   - enforce: aplica los cambios (subscriptions + clients). Se activa
//     cambiando el body del cron job a {"mode":"enforce"} — no requiere deploy.
//
// AUTH: server-to-server. Bearer == SUPABASE_SERVICE_ROLE_KEY (env
// auto-inyectada) para llamadas manuales, o x-reconcile-secret == secreto
// aleatorio de Vault ('reconcile_subscriptions_secret') para el cron.
// verify_jwt=false en config.toml porque el caller no es un usuario.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const MP_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN') || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

interface SubRow {
  id: number;
  client_id: number;
  status: string;
  preapproval_id: string;
  next_payment_date: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

interface Change {
  subscription_id: number;
  client_id: number;
  preapproval_id: string;
  action: string; // p.ej. 'trial→active', 'update next_payment_date', 'cancelled', 'skip:http_404'
  before: Record<string, unknown>;
  after: Record<string, unknown> | null;
  applied: boolean;
  error?: string;
}

/** GET del preapproval en MP con timeout corto; nunca lanza. */
async function fetchPreapproval(id: string): Promise<{ ok: boolean; status: string; data?: Record<string, any> }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, status: `http_${res.status}` };
    return { ok: true, status: 'ok', data: await res.json() };
  } catch (_) {
    return { ok: false, status: 'fetch_error' };
  }
}

/** Fin del trial según MP: date_created + free_trial (days|months). Null si no hay trial o ya venció. */
function mpTrialEnd(mp: Record<string, any>): Date | null {
  const ft = mp.auto_recurring?.free_trial as { frequency?: number; frequency_type?: string } | undefined;
  if (!ft?.frequency || !mp.date_created) return null;
  const end = new Date(mp.date_created);
  if (ft.frequency_type === 'months') end.setMonth(end.getMonth() + ft.frequency);
  else end.setDate(end.getDate() + ft.frequency);
  return end;
}

const toDateStr = (v: unknown): string | null =>
  typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null;

serve(async (req) => {
  // Auth server-to-server, dos vías:
  //  (a) Bearer == service role key (llamadas manuales/operativas), o
  //  (b) x-reconcile-secret == secreto aleatorio de Vault (el cron pg_net lo
  //      lee de vault.decrypted_secrets; la función lo consulta vía el RPC
  //      restringido get_reconcile_secret — el secreto vive SOLO en la DB).
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  let authorized = Boolean(SERVICE_ROLE_KEY) && token === SERVICE_ROLE_KEY;
  if (!authorized) {
    const provided = req.headers.get('x-reconcile-secret') || '';
    if (provided) {
      const { data: expected } = await supabase.rpc('get_reconcile_secret');
      authorized = Boolean(expected) && provided === expected;
    }
  }
  if (!authorized) return json({ error: 'unauthorized' }, 401);
  if (!MP_TOKEN) return json({ error: 'MERCADOPAGO_ACCESS_TOKEN no configurado' }, 500);

  let mode = 'report';
  try {
    const body = await req.json();
    if (body?.mode === 'enforce') mode = 'enforce';
  } catch (_) { /* body vacío = report */ }

  // 1) Candidatas: suscripciones con preapproval real en estado vivo, más
  // recientes primero (el orden importa para el dedupe por cliente de abajo).
  const { data: subs, error: subsErr } = await supabase
    .from('subscriptions')
    .select('id, client_id, status, preapproval_id, next_payment_date, trial_ends_at, created_at')
    .not('preapproval_id', 'is', null)
    .in('status', ['trial', 'active', 'past_due'])
    .order('created_at', { ascending: false });
  if (subsErr) return json({ error: `Error leyendo subscriptions: ${subsErr.message}` }, 500);

  // 2) Cerco por access_source: solo clientes del flujo de pago automático.
  const clientIds = [...new Set((subs || []).map((s) => s.client_id).filter(Boolean))];
  const scoped = new Map<number, { access_source: string; subscription_status: string }>();
  if (clientIds.length > 0) {
    const { data: clients, error: clientsErr } = await supabase
      .from('clients')
      .select('id, access_source, subscription_status')
      .in('id', clientIds)
      .in('access_source', ['trial', 'paid_verified']);
    if (clientsErr) return json({ error: `Error leyendo clients: ${clientsErr.message}` }, 500);
    for (const c of clients || []) scoped.set(c.id, c);
  }
  // Dedupe: UNA sola sub por cliente — la MÁS RECIENTE (la lista viene ordenada
  // desc). Sin esto, la fila vieja de un cliente que canceló y se RE-SUSCRIBIÓ
  // (cancelled en MP) pisaba clients.subscription_status y bloqueaba a un
  // cliente que SÍ está pagando (hallazgo confirmado de la revisión).
  const seenClient = new Set<number>();
  const candidates: SubRow[] = [];
  let dupes = 0;
  for (const s of (subs || []) as SubRow[]) {
    if (!scoped.has(s.client_id)) continue;
    if (seenClient.has(s.client_id)) { dupes++; continue; }
    seenClient.add(s.client_id);
    candidates.push(s);
  }

  const changes: Change[] = [];
  let errors = 0;

  // 3) Reconciliar contra MP (secuencial: son pocas filas y evita rate limit).
  for (const sub of candidates) {
    const mpRes = await fetchPreapproval(sub.preapproval_id);
    if (!mpRes.ok || !mpRes.data) {
      // REGLA DURA: error/no-existe en MP NUNCA muta — solo queda reportado.
      errors++;
      changes.push({
        subscription_id: sub.id,
        client_id: sub.client_id,
        preapproval_id: sub.preapproval_id,
        action: `skip:${mpRes.status}`,
        before: { status: sub.status },
        after: null,
        applied: false,
      });
      continue;
    }

    const mp = mpRes.data;
    const client = scoped.get(sub.client_id)!;

    let subUpdate: Record<string, unknown> | null = null;
    let clientUpdate: Record<string, unknown> | null = null;
    let action = 'in_sync';

    if (mp.status === 'authorized') {
      const trialEnd = mpTrialEnd(mp);
      const inTrial = trialEnd !== null && trialEnd.getTime() > Date.now();
      const newStatus = inTrial ? 'trial' : 'active';
      const newNext = toDateStr(mp.next_payment_date);
      const newTrialEnds = inTrial ? toDateStr(trialEnd!.toISOString()) : sub.trial_ends_at;

      if (newStatus !== sub.status || (newNext && newNext !== sub.next_payment_date)) {
        subUpdate = { status: newStatus, next_payment_date: newNext ?? sub.next_payment_date, trial_ends_at: newTrialEnds };
        action = newStatus !== sub.status ? `${sub.status}→${newStatus}` : 'update:next_payment_date';
      }
      // Cliente: al pasar a pago real, sube a paid_verified.
      const wantAccess = inTrial ? 'trial' : 'paid_verified';
      if (client.subscription_status !== newStatus || client.access_source !== wantAccess) {
        clientUpdate = { subscription_status: newStatus, access_source: wantAccess };
      }
    } else if (mp.status === 'paused') {
      // Dunning: MP sigue reintentando. Marcamos la sub, NO cortamos acceso.
      if (sub.status !== 'past_due') {
        subUpdate = { status: 'past_due' };
        action = `${sub.status}→past_due (paused en MP, acceso se conserva)`;
      }
    } else if (mp.status === 'cancelled') {
      subUpdate = { status: 'cancelled', cancelled_at: new Date().toISOString().slice(0, 10) };
      clientUpdate = { subscription_status: 'cancelled' };
      action = `${sub.status}→cancelled (confirmado por MP — corta acceso)`;
    } else {
      // pending u otros estados: jamás activar/cortar por esto.
      action = `skip:mp_${mp.status}`;
    }

    if (!subUpdate && !clientUpdate) {
      if (action !== 'in_sync') {
        changes.push({
          subscription_id: sub.id, client_id: sub.client_id, preapproval_id: sub.preapproval_id,
          action, before: { status: sub.status }, after: null, applied: false,
        });
      }
      continue;
    }

    const change: Change = {
      subscription_id: sub.id,
      client_id: sub.client_id,
      preapproval_id: sub.preapproval_id,
      action,
      before: {
        sub_status: sub.status,
        next_payment_date: sub.next_payment_date,
        client_status: client.subscription_status,
        access_source: client.access_source,
      },
      after: { sub: subUpdate, client: clientUpdate },
      applied: false,
    };

    if (mode === 'enforce') {
      try {
        // Guard TOCTOU antes de CORTAR acceso: si durante la corrida nació una
        // sub viva MÁS NUEVA de este cliente (re-suscripción / provisioning en
        // paralelo), no tocar al cliente — solo marcar esta sub.
        if (clientUpdate && (clientUpdate as any).subscription_status === 'cancelled') {
          const { data: fresher } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('client_id', sub.client_id)
            .in('status', ['trial', 'active'])
            .neq('id', sub.id)
            .gt('created_at', sub.created_at)
            .limit(1);
          if (fresher && fresher.length > 0) {
            clientUpdate = null;
            change.action += ' [cliente NO tocado: existe sub viva más nueva]';
            change.after = { sub: subUpdate, client: null };
          }
        }

        // ORDEN: clients PRIMERO, subscriptions DESPUÉS. Si el segundo update
        // falla, la sub sigue en estado vivo → vuelve a ser candidata mañana y
        // se auto-repara. Al revés (sub primero), un fallo dejaba la sub
        // 'cancelled' fuera de las candidatas y el corte de acceso se perdía
        // PARA SIEMPRE (hallazgo confirmado de la revisión).
        if (clientUpdate) {
          const { error: clErr } = await supabase.from('clients').update(clientUpdate).eq('id', sub.client_id);
          if (clErr) throw new Error(`clients: ${clErr.message}`);
        }
        if (subUpdate) {
          const { error: upErr } = await supabase.from('subscriptions').update(subUpdate).eq('id', sub.id);
          if (upErr) throw new Error(`subscriptions: ${upErr.message}`);
        }
        change.applied = true;
      } catch (e) {
        errors++;
        change.error = String(e);
      }
    }
    changes.push(change);
  }

  // 4) Log del run (auditable desde SQL/tablero).
  const summary = {
    mode,
    checked: candidates.length,
    out_of_scope: (subs || []).length - candidates.length - dupes,
    older_dupes_skipped: dupes,
    changes: changes.filter((c) => c.after !== null).length,
    applied: changes.filter((c) => c.applied).length,
    errors,
  };
  const { error: logErr } = await supabase
    .from('reconciliation_runs')
    .insert({ mode, summary, details: changes });
  if (logErr) console.error('reconcile: error guardando log:', logErr.message);

  // 5) Alerta por email si el run trae novedades reales: cambios aplicados/
  // detectados o errores de suscripciones REALES (los seeds TEST-* de prueba
  // fallan siempre con http_400 y generarían spam diario — se excluyen del
  // gatillo pero siguen en el log). Best-effort: jamás rompe el run.
  const notable = changes.filter((c) =>
    c.after !== null || c.error || (c.action.startsWith('skip:') && !c.preapproval_id.startsWith('TEST-'))
  );
  if (notable.length > 0) {
    // OJO destino: soporte@goauto.cl NO existe (el dominio no tiene MX) — default
    // a una casilla real; configurable con el secret RECONCILE_ALERT_EMAIL.
    const alertTo = Deno.env.get('RECONCILE_ALERT_EMAIL') || 'dvaldes@dropout.cl';
    // Errores "reales" para el asunto: los seeds TEST-* fallan siempre (http_400)
    // y ya están excluidos del gatillo — contarlos en el subject sería ruido.
    const realErrors = notable.filter((c) => c.error || c.action.startsWith('skip:')).length;
    const rows = notable.map((c) =>
      `<tr><td style="padding:4px 8px"><code>${c.client_id}</code></td><td style="padding:4px 8px">${c.action}</td><td style="padding:4px 8px">${c.applied ? 'aplicado' : (c.error ? `ERROR: ${c.error}` : 'detectado')}</td></tr>`
    ).join('');
    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          to: [alertTo],
          subject: `Reconciliación MP (${mode}): ${summary.changes} cambios, ${realErrors} errores`,
          from: 'GoAuto Alertas <reportes@goauto.cl>',
          content: `<div style="font-family:Arial,sans-serif;max-width:640px"><h2>Reconciliación de suscripciones — novedades</h2><p>Modo <strong>${mode}</strong> · revisadas ${summary.checked} · cambios ${summary.changes} · aplicados ${summary.applied} · errores reales ${realErrors}</p><table style="background:#f8fafc;border-radius:8px;width:100%;font-size:13px"><tr><th style="text-align:left;padding:4px 8px">Cliente</th><th style="text-align:left;padding:4px 8px">Acción</th><th style="text-align:left;padding:4px 8px">Resultado</th></tr>${rows}</table><p style="color:#64748b;font-size:12px">Detalle completo en la tabla reconciliation_runs y el tablero de Conciliación.</p></div>`,
        }),
      });
      if (!resp.ok) console.error('reconcile: alerta email HTTP', resp.status);
    } catch (e) {
      console.error('reconcile: alerta email errored:', e);
    }
  }

  console.log('reconcile:', JSON.stringify(summary));
  return json({ ...summary, details: changes });
});
