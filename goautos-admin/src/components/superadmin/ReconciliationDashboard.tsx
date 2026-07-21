import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

// Tablero de conciliación de suscripciones (solo superadmin, solo lectura).
// Cruza goautos-admin + MercadoPago (+ CRM opcional) y muestra un semáforo por
// automotora. Los datos los arma la edge function `superadmin-reconciliation`.

type Verdict = 'CUADRADO' | 'DESALINEADO' | 'SIN_PAGO_VERIFICADO' | 'INACTIVO';

interface Row {
  client_id: number;
  name: string;
  domain: string | null;
  admin_status: string;
  onboarding_status: string;
  is_active: boolean;
  subscription: {
    status: string;
    preapproval_id: string;
    next_payment_date: string | null;
    amount: number | null;
    payer_email: string | null;
  } | null;
  mercadopago: { ok: boolean; status: string; label?: string } | null;
  crm: { status: string; last_payment_status: string } | null;
  verdict: Verdict;
}

interface Payload {
  generated_at: string;
  crm_available: boolean;
  crm_error?: string | null;
  mp_auth_error?: boolean;
  total: number;
  summary: Record<string, number>;
  rows: Row[];
}

const VERDICTS: { key: Verdict; label: string; dot: string; chip: string }[] = [
  { key: 'CUADRADO', label: 'Cuadrado', dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'DESALINEADO', label: 'Desalineado', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'SIN_PAGO_VERIFICADO', label: 'Sin pago verificado', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'INACTIVO', label: 'Inactivo', dot: 'bg-slate-400', chip: 'bg-slate-50 text-slate-600 border-slate-200' },
];

const verdictMeta = (v: Verdict) => VERDICTS.find((x) => x.key === v)!;

const ReconciliationDashboard: React.FC = () => {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Verdict | 'ALL'>('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: fnErr } = await supabase.functions.invoke('superadmin-reconciliation');
      if (fnErr) throw fnErr;
      setData(res as Payload);
    } catch (e) {
      // FunctionsHttpError trae el JSON del error real en error.context (un Response);
      // sin esto solo veríamos el genérico 'non-2xx status code'.
      if (e instanceof FunctionsHttpError) {
        const body = await e.context.json().catch(() => null);
        const msg = [body?.error, body?.details].filter(Boolean).join(': ');
        setError(msg || (e as Error).message || 'Error cargando el tablero');
      } else {
        setError((e as Error).message || 'Error cargando el tablero');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.rows || [];
  const filtered = filter === 'ALL' ? rows : rows.filter((r) => r.verdict === filter);

  return (
    <div className="space-y-4">
      {/* Encabezado + resumen */}
      <div className="rounded-xl border border-slate-200/60 bg-white p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Conciliación de suscripciones</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Cruce de GoAuto, MercadoPago{data?.crm_available ? ' y CRM' : ''} · {data?.total ?? 0} automotoras
              {data?.generated_at && (
                <> · actualizado {new Date(data.generated_at).toLocaleString('es-CL')}</>
              )}
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="self-start rounded-xl border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>

        {/* Chips de resumen (también filtran) */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={cn(
              'rounded-full border px-3 py-1 text-[12px] font-medium',
              filter === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
            )}
          >
            Todas ({data?.total ?? 0})
          </button>
          {VERDICTS.map((v) => (
            <button
              key={v.key}
              onClick={() => setFilter(filter === v.key ? 'ALL' : v.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium',
                filter === v.key ? v.chip : 'bg-white text-slate-600 border-slate-200'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', v.dot)} />
              {v.label} ({data?.summary?.[v.key] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
          {error}
        </div>
      )}

      {data?.mp_auth_error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
          ⚠ El token de MercadoPago es inválido o expiró — los estados "Desalineado" NO son confiables hasta corregirlo.
        </div>
      )}

      {data?.crm_error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-700">
          ⚠ No se pudo consultar el CRM (columna omitida): {data.crm_error}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-slate-200/60 bg-slate-50/60 text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">Automotora</th>
              <th className="px-4 py-2.5 font-medium">GoAuto</th>
              <th className="px-4 py-2.5 font-medium">MercadoPago</th>
              {data?.crm_available && <th className="px-4 py-2.5 font-medium">CRM</th>}
              <th className="px-4 py-2.5 font-medium">Próximo cobro</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Cargando conciliación…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Sin automotoras en este filtro.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((r) => {
                const m = verdictMeta(r.verdict);
                return (
                  <tr key={r.client_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{r.name || `Cliente #${r.client_id}`}</div>
                      {r.domain && <div className="text-[11px] text-slate-400">{r.domain}</div>}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{r.admin_status}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {r.mercadopago
                        ? (r.mercadopago.ok
                            ? (r.mercadopago.label || r.mercadopago.status)
                            : `⚠ ${r.mercadopago.label || r.mercadopago.status}`)
                        : '—'}
                    </td>
                    {data?.crm_available && (
                      <td className="px-4 py-2.5 text-slate-600">{r.crm ? r.crm.status : '—'}</td>
                    )}
                    <td className="px-4 py-2.5 text-slate-600">
                      {r.subscription?.next_payment_date
                        ? new Date(r.subscription.next_payment_date).toLocaleDateString('es-CL')
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', m.chip)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
                        {m.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReconciliationDashboard;
