import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Eye, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type TopViewedItem = {
  name: string;
  visits: number;
};

interface TopViewedVehiclesProps {
  brandsData: TopViewedItem[];
  categoriesData: TopViewedItem[];
  loading: boolean;
}

type ViewType = 'brand' | 'category';

// Slate gradient for bars
const BAR_GRADIENT = { start: '#64748b', end: '#475569' };

// Custom Y-axis tick - simple single line, full text
const CustomYAxisTick = ({ x, y, payload }: any) => {
  const name = payload.value || '';

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-8}
        y={4}
        textAnchor="end"
        fill="#1e293b"
        fontSize={11}
        fontWeight={600}
      >
        {name.length > 24 ? name.substring(0, 22) + '...' : name}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-lg">
        <p className="font-bold text-sm sm:text-base text-slate-800 mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-500" />
          <p className="text-slate-600 font-semibold text-sm">
            {payload[0]?.value?.toLocaleString()} visitas
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const TopViewedVehicles: React.FC<TopViewedVehiclesProps> = ({
  brandsData,
  categoriesData,
  loading,
}) => {
  const [viewType, setViewType] = useState<ViewType>('brand');

  const SkeletonLoader = () => (
    <div className="space-y-2 sm:space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 sm:gap-3">
          <div className="w-16 sm:w-24 h-3 sm:h-4 bg-slate-200 rounded animate-pulse" />
          <div className="flex-1 h-6 sm:h-8 bg-slate-100 rounded animate-pulse" style={{ width: `${100 - i * 10}%` }} />
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-xl bg-white border border-slate-200/60">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="bg-slate-100 rounded-lg p-2">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
            </div>
            <div className="h-5 sm:h-6 w-28 sm:w-36 bg-slate-200 rounded animate-pulse" />
          </div>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  const chartData = viewType === 'brand' ? brandsData : categoriesData;

  const title = viewType === 'brand' ? 'Marcas Mas Vistas' : 'Tipos Mas Vistos';
  const description = 'Top 10 entre todas las automotoras';

  // Calculate total visits
  const totalVisits = chartData.reduce((acc, item) => acc + item.visits, 0);

  // Find top performer
  const topPerformer = chartData[0];

  return (
    <div className="rounded-xl bg-white border border-slate-200/60">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-slate-100 rounded-lg p-2">
              <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">{description}</p>
            </div>
          </div>

          {/* Toggle buttons */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 self-start sm:self-auto">
            <button
              onClick={() => setViewType('brand')}
              className={cn(
                'px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-full transition-all duration-200',
                viewType === 'brand'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              )}
            >
              Marca
            </button>
            <button
              onClick={() => setViewType('category')}
              className={cn(
                'px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-full transition-all duration-200',
                viewType === 'category'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              )}
            >
              Tipo
            </button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span className="text-[10px] sm:text-xs text-slate-400">Total Visitas</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-slate-800">{totalVisits.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span className="text-[10px] sm:text-xs text-slate-400">Lider</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-slate-800 truncate">
              {topPerformer?.name || '-'}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[280px] sm:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={160}
                axisLine={false}
                tickLine={false}
                tick={<CustomYAxisTick />}
                interval={0}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              />
              <Bar
                dataKey="visits"
                radius={[4, 4, 4, 4]}
                barSize={18}
                fill="url(#viewGradient)"
              />
              <defs>
                <linearGradient
                  id="viewGradient"
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

export default TopViewedVehicles;
