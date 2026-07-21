import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useVisitStats } from '@/hooks/admin/useVisitStats';
import { DateFilter } from '@/hooks/admin/useSellerPerformance';
import { Calendar } from 'lucide-react';
import VisitsChart from '@/components/dashboard/VisitsChart';

type TimeKey = 'last7' | 'month' | 'year' | 'all';

interface Props {
  globalDateFilter: DateFilter;
  globalData: { month: string; visits: number; leads: number }[];
  globalLoading: boolean;
}

export default function WebVisitsSection({
  globalDateFilter,
  globalData,
  globalLoading,
}: Props) {
  const { i18n } = useTranslation();
  const { clientId } = useAuth();
  const clientIdNumber = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  const [localTimeFilter, setLocalTimeFilter] = useState<TimeKey | null>('all');

  const cf = globalDateFilter.consignmentFilter;

  // All-time data (for "year" and "all" pills)
  const allTimeFilter = useMemo<DateFilter>(() => ({ consignmentFilter: cf }), [cf]);
  const { monthlyVisits: allVisits, loading: allLoading } = useVisitStats(clientIdNumber, allTimeFilter);

  // Current-month daily data (for "month" and "7d" pills)
  const now = useMemo(() => new Date(), []);
  const dailyFilter = useMemo<DateFilter>(() => ({
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: now,
    consignmentFilter: cf,
  }), [cf, now]);
  const { monthlyVisits: dailyVisits, loading: dailyLoading } = useVisitStats(clientIdNumber, dailyFilter);

  // Filter all-time data by year
  const filterByYear = (data: typeof allVisits) => {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    // Monthly keys are like "Ene 26", "Feb 26"
    const MONTH_MAP: Record<string, number> = {
      Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5,
      Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11,
    };
    return (data || []).filter(p => {
      const parts = p.month.split(' ');
      if (parts.length !== 2) return true;
      const monthIdx = MONTH_MAP[parts[0]];
      if (monthIdx === undefined) return true;
      const year = 2000 + parseInt(parts[1], 10);
      return new Date(year, monthIdx, 1) >= yearStart;
    });
  };

  // Select data based on pill
  const data = useMemo(() => {
    if (localTimeFilter === null) return globalData;
    if (localTimeFilter === 'all') return allVisits || [];
    if (localTimeFilter === 'year') return filterByYear(allVisits);
    if (localTimeFilter === 'last7') return (dailyVisits || []).slice(-7);
    return dailyVisits || []; // month
  }, [localTimeFilter, globalData, allVisits, dailyVisits]);

  const loading = useMemo(() => {
    if (localTimeFilter === null) return globalLoading;
    if (localTimeFilter === 'all' || localTimeFilter === 'year') return allLoading;
    return dailyLoading;
  }, [localTimeFilter, globalLoading, allLoading, dailyLoading]);

  const timeOptions: { key: TimeKey; label: string }[] = [
    { key: 'last7', label: '7d' },
    { key: 'month', label: dv('Mes', 'Mo') },
    { key: 'year', label: dv('Año', 'Yr') },
    { key: 'all', label: dv('Todo', 'All') },
  ];

  const localLabel = !localTimeFilter
    ? undefined
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
    <VisitsChart
      loading={loading}
      monthlyData={data}
      filtroLabel={dv('Visitas', 'Visits')}
      subtitle={localLabel}
      headerRight={filterPills}
    />
  );
}
