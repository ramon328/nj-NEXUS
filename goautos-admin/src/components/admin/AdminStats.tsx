import React, { useEffect, useState } from 'react';
import {
  CircleDollarSign,
  Car,
  Receipt,
  Warehouse,
  TrendingUp,
  Target,
  UserPlus,
  Handshake,
  Globe,
  Clock,
  BadgeDollarSign,
  HandCoins,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { AdminDashboardStats } from '@/hooks/admin/types';
import { BusinessKpis } from '@/hooks/admin/useBusinessKpis';

type KpiColor = {
  iconBg: string;
  iconText: string;
  dot: string;
};

const KPI_COLORS = {
  sales:       { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
  expenses:    { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
  margin:      { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
  inventory:   { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
  vehicles:    { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
  leads:       { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
  rate:        { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
  commissions: { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
  profit:      { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
  stock:       { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
  published:   { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
  days:        { iconBg: 'bg-slate-100', iconText: 'text-slate-600', dot: '#94a3b8' },
} as const;

export type ComercialKpiKey = 'ventas_totales' | 'gastos_totales' | 'margen_bruto' | 'valor_inventario';

interface AdminStatsProps {
  mode?: 'resumen' | 'ventas' | 'inventario' | 'finance';
  stats: AdminDashboardStats;
  kpis?: BusinessKpis;
  totals?: { sales: number; expenses: number; commissions: number };
  loading: boolean;
  totalNetProfit?: number;
  netProfitLoading?: boolean;
  inventoryValue?: number;
  inventoryValueLoading?: boolean;
  visibleKpis?: ComercialKpiKey[];
  ownStockCount?: number;
  ownStockValue?: number;
  consignedStockCount?: number;
  consignedStockValue?: number;
  publishedStockCount?: number;
  publishedStockValue?: number;
  prevTotals?: { prevSales: number | null; prevExpenses: number | null; prevMargin: number | null };
  comparisonLabel?: string;
}

/* ── Snapshot hook ──
 * Returns null while loading (→ skeleton), commits values once loading=false.
 * Also updates if values change while already loaded (e.g. sub-hook resolves late).
 */
function useSnapshot(values: string[], loading: boolean): string[] | null {
  const [snapshot, setSnapshot] = useState<string[] | null>(null);
  const serialized = JSON.stringify(values);

  useEffect(() => {
    if (loading) return;
    setSnapshot((prev) => {
      if (prev && JSON.stringify(prev) === serialized) return prev;
      return JSON.parse(serialized) as string[];
    });
  }, [loading, serialized]);

  return loading ? null : snapshot;
}

interface StatCardProps {
  title: string;
  value: string | undefined;
  icon: React.ReactNode;
  tooltip?: string;
  color?: KpiColor;
  badge?: string;
  subValue?: string;
  trend?: { percent: number; label: string } | null;
}

const StatCard = ({ title, value, icon, tooltip, color, badge, subValue, trend }: StatCardProps) => {
  const showSkeleton = value === undefined;
  const dotColor = color?.dot ?? '#64748b';

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={cn(
            'rounded-2xl bg-white overflow-hidden relative cursor-help',
            'min-w-[88%] shrink-0 snap-start',
            'border border-slate-200/60',
            'sm:min-w-0 sm:shrink',
          )}>
            {/* ── Dot mesh pattern — mobile only ── */}
            <div
              className='absolute inset-0 pointer-events-none sm:hidden'
              style={{
                backgroundImage: `radial-gradient(circle, ${dotColor}30 1.5px, transparent 1.5px)`,
                backgroundSize: '18px 18px',
              }}
            />
            {/* ── Gradient glow — bottom-right corner, mobile only ── */}
            <div
              className='absolute inset-0 pointer-events-none sm:hidden'
              style={{
                background: `radial-gradient(circle at 100% 100%, ${dotColor}22, transparent 50%)`,
              }}
            />

            {/* ── Mobile layout ── */}
            <CardContent className='sm:hidden p-5 pb-6 flex flex-col gap-3 relative'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5'>
                  <p className='text-[13px] text-slate-500 font-medium'>{title}</p>
                  {badge && (
                    <span className='text-[13px] font-bold text-slate-900 tabular-nums'>{badge}</span>
                  )}
                </div>
                <div className={cn(
                  'h-10 w-10 rounded-xl flex items-center justify-center',
                  color?.iconBg ?? 'bg-primary/8',
                  color?.iconText ?? 'text-primary'
                )}>
                  {icon}
                </div>
              </div>
              <h4 className='text-[28px] font-bold tracking-tight text-slate-900 leading-none tabular-nums'>
                {showSkeleton
                  ? <span className='inline-block w-28 h-8 bg-slate-100 animate-pulse rounded-lg' />
                  : value}
              </h4>
              {!showSkeleton && subValue && (
                <p className='text-sm font-semibold text-slate-700 tabular-nums -mt-1'>{subValue}</p>
              )}
              {trend ? (
                <p className={cn('text-xs font-medium', trend.percent >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {trend.percent >= 0 ? '↑' : '↓'} {Math.abs(trend.percent).toFixed(1)}%
                </p>
              ) : (
                <p className='text-xs invisible' aria-hidden>-</p>
              )}
            </CardContent>

            {/* ── Desktop layout ── */}
            <CardContent className='hidden sm:flex items-start justify-between py-3 px-3 md:py-4 md:px-4'>
              <div className='flex-1 min-w-0'>
                <h4 className='font-semibold text-lg md:text-xl tracking-tight text-slate-900 truncate tabular-nums'>
                  {showSkeleton
                    ? <span className='inline-block w-28 h-8 bg-slate-100 animate-pulse rounded-lg' />
                    : value}
                  {!showSkeleton && subValue && (
                    <span className='ml-2 text-sm font-semibold text-slate-600 tabular-nums'>{subValue}</span>
                  )}
                </h4>
                <div className='flex items-baseline gap-2 mt-0.5'>
                  <p className='text-[13px] text-slate-500'>{title}</p>
                  {badge && (
                    <span className='text-[13px] font-bold text-slate-900 tabular-nums'>{badge}</span>
                  )}
                  {trend ? (
                    <p className={cn('text-xs font-medium', trend.percent >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                      {trend.percent >= 0 ? '↑' : '↓'} {Math.abs(trend.percent).toFixed(1)}%
                    </p>
                  ) : (
                    <p className='text-xs invisible' aria-hidden>-</p>
                  )}
                </div>
              </div>
              <div className='shrink-0'>
                <div className={cn(
                  'h-9 w-9 rounded-xl flex items-center justify-center',
                  color?.iconBg ?? 'bg-primary/8',
                  color?.iconText ?? 'text-primary'
                )}>
                  {icon}
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent
            side='bottom'
            align='center'
            sideOffset={6}
            className='w-[var(--radix-tooltip-trigger-width)] rounded-xl bg-slate-900 text-white border-0 px-3 py-2.5'
          >
            <p className='text-[12px] leading-relaxed'>{tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

function calcTrend(current: number, prev: number | null | undefined, label?: string): { percent: number; label: string } | null {
  if (prev == null || prev === 0 || !label) return null;
  // Si el período anterior fue negativo, el % de cambio es engañoso — no mostrar tendencia
  if (prev < 0) return null;
  const percent = ((current - prev) / Math.abs(prev)) * 100;
  return { percent, label };
}

// ── Subcomponentes por modo (cada uno con su propio useSnapshot, sin
//    violar las reglas de hooks por llamadas condicionales) ──

const ResumenStats: React.FC<AdminStatsProps> = ({
  stats,
  loading,
  inventoryValue = 0,
  inventoryValueLoading = false,
  visibleKpis,
  prevTotals,
  comparisonLabel,
}) => {
  const { formatPrice } = useCurrency();
  const { t: tDashboard } = useTranslation('dashboard');

  const show = (key: ComercialKpiKey) => !visibleKpis || visibleKpis.includes(key);
  const allLoading = loading || inventoryValueLoading;

  const grossMarginPctLabel = `${stats.grossMarginPct.toFixed(1)}%`;

  const currentValues = [
    formatPrice(stats.totalSales),
    formatPrice(stats.costOfSales),
    formatPrice(stats.grossMargin),
    grossMarginPctLabel,
    formatPrice(inventoryValue),
  ];
  const snap = useSnapshot(currentValues, allLoading);

  const salesTrend = calcTrend(stats.totalSales, prevTotals?.prevSales, comparisonLabel);
  const expensesTrend = calcTrend(stats.costOfSales, prevTotals?.prevExpenses, comparisonLabel);
  const marginTrend = calcTrend(stats.grossMargin, prevTotals?.prevMargin, comparisonLabel);

  return (
    <>
      {show('ventas_totales') && (
        <StatCard title={tDashboard('stats.totalSales')} value={snap?.[0]}
          icon={<CircleDollarSign className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.totalSales')} color={KPI_COLORS.sales}
          trend={salesTrend} />
      )}
      {show('gastos_totales') && (
        <StatCard title={tDashboard('stats.totalExpenses')} value={snap?.[1]}
          icon={<Receipt className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.totalExpenses')} color={KPI_COLORS.expenses}
          trend={expensesTrend} />
      )}
      {show('margen_bruto') && (
        <StatCard title={tDashboard('stats.grossMargin')} value={snap?.[2]}
          subValue={snap?.[3]}
          icon={<TrendingUp className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.grossMargin')} color={KPI_COLORS.margin}
          trend={marginTrend} />
      )}
      {show('valor_inventario') && (
        <StatCard title={tDashboard('stats.inventoryValue')} value={snap?.[4]}
          icon={<Warehouse className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.inventoryValue')} color={KPI_COLORS.inventory} />
      )}
    </>
  );
};

const VentasStats: React.FC<AdminStatsProps> = ({ stats, kpis, totals, loading }) => {
  const { formatPrice } = useCurrency();
  const { t: tDashboard } = useTranslation('dashboard');

  const currentValues = [
    formatPrice(totals?.sales || stats.totalSales),
    (kpis?.vehiclesSold.value || 0).toLocaleString(),
    (kpis?.newLeads.value || 0).toLocaleString(),
    `${((kpis?.closingRate.value || 0) * 100).toFixed(1)}%`,
  ];
  const snap = useSnapshot(currentValues, loading);

  return (
    <>
      <StatCard title={tDashboard('stats.totalSales')} value={snap?.[0]}
        icon={<CircleDollarSign className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.totalSales')} color={KPI_COLORS.sales} />
      <StatCard title={tDashboard('stats.vehiclesSold')} value={snap?.[1]}
        icon={<Car className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.vehiclesSold')} color={KPI_COLORS.vehicles} />
      <StatCard title={tDashboard('stats.newLeads')} value={snap?.[2]}
        icon={<UserPlus className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.newLeads')} color={KPI_COLORS.leads} />
      <StatCard title={tDashboard('stats.closingRate')} value={snap?.[3]}
        icon={<Target className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.closingRate')} color={KPI_COLORS.rate} />
    </>
  );
};

const InventarioStats: React.FC<AdminStatsProps> = ({
  kpis,
  loading,
  ownStockCount = 0,
  ownStockValue = 0,
  consignedStockCount = 0,
  consignedStockValue = 0,
  publishedStockCount = 0,
  publishedStockValue = 0,
}) => {
  const { formatPrice } = useCurrency();
  const { t: tDashboard } = useTranslation('dashboard');

  const currentValues = [
    formatPrice(ownStockValue),
    formatPrice(consignedStockValue),
    formatPrice(publishedStockValue),
    `${(kpis?.avgDaysInStock.value || 0).toFixed(0)} días`,
  ];
  const snap = useSnapshot(currentValues, loading);

  return (
    <>
      <StatCard title={tDashboard('stats.ownStock')} value={snap?.[0]}
        badge={ownStockCount.toLocaleString()}
        icon={<Car className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.ownStock')} color={KPI_COLORS.stock} />
      <StatCard title={tDashboard('stats.consignedVehicles')} value={snap?.[1]}
        badge={consignedStockCount.toLocaleString()}
        icon={<Handshake className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.consignedVehicles')} color={KPI_COLORS.inventory} />
      <StatCard title={tDashboard('stats.publishedVehicles')} value={snap?.[2]}
        badge={publishedStockCount.toLocaleString()}
        icon={<Globe className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.publishedVehicles')} color={KPI_COLORS.published} />
      <StatCard title={tDashboard('stats.avgDaysInStock')} value={snap?.[3]}
        icon={<Clock className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.avgDaysInStock')} color={KPI_COLORS.days} />
    </>
  );
};

const FinanceStats: React.FC<AdminStatsProps> = ({
  stats,
  totals,
  loading,
  totalNetProfit = 0,
  netProfitLoading = false,
}) => {
  const { formatPrice } = useCurrency();
  const { t: tDashboard } = useTranslation('dashboard');

  const allLoading = loading || netProfitLoading;
  const currentValues = [
    formatPrice(totalNetProfit),
    formatPrice(totals?.sales || stats.totalSales),
    formatPrice(totals?.expenses || stats.totalExpenses),
    formatPrice(totals?.commissions || stats.totalCommissions),
  ];
  const snap = useSnapshot(currentValues, allLoading);

  return (
    <>
      <StatCard title={tDashboard('stats.totalNetProfit')} value={snap?.[0]}
        icon={<BadgeDollarSign className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.totalNetProfit')} color={KPI_COLORS.profit} />
      <StatCard title={tDashboard('stats.totalSales')} value={snap?.[1]}
        icon={<CircleDollarSign className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.totalSales')} color={KPI_COLORS.sales} />
      <StatCard title={tDashboard('stats.totalExpenses')} value={snap?.[2]}
        icon={<Receipt className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.totalExpenses')} color={KPI_COLORS.expenses} />
      <StatCard title={tDashboard('stats.commissions')} value={snap?.[3]}
        icon={<HandCoins className='h-5 w-5' />} tooltip={tDashboard('stats.tooltips.commissions')} color={KPI_COLORS.commissions} />
    </>
  );
};

const AdminStats: React.FC<AdminStatsProps> = (props) => {
  const mode = props.mode ?? 'resumen';
  if (mode === 'resumen') return <ResumenStats {...props} />;
  if (mode === 'ventas') return <VentasStats {...props} />;
  if (mode === 'inventario') return <InventarioStats {...props} />;
  if (mode === 'finance') return <FinanceStats {...props} />;
  return null;
};

export default AdminStats;
