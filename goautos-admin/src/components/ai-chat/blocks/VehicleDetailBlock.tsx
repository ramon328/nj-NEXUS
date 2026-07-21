import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { VehiclePreview } from '@/types/gaia';
import { useVehicleFullDetail } from '@/hooks/useVehicleFullDetail';
import {
  Car,
  Gauge,
  Calendar,
  Fuel,
  Settings2,
  Palette,
  Hash,
  Users,
  KeyRound,
  Eye,
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  ShieldAlert,
  Megaphone,
  CheckCircle2,
  Pencil,
  Image as ImageIcon,
  Zap,
} from 'lucide-react';

interface VehicleDetailBlockProps {
  vehicleId: number;
  preview?: VehiclePreview;
  onAction: (msg: string) => void;
  /** Si se entrega, "Marcar como vendido" abre el formulario de venta inline. */
  onRegisterSale?: () => void;
  /** Si se entrega, "Ver documentos" abre el bloque de documentos reales. */
  onViewDocuments?: () => void;
}

const fmtCLP = (v?: number | null) => {
  if (v == null || v === 0) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(v);
};

const fmtKm = (km?: number | null) =>
  km ? `${km.toLocaleString('es-CL')} km` : '—';

const daysSince = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (isNaN(d)) return null;
  return Math.max(0, Math.floor((Date.now() - d) / 86400000));
};

