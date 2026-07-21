import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, Car, Users, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TimeRange } from './TimeRangeSelector';

interface TasadorStatsProps {
  tasadorDealers: number;
  tasadorDealersFrequency: { client_id: number; name: string; count: number }[];
  totalTasaciones: number;
  loading: boolean;
  chartHeight?: number;
  timeRange?: TimeRange;
}

// Gradient colors for bars
const GRADIENT_COLORS = [
  { start: '#f59e0b', end: '#d97706' },
  { start: '#06b6d4', end: '#0891b2' },
  { start: '#8b5cf6', end: '#7c3aed' },
  { start: '#10b981', end: '#059669' },
  { start: '#ec4899', end: '#db2777' },
  { start: '#3b82f6', end: '#2563eb' },
  { start: '#f97316', end: '#ea580c' },
  { start: '#14b8a6', end: '#0d9488' },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl p-3 sm:p-4 shadow-2xl">
        <p className="font-bold text-sm sm:text-base text-gray-900 mb-2">{entry.name}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <p className="text-amber-600 font-semibold text-sm">
            {entry.count} tasaciones
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const TasadorStats: React.FC<TasadorStatsProps> = ({
  tasadorDealers,
  tasadorDealersFrequency,
  totalTasaciones,
  loading,
  chartHeight = 280,
}) => {
  const { t } = useTranslation('appraisel');

  const sortedData = [...tasadorDealersFrequency]
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      ...item,
      color: GRADIENT_COLORS[index % GRADIENT_COLORS.length],
    }));

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Background effects */}
      <div className="absolute -right-16 -top-16 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-amber-50 blur-3xl opacity-60" />
      <div className="absolute -left-16 -bottom-16 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-orange-50 blur-3xl opacity-60" />

      <div className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
            <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">{t('title')}</h3>
            <p className="text-[10px] sm:text-xs text-gray-500">Uso del tasador de vehículos</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600" />
              <span className="text-[10px] sm:text-xs text-gray-600">{t('stats.dealersUsed')}</span>
            </div>
            {loading ? (
              <div className="h-6 sm:h-7 w-12 sm:w-16 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="text-lg sm:text-xl font-bold text-gray-900">{tasadorDealers}</p>
            )}
          </div>
          <div className="rounded-lg sm:rounded-xl bg-gray-50 border border-gray-100 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-600" />
              <span className="text-[10px] sm:text-xs text-gray-600">{t('stats.vehiclesAppraised')}</span>
            </div>
            {loading ? (
              <div className="h-6 sm:h-7 w-12 sm:w-16 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="text-lg sm:text-xl font-bold text-gray-900">{totalTasaciones}</p>
            )}
          </div>
        </div>

        {/* Chart section */}
        <div>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
            <h4 className="text-xs sm:text-sm font-semibold text-gray-700">{t('frequency.title')}</h4>
          </div>

          {loading ? (
            <div className="space-y-2 sm:space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-20 sm:w-28 h-3 sm:h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="flex-1 h-5 sm:h-6 bg-gray-100 rounded animate-pulse" style={{ width: `${100 - i * 15}%` }} />
                </div>
              ))}
            </div>
          ) : sortedData.length === 0 ? (
            <div className="h-[180px] sm:h-[220px] flex items-center justify-center text-gray-400 text-xs sm:text-sm">
              {t('frequency.empty')}
            </div>
          ) : (
            <div style={{ width: '100%', height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={sortedData}
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <defs>
                    {sortedData.map((entry, index) => (
                      <linearGradient
                        key={`tasadorGradient-${index}`}
                        id={`tasadorGradient-${index}`}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop offset="0%" stopColor={entry.color.start} />
                        <stop offset="100%" stopColor={entry.color.end} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={90}
                    tick={{ fontSize: 9, fill: '#6b7280', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 4, 4]}
                    barSize={16}
                    label={{
                      position: 'right',
                      fill: '#374151',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {sortedData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.client_id}`}
                        fill={`url(#tasadorGradient-${index})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasadorStats;
