import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useVehicleFullDetail } from '@/hooks/useVehicleFullDetail';
import { registerVehicleSale } from '@/services/vehicleSaleService';
import type { VehiclePreview } from '@/types/gaia';
import { cn } from '@/lib/utils';
import {
  Car,
  Search,
  User,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SaleFormBlockProps {
  vehicleId: number;
  preview?: VehiclePreview;
  onAction: (msg: string) => void;
}

interface CustomerHit {
  id: number;
  first_name: string;
  last_name: string;
  rut?: string;
  phone?: string;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'check', label: 'Cheque' },
  { value: 'vale_vista', label: 'Vale vista' },
  { value: 'credit', label: 'Crédito' },
];

const fmtCLP = (v?: number | null) => {
  if (v == null) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(v);
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export function SaleFormBlock({ vehicleId, preview, onAction }: SaleFormBlockProps) {
  const { clientId } = useAuth();
  const { data, isLoading } = useVehicleFullDetail(vehicleId);
  const v = data?.vehicle;

  const brand = v?.brand?.name ?? preview?.brand ?? '';
  const model = v?.model?.name ?? preview?.model ?? '';
  const year = v?.year ?? preview?.year;
  const vehicleRef = `${brand} ${model} ${year} (ID: ${vehicleId})`.trim();

  const [salePrice, setSalePrice] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [saleDate, setSaleDate] = useState(todayISO());
  const [notes, setNotes] = useState('');

  // Cliente (opcional)
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [custQuery, setCustQuery] = useState('');
  const [custResults, setCustResults] = useState<CustomerHit[]>([]);
  const [searching, setSearching] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Precarga el precio publicado cuando llega el detalle
  useEffect(() => {
    if (v?.price && salePrice === 0) setSalePrice(Number(v.price));
  }, [v?.price]); // eslint-disable-line react-hooks/exhaustive-deps

  // Búsqueda de clientes (debounce simple)
  useEffect(() => {
    if (!clientId || custQuery.trim().length < 2) {
      setCustResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const like = `%${custQuery.trim()}%`;
      const { data: rows } = await supabase
        .from('customers')
        .select('id, first_name, last_name, rut, phone')
        .eq('client_id', clientId)
        .or(`first_name.ilike.${like},last_name.ilike.${like},rut.ilike.${like},phone.ilike.${like}`)
        .limit(6);
      if (!cancelled) {
        setCustResults((rows as CustomerHit[]) || []);
        setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [custQuery, clientId]);

  const alreadySold = !!data?.isSold;
  const canSubmit = salePrice > 0 && !!paymentMethod && !submitting && !alreadySold;

  const handleSubmit = async () => {
    if (!clientId || !canSubmit) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await registerVehicleSale({
        vehicleId,
        clientId,
        customerId: customer?.id ?? null,
        salePrice,
        paymentMethod,
        sellerId: (v?.seller_id as number | null) ?? null,
        saleDate,
        notes: notes.trim() || undefined,
      });

      const ok = res === true || (typeof res === 'object' && res?.success);
      if (ok) {
        setResult({ ok: true, msg: 'Venta registrada correctamente.' });
      } else {
        setResult({ ok: false, msg: 'No se pudo registrar la venta. Revisa los datos e intenta de nuevo.' });
      }
    } catch (e: any) {
      setResult({ ok: false, msg: e?.message || 'Error al registrar la venta.' });
    } finally {
      setSubmitting(false);
    }
  };

  // ───── Estado: ya vendido ─────
  if (alreadySold && !result) {
    return (
      <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[14px] font-semibold text-amber-900">Este vehículo ya está vendido</p>
            <p className="text-[13px] text-amber-700 mt-0.5">
              {brand} {model} {year} ya tiene una venta registrada.
            </p>
            <button
              onClick={() => onAction(`Muéstrame el resumen de la venta del ${vehicleRef}`)}
              className="mt-2 text-[13px] font-medium text-amber-800 underline underline-offset-2"
            >
              Ver resumen de la venta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───── Estado: resultado ─────
  if (result) {
    return (
      <div
        className={cn(
          'w-full rounded-2xl border p-4',
          result.ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
        )}
      >
        <div className="flex items-start gap-2.5">
          {result.ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <p className={cn('text-[14px] font-semibold', result.ok ? 'text-emerald-900' : 'text-rose-900')}>
              {result.msg}
            </p>
            {result.ok && (
              <div className="mt-1 text-[13px] text-emerald-800">
                <p>{brand} {model} {year} · {fmtCLP(salePrice)}</p>
                <button
                  onClick={() => onAction(`Muéstrame el resumen de la venta del ${vehicleRef}`)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-700 font-medium text-[13px] hover:shadow-sm"
                >
                  Ver resumen
                </button>
              </div>
            )}
            {!result.ok && (
              <button
                onClick={() => setResult(null)}
                className="mt-2 text-[13px] font-medium text-rose-700 underline underline-offset-2"
              >
                Reintentar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      {/* Cabecera vehículo */}
      <div className="px-4 py-3 border-b border-slate-50 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
          {(v?.main_image || preview?.main_image) ? (
            <img src={v?.main_image || preview?.main_image} alt="" className="w-full h-full object-cover" />
          ) : (
            <Car className="w-5 h-5 text-slate-300" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-slate-800 truncate">Registrar venta</p>
          <p className="text-[12px] text-slate-400 truncate">{brand} {model} {year}</p>
        </div>
      </div>

      <div className="p-4 space-y-3.5">
        {/* Precio */}
        <div>
          <label className="text-[12px] font-medium text-slate-500">Precio de venta</label>
          <div className="mt-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">$</span>
            <input
              type="number"
              value={salePrice || ''}
              onChange={(e) => setSalePrice(Number(e.target.value))}
              placeholder={isLoading ? 'Cargando…' : '0'}
              className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-[14px] focus:outline-none focus:border-cyan-300"
            />
          </div>
        </div>

        {/* Método de pago */}
        <div>
          <label className="text-[12px] font-medium text-slate-500">Método de pago</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setPaymentMethod(m.value)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all',
                  paymentMethod === m.value
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cliente (opcional) */}
        <div>
          <label className="text-[12px] font-medium text-slate-500">Cliente <span className="text-slate-300">(opcional)</span></label>
          {customer ? (
            <div className="mt-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-slate-700 truncate">
                  {customer.first_name} {customer.last_name}
                </p>
                {customer.rut && <p className="text-[11px] text-slate-400">{customer.rut}</p>}
              </div>
              <button onClick={() => setCustomer(null)} className="text-slate-400 hover:text-rose-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="mt-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
              <input
                value={custQuery}
                onChange={(e) => setCustQuery(e.target.value)}
                placeholder="Buscar por nombre o RUT…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-[14px] focus:outline-none focus:border-cyan-300"
              />
              {(searching || custResults.length > 0) && custQuery.trim().length >= 2 && (
                <div className="absolute z-10 left-0 right-0 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
                  {searching ? (
                    <div className="px-3 py-2 text-[13px] text-slate-400 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando…
                    </div>
                  ) : (
                    custResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCustomer(c);
                          setCustQuery('');
                          setCustResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <User className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <span className="text-[13px] text-slate-700 truncate">
                          {c.first_name} {c.last_name}
                        </span>
                        {c.rut && <span className="text-[11px] text-slate-400 ml-auto">{c.rut}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fecha */}
        <div>
          <label className="text-[12px] font-medium text-slate-500">Fecha de venta</label>
          <input
            type="date"
            value={saleDate}
            max={todayISO()}
            onChange={(e) => setSaleDate(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-[14px] focus:outline-none focus:border-cyan-300"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-cyan-500 text-white font-semibold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/20 active:scale-[0.99] transition-all"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Registrando…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" /> Registrar venta · {fmtCLP(salePrice)}
            </>
          )}
        </button>
        <p className="text-[11px] text-slate-400 text-center">
          Para parte de pago, comisiones o pagos mixtos, usa la ficha completa del vehículo.
        </p>
      </div>
    </div>
  );
}
