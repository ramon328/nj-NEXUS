import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Building2, Trophy, Eye, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

type TopViewedDealer = {
  id: number;
  name: string;
  total_visits: number;
  total_vehicles: number;
  avg_visits_per_vehicle: number;
};

type TopSellingDealer = {
  name: string;
  total_sold: number;
};

interface DealerPerformanceProps {
  viewData: TopViewedDealer[];
  sellData: TopSellingDealer[];
  loading: boolean;
}

type ViewType = 'sells' | 'views';

// Flat slate gradient for bars
const BAR_GRADIENT = { start: '#64748b', end: '#475569' };

const CustomTooltip = ({ active, payload, label, isSellView }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200/60 rounded-xl p-3 sm:p-4 shadow-lg min-w-[160px]">
        <p className="font-bold text-sm sm:text-base text-slate-900 mb-2 truncate max-w-[180px]">{label}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <p className="font-semibold text-sm text-slate-700">
              {data.value?.toLocaleString()} {isSellView ? 'ventas' : 'visitas'}
            </p>
          </div>
          {!isSellView && data.vehicles && (
            <>
              <p className="text-slate-500 text-xs sm:text-sm">
                Vehículos: {data.vehicles}
              </p>
              <p className="text-slate-500 text-xs sm:text-sm">
                Promedio: {data.avgVisits?.toFixed(1)} visitas/vehículo
              </p>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const TopViewedDealers: React.FC<DealerPerformanceProps> = ({
  viewData,
  sellData,
  loading,
}) => {
  const [viewType, setViewType] = useState<ViewType>('sells');

  const SkeletonLoader = () => (
    <div className="space-y-2 sm:space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 sm:gap-3">
          <div className="w-24 sm:w-36 h-3 sm:h-4 bg-slate-200 rounded animate-pulse" />
          <div className="flex-1 h-6 sm:h-8 bg-slate-100 rounded animate-pulse" style={{ width: `${100 - i * 12}%` }} />
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="bg-slate-100 rounded-lg p-2">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
            </div>
            <div className="h-5 sm:h-6 w-36 sm:w-48 bg-slate-200 rounded animate-pulse" />
          </div>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  const isSellView = viewType === 'sells';

  const chartData = isSellView
    ? sellData.map((dealer) => ({
        name: dealer.name,
        value: dealer.total_sold,
      }))
    : viewData.map((dealer) => ({
        name: dealer.name,
        value: dealer.total_visits,
        vehicles: dealer.total_vehicles,
        avgVisits: dealer.avg_visits_per_vehicle,
      }));

  const title = isSellView ? 'Top Automotoras por Ventas' : 'Top Automotoras por Visitas';

  // Find top performer
  const topPerformer = chartData[0];
  const totalValue = chartData.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200/60">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-slate-100 rounded-lg p-2">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
              <p className="text-[10px] sm:text-xs text-slate-500">Top 10 por rendimiento</p>
            </div>
          </div>

          {/* Toggle buttons */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 self-start sm:self-auto">
            <button
              onClick={() => setViewType('sells')}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-full transition-colors',
                viewType === 'sells'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              )}
            >
              <ShoppingCart className="h-3 w-3" />
              Ventas
            </button>
            <button
              onClick={() => setViewType('views')}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-full transition-colors',
                viewType === 'views'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              )}
            >
              <Eye className="h-3 w-3" />
              Vistas
            </button>
          </div>
        </div>

        {/* Top performer highlight */}
        {topPerformer && (
          <div className="mb-4 sm:mb-6 bg-slate-50 border border-slate-200/60 rounded-xl p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-slate-100 rounded-lg p-2">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wide font-medium">Líder</p>
                <p className="text-sm sm:text-lg font-bold text-slate-900 truncate">{topPerformer.name}</p>
              </div>
              <div className="text-right">
                <p className="text-lg sm:text-2xl font-bold text-slate-800">{topPerformer.value.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-slate-500">{isSellView ? 'ventas' : 'visitas'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-3">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Total {isSellView ? 'Ventas' : 'Visitas'}</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{totalValue.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-3">
            <p className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Automotoras</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{chartData.length}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[220px] sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: '#64748b',
                  fontSize: 9,
                  fontWeight: 500,
                }}
                style={{ textAnchor: 'end' }}
              />
              <Tooltip
                content={<CustomTooltip isSellView={isSellView} />}
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              />
              <Bar
                dataKey="value"
                radius={[4, 4, 4, 4]}
                barSize={16}
                fill="url(#dealerGradient)"
              />
              <defs>
                <linearGradient
                  id="dealerGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor={BAR_GRADIENT.start} />
                  <stop offset="100%" stopColor={BAR_GRADIENT.end} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TopViewedDealers;
