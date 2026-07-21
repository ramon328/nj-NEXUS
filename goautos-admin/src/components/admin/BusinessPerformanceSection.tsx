import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useSalesStats } from '@/hooks/admin/useSalesStats';
import { useVisitStats } from '@/hooks/admin/useVisitStats';
import { useMonthlyInventoryValue } from '@/hooks/admin/useMonthlyInventoryValue';
import { useInventoryValue } from '@/hooks/admin/useInventoryValue';
import { buildPerformanceSeries } from '@/hooks/admin/utils/deltaAndMerge';
import { DateFilter } from '@/hooks/admin/useSellerPerformance';
import { Calendar } from 'lucide-react';
import BusinessPerformanceChart from './BusinessPerformanceChart';

type TimeKey = 'last7' | 'month' | 'year' | 'all';

interface Props {
  globalDateFilter: DateFilter;
  globalData: { month: string; sales: number; costs: number; margin: number; inventory: number }[];
  globalLoading: boolean;
  title: string;
  subtitle: string;
}

const MONTH_MAP: Record<string, number> = {
  Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5,
  Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11,
};

function parseMonthKey(key: string): Date | null {
  const parts = key.split(' ');
  if (parts.length !== 2) return null;
  const monthIdx = MONTH_MAP[parts[0]];
  if (monthIdx === undefined) return null;
  const year = 2000 + parseInt(parts[1], 10);
  return new Date(year, monthIdx, 1);
}

function filterMonthly<T extends { month: string }>(data: T[], filter: 'year' | 'all'): T[] {
  if (filter === 'all') return data;
  const cutoff = new Date(new Date().getFullYear(), 0, 1);
  return data.filter(p => {
    const d = parseMonthKey(p.month);
    return d && d >= cutoff;
  });
}

export default function BusinessPerformanceSection({
  globalDateFilter,
  globalData,
  globalLoading,
  title,
  subtitle,
}: Props) {
  const { i18n } = useTranslation();
  const { clientId } = useAuth();
  const clientIdNumber = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  const [localTimeFilter, setLocalTimeFilter] = useState<TimeKey | null>('all');

  const cf = globalDateFilter.consignmentFilter;

  // ── 1. All-time MONTHLY data (for "year" and "all" pills) ──
  const allTimeFilter = useMemo<DateFilter>(() => ({ consignmentFilter: cf }), [cf]);

  const { monthlyData: allMonthly, loading: allSalesLoading } = useSalesStats(clientIdNumber, allTimeFilter, false, false);
  const { monthlyVisits: allVisits, loading: allVisitsLoading } = useVisitStats(clientIdNumber, allTimeFilter);
  const { monthlyInventory: allInv } = useMonthlyInventoryValue(clientIdNumber, allTimeFilter);
  const { inventoryValue: allInvValue } = useInventoryValue(clientIdNumber, allTimeFilter);

  const allTimeSeries = useMemo(() => {
    const perf = buildPerformanceSeries(allMonthly || [], allVisits || []);
    return perf.map(p => ({ ...p, inventory: allInv[p.month] ?? allInvValue ?? 0 }));
  }, [allMonthly, allVisits, allInv, allInvValue]);

  const allTimeLoading = allSalesLoading || allVisitsLoading;

  // ── 2. Current-month DAILY data (for "month" and "7d" pills) ──
  const now = useMemo(() => new Date(), []);
  const dailyFilter = useMemo<DateFilter>(() => ({
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: now,
    consignmentFilter: cf,
  }), [cf, now]);

  const { monthlyData: dailyMonthly, loading: dailySalesLoading } = useSalesStats(clientIdNumber, dailyFilter, false, true);
  const { monthlyVisits: dailyVisits, loading: dailyVisitsLoading } = useVisitStats(clientIdNumber, dailyFilter);
  const { monthlyInventory: dailyInv } = useMonthlyInventoryValue(clientIdNumber, dailyFilter);

  const dailySeries = useMemo(() => {
    const perf = buildPerformanceSeries(dailyMonthly || [], dailyVisits || []);
    return perf.map((p, i) => {
      // For daily data, try ISO key match first
      const start = dailyFilter.startDate;
      let inv = allInvValue ?? 0;
      if (start) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const isoKey = d.toISOString().slice(0, 10);
        inv = dailyInv[isoKey] ?? dailyInv[p.month] ?? allInvValue ?? 0;
      }
      return { ...p, inventory: inv };
    });
  }, [dailyMonthly, dailyVisits, dailyInv, dailyFilter, allInvValue]);

  const dailyLoading = dailySalesLoading || dailyVisitsLoading;

  // ── Select data based on pill ──
  const data = useMemo(() => {
    if (localTimeFilter === null) return globalData;
    if (localTimeFilter === 'all' || localTimeFilter === 'year') {
      return filterMonthly(allTimeSeries, localTimeFilter);
    }
    if (localTimeFilter === 'last7') {
      return dailySeries.slice(-7);
    }
    // month
    return dailySeries;
  }, [localTimeFilter, globalData, allTimeSeries, dailySeries]);

  const loading = useMemo(() => {
    if (localTimeFilter === null) return globalLoading;
    if (localTimeFilter === 'all' || localTimeFilter === 'year') return allTimeLoading;
    return dailyLoading;
  }, [localTimeFilter, globalLoading, allTimeLoading, dailyLoading]);

  const timeOptions: { key: TimeKey; label: string }[] = [
    { key: 'last7', label: dv('1 sem', '1w') },
    { key: 'month', label: dv('Mes', 'Mo') },
    { key: 'year', label: dv('Año', 'Yr') },
    { key: 'all', label: dv('Todo', 'All') },
  ];

  const localLabel = !localTimeFilter
    ? subtitle
    : localTimeFilter === 'all'
      ? dv('Todo el tiempo', 'All time')
      : localTimeFilter === 'year'
        ? dv('Este año', 'This year')
        : localTimeFilter === 'last7'
          ? dv('1 semana', '1 week')
          : dv('Este mes', 'This month');

  const filterPills = (
    <div className="flex items-center gap-1 bg-slate-100/80 rounded-lg p-0.5 shrink-0">
      <button
        onClick={() => setLocalTimeFilter(null)}
        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
          localTimeFilter === null
            ? 'bg-white text-slate-900 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.08)]'
            : 'text-slate-500 hover:text-slate-700'
        }`}
        title={dv('Usar filtro global', 'Use global filter')}
      >
        <Calendar className="h-3 w-3" />
      </button>
      {timeOptions.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setLocalTimeFilter(key)}
          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
            localTimeFilter === key
              ? 'bg-white text-slate-900 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.08)]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <BusinessPerformanceChart
      loading={loading}
      data={data}
      title={title}
      subtitle={localLabel}
      headerRight={filterPills}
    />
  );
}
