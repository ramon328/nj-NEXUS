import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useInventoryPerformance } from '@/hooks/admin/useInventoryPerformance';
import { DateFilter } from '@/hooks/admin/useSellerPerformance';
import { Calendar } from 'lucide-react';
import InventoryPerformanceChart from './InventoryPerformanceChart';
import type { InventoryChartPoint } from './InventoryPerformanceChart';

type TimeKey = 'last7' | 'month' | 'year' | 'all';

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

function filterMonthly(data: InventoryChartPoint[], filter: 'year' | 'all'): InventoryChartPoint[] {
  if (filter === 'all') return data;
  const cutoff = new Date(new Date().getFullYear(), 0, 1);
  return data.filter(p => {
    const d = parseMonthKey(p.month);
    return d && d >= cutoff;
  });
}

interface Props {
  globalDateFilter: DateFilter;
  globalData: InventoryChartPoint[];
  globalLoading: boolean;
  title: string;
  subtitle: string;
}

export default function InventoryPerformanceSection({
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

  const [localTimeFilter, setLocalTimeFilter] = useState<TimeKey | null>(null);

  const cf = globalDateFilter.consignmentFilter;

  // ── 1. All-time MONTHLY data (for "year" and "all" pills) ──
  const allTimeFilter = useMemo<DateFilter>(() => ({ consignmentFilter: cf }), [cf]);
  const { data: allTimeData, loading: allTimeLoading } = useInventoryPerformance(clientIdNumber, allTimeFilter);

  // ── 2. Current-month DAILY data (for "month" and "7d" pills) ──
  const now = useMemo(() => new Date(), []);
  const dailyFilter = useMemo<DateFilter>(() => ({
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: now,
    consignmentFilter: cf,
  }), [cf, now]);
  const { data: dailyData, loading: dailyLoading } = useInventoryPerformance(clientIdNumber, dailyFilter);

  // ── Select data based on pill ──
  const data = useMemo(() => {
    if (localTimeFilter === null) return globalData;
    if (localTimeFilter === 'all' || localTimeFilter === 'year') {
      return filterMonthly(allTimeData, localTimeFilter);
    }
    if (localTimeFilter === 'last7') {
      return dailyData.slice(-7);
    }
    // month
    return dailyData;
  }, [localTimeFilter, globalData, allTimeData, dailyData]);

  const loading = useMemo(() => {
    if (localTimeFilter === null) return globalLoading;
    if (localTimeFilter === 'all' || localTimeFilter === 'year') return allTimeLoading;
    return dailyLoading;
  }, [localTimeFilter, globalLoading, allTimeLoading, dailyLoading]);

  const timeOptions: { key: TimeKey; label: string }[] = [
    { key: 'last7', label: '7d' },
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
          ? dv('Últimos 7 días', 'Last 7 days')
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
    <InventoryPerformanceChart
      loading={loading}
      data={data}
      title={title}
      subtitle={localLabel}
      headerRight={filterPills}
    />
  );
}
