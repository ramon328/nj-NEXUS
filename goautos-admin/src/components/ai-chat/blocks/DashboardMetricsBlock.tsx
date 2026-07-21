import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useVehicleStats } from '@/hooks/admin/useVehicleStats';
import { useSalesStats } from '@/hooks/admin/useSalesStats';
import { useLatestLeads } from '@/hooks/admin/useLatestLeads';
import { cn } from '@/lib/utils';
import {
  Car,
  Globe,
  Handshake,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  ArrowRight,
} from 'lucide-react';

interface DashboardMetricsBlockProps {
  onAction: (msg: string) => void;
}

const fmtCLP = (v?: number | null) => {
  if (v == null) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(v);
};

const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'slate',
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: 'slate' | 'emerald' | 'rose' | 'cyan';
  loading?: boolean;
}) {
  const toneMap = {
    slate: 'text-slate-500 bg-slate-50 border-slate-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    rose: 'text-rose-600 bg-rose-50 border-rose-100',
    cyan: 'text-cyan-600 bg-cyan-50 border-cyan-100',
  } as const;

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="flex items-center gap-2">
        <div className={cn('w-7 h-7 rounded-lg border flex items-center justify-center shrink-0', toneMap[tone])}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-[11px] uppercase tracking-wide text-slate-400 leading-tight">{label}</p>
      </div>
      {loading ? (
        <div className="h-6 mt-2 bg-slate-100 rounded animate-pulse w-2/3" />
      ) : (
        <p className="text-[20px] font-bold text-slate-800 mt-1.5 leading-none">{value}</p>
      )}
      {sub != null && !loading && (
        <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
      )}
    </div>
  );
}

export function DashboardMetricsBlock({ onAction }: DashboardMetricsBlockProps) {
  const { clientId } = useAuth();

  // Filtro "este mes": del día 1 a ahora.
  const monthFilter = useMemo(() => {
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: now,
    };
  }, []);

  const monthName = MONTHS_ES[monthFilter.startDate.getMonth()];

  const stock = useVehicleStats(clientId, monthFilter);
  const sales = useSalesStats(clientId, monthFilter);
  const { leads, loading: leadsLoading } = useLatestLeads(clientId, monthFilter, 50);

  const marginPositive = (sales.grossMargin ?? 0) >= 0;

  const actions = [
    { label: 'Ver inventario activo', msg: 'Muéstrame mi inventario activo con detalles' },
    { label: 'Ventas del mes', msg: '¿Cómo van las ventas de este mes? Muéstrame el detalle' },
    { label: 'Leads sin responder', msg: 'Muéstrame los leads pendientes por responder' },
    { label: '¿Qué auto priorizar?', msg: '¿Cuál auto debo priorizar para vender esta semana?' },
  ];

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-50 flex items-center gap-2">
        <span className="text-[13px] font-semibold text-slate-700">Resumen de {monthName}</span>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Kpi
            icon={Car}
            label="Stock activo"
            value={stock.totalVehicles}
            sub={`${stock.consignedVehicles} en consignación`}
            tone="cyan"
            loading={stock.loading}
          />
          <Kpi
            icon={Globe}
            label="Publicados"
            value={stock.publishedVehicles}
            tone="slate"
            loading={stock.loading}
          />
          <Kpi
            icon={Handshake}
            label="Consignados"
            value={stock.consignedVehicles}
            tone="slate"
            loading={stock.loading}
          />
          <Kpi
            icon={CheckCircle2}
            label="Ventas del mes"
            value={sales.vehiclesSoldCount}
            sub={fmtCLP(sales.totalSales)}
            tone="emerald"
            loading={sales.loading}
          />
          <Kpi
            icon={marginPositive ? TrendingUp : TrendingDown}
            label="Margen bruto"
            value={fmtCLP(sales.grossMargin)}
            sub={`${(sales.grossMarginPct ?? 0).toFixed(1)}% sobre ventas`}
            tone={marginPositive ? 'emerald' : 'rose'}
            loading={sales.loading}
          />
          <Kpi
            icon={Users}
            label="Leads del mes"
            value={leads.length}
            tone="cyan"
            loading={leadsLoading}
          />
        </div>

        {/* Acciones recomendadas */}
        <div className="mt-3">
          <p className="text-[11px] font-medium text-slate-400 mb-2 flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            Acciones rápidas
          </p>
          <div className="flex flex-wrap gap-2">
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={() => onAction(a.msg)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-medium border border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:text-cyan-700 hover:shadow-sm transition-all active:scale-[0.97]"
              >
                {a.label}
                <ArrowRight className="w-3 h-3 text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