/** Estado de un permiso/vencimiento: vencido, por vencer (<30d) o vigente. */
const expiryState = (iso?: string) => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  const days = Math.floor((t - Date.now()) / 86400000);
  if (days < 0) return { tone: 'danger' as const, label: 'Vencido', days };
  if (days <= 30) return { tone: 'warn' as const, label: `${days}d`, days };
  return { tone: 'ok' as const, label: 'Vigente', days };
};

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Spec({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  if (value == null || value === '—' || value === '') return null;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-slate-400 leading-none">{label}</p>
        <p className="text-[13px] font-medium text-slate-700 truncate leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function VehicleDetailBlock({ vehicleId, preview, onAction, onRegisterSale, onViewDocuments }: VehicleDetailBlockProps) {
  const { data, isLoading, error } = useVehicleFullDetail(vehicleId);
  const [activeImg, setActiveImg] = useState(0);

  const v = data?.vehicle;

  // Datos de cabecera: preferimos el detalle cargado, con fallback al preview
  const brand = v?.brand?.name ?? preview?.brand ?? '';
  const model = v?.model?.name ?? preview?.model ?? '';
  const year = v?.year ?? preview?.year;
  const price = v?.price ?? preview?.price;
  const statusName = v?.status?.name ?? preview?.status ?? '';
  const statusColor = v?.status?.color ?? preview?.statusColor ?? '#64748b';

  const gallery = useMemo(() => {
    const imgs = new Set<string>();
    if (v?.main_image) imgs.add(v.main_image);
    else if (preview?.main_image) imgs.add(preview.main_image);
    (v?.gallery ?? []).forEach((g: string) => g && imgs.add(g));
    return Array.from(imgs);
  }, [v, preview]);

  const stockDays = daysSince(v?.created_at) ?? preview?.days_in_stock ?? null;
  const isSold = !!data?.isSold;
  const isPublished = !!(v?.status?.show_in_web || v?.is_published);

  // Acciones recomendadas según el estado del vehículo (instantáneas, sin LLM).
  const actions = useMemo(() => {
    const ref = `${brand} ${model} ${year} (ID: ${vehicleId})`;
    const list: { label: string; icon: React.ElementType; msg: string; tone?: 'primary'; local?: 'sale' | 'docs' }[] = [];

    if (isSold) {
      list.push({ label: 'Ver resumen de venta', icon: CheckCircle2, msg: `Muéstrame el resumen de la venta del ${ref}` });
    } else {
      if (!isPublished) {
        list.push({ label: 'Publicar en MercadoLibre', icon: Megaphone, msg: `Publica el ${ref} en MercadoLibre`, tone: 'primary' });
        list.push({ label: 'Publicar en Facebook', icon: Megaphone, msg: `Publica el ${ref} en Facebook Marketplace` });
      }
      list.push({ label: 'Marcar como vendido', icon: CheckCircle2, msg: `Quiero registrar la venta del ${ref}`, local: 'sale' });
      list.push({ label: 'Editar precio', icon: Pencil, msg: `Quiero cambiar el precio del ${ref}` });
    }

    if ((v?.fines_count ?? 0) > 0) {
      list.push({ label: `Ver multas (${v.fines_count})`, icon: ShieldAlert, msg: `Muéstrame las multas del ${ref}` });
    }
    list.push({ label: 'Ver documentos', icon: FileText, msg: `Muéstrame los documentos del ${ref}`, local: 'docs' });
    if (gallery.length > 0) {
      list.push({ label: 'Ver todas las fotos', icon: ImageIcon, msg: `Muéstrame todas las fotos del ${ref}` });
    }
    return list;
  }, [brand, model, year, vehicleId, isSold, isPublished, v, gallery.length]);

  const profit = data?.profit;

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      {/* ───── Galería (full-width, alta en móvil) ───── */}
      <div className="relative w-full bg-gradient-to-br from-slate-100 to-slate-50 aspect-[4/3] sm:aspect-[16/9]">
        {gallery.length > 0 ? (
          <img
            src={gallery[activeImg] ?? gallery[0]}
            alt={`${brand} ${model}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="w-14 h-14 text-slate-200" />
          </div>
        )}

        {/* Status + stock overlays */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-white backdrop-blur-md"
            style={{ backgroundColor: `${statusColor}e6` }}
          >
            {statusName || '—'}
          </span>
          {stockDays != null && !isSold && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold text-white bg-black/40 backdrop-blur-md">
              <Clock className="w-3 h-3" />
              {stockDays}d
            </span>
          )}
        </div>

        {/* Precio overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-white text-lg sm:text-xl font-bold leading-tight truncate">
                {brand} {model}
              </h3>
              <p className="text-white/70 text-xs">{year}{v?.license_plate ? ` · ${v.license_plate}` : ''}</p>
            </div>
            <span className="text-white text-xl sm:text-2xl font-bold tracking-tight shrink-0">
              {fmtCLP(price)}
            </span>
          </div>
        </div>
      </div>

      {/* Thumbnails */}
      {gallery.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-slate-50">
          {gallery.slice(0, 8).map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImg(i)}
              className={cn(
                'h-12 w-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all',
                i === activeImg ? 'border-cyan-400' : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              <img src={img} alt={`foto ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="px-4 py-3 text-[13px] text-red-500">{error}</div>
      )}

      {/* ───── Specs ───── */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
          <Spec icon={Calendar} label="Año" value={year} />
          <Spec icon={Gauge} label="Kilometraje" value={fmtKm(v?.mileage)} />
          <Spec icon={Fuel} label="Combustible" value={v?.fuel_type?.name} />
          <Spec icon={Settings2} label="Transmisión" value={v?.transmission} />
          <Spec icon={Palette} label="Color" value={v?.color?.name} />
          <Spec icon={Car} label="Condición" value={v?.condition?.name} />
          <Spec icon={Hash} label="Chasis" value={v?.chassis_number} />
          <Spec icon={Users} label="Dueños" value={v?.owners} />
          <Spec icon={KeyRound} label="Llaves" value={v?.keys} />
          <Spec icon={Eye} label="Visitas" value={v?.views} />
        </div>

        {isLoading && !v && (
          <div className="mt-3 space-y-2 animate-pulse">
            <div className="h-3 bg-slate-100 rounded w-2/3" />
            <div className="h-3 bg-slate-100 rounded w-1/2" />
          </div>
        )}

        {/* ───── Permisos / vencimientos ───── */}
        {v && (v.tech_inspection_expiry || v.circulation_permit_expiry || v.emissions_expiry) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {([
              ['Rev. técnica', v.tech_inspection_expiry],
              ['Permiso circulación', v.circulation_permit_expiry],
              ['Gases', v.emissions_expiry],
            ] as [string, string | undefined][]).map(([label, iso]) => {
              const st = expiryState(iso);
              if (!st) return null;
              return (
                <span
                  key={label}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border',
                    st.tone === 'danger' && 'bg-red-50 border-red-200 text-red-600',
                    st.tone === 'warn' && 'bg-amber-50 border-amber-200 text-amber-700',
                    st.tone === 'ok' && 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  )}
                >
                  {st.tone !== 'ok' && <ShieldAlert className="w-3 h-3" />}
                  {label}: {st.tone === 'ok' ? fmtDate(iso) : st.label}
                </span>
              );
            })}
          </div>
        )}

        {/* ───── Resumen financiero ───── */}
        {data && (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {data.isConsigned ? 'Precio acordado' : 'Costo adquisición'}
                </p>
                <p className="text-[14px] font-semibold text-slate-700 mt-0.5">
                  {fmtCLP(
                    data.isConsigned
                      ? data.acquisition?.agreed_price
                      : data.acquisition?.purchase_price
                  )}
                </p>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {isSold ? 'Precio venta' : 'Precio publicado'}
                </p>
                <p className="text-[14px] font-semibold text-slate-700 mt-0.5">
                  {fmtCLP(isSold ? data.sale?.sale_price : price)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100">
              <div className="px-3 py-2.5 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Gastos</p>
                  <p className="text-[13px] font-medium text-slate-600 mt-0.5">{fmtCLP(data.expensesTotal)}</p>
                </div>
              </div>
              <div className="px-3 py-2.5 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">Ingresos extra</p>
                  <p className="text-[13px] font-medium text-slate-600 mt-0.5">{fmtCLP(data.incomeTotal)}</p>
                </div>
              </div>
            </div>

            {/* Margen neto destacado */}
            <div
              className={cn(
                'px-3 py-3 border-t flex items-center justify-between',
                (profit?.netProfit ?? 0) >= 0
                  ? 'bg-emerald-50/70 border-emerald-100'
                  : 'bg-rose-50/70 border-rose-100'
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500">
                  {profit?.isExpected ? 'Margen estimado' : 'Margen real'}
                </span>
                {data.documentsCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                    · <FileText className="w-3 h-3" /> {data.documentsCount} doc
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[16px] font-bold',
                  (profit?.netProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {fmtCLP(profit?.netProfit)}
              </span>
            </div>
          </div>
        )}

        {/* ───── Acciones recomendadas ───── */}
        <div className="mt-4">
          <p className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            Acciones recomendadas
          </p>
          <div className="flex flex-wrap gap-2">
            {actions.map((a, i) => {
              const Icon = a.icon;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (a.local === 'sale' && onRegisterSale) return onRegisterSale();
                    if (a.local === 'docs' && onViewDocuments) return onViewDocuments();
                    return onAction(a.msg);
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium border transition-all active:scale-[0.97]',
                    a.tone === 'primary'
                      ? 'bg-gradient-to-r from-primary to-cyan-500 text-white border-transparent hover:shadow-md hover:shadow-primary/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-cyan-200 hover:text-cyan-700 hover:shadow-sm'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {a.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
