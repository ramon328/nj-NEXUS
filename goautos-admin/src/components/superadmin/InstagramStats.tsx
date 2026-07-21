import React from 'react';
import { useTranslation } from 'react-i18next';
import { Instagram, Users, TrendingUp, Image, Activity } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useUsabilityStats } from '@/hooks/useUsabilityStats';

// Gradient colors for bars
const GRADIENT_COLORS = [
  { start: '#E1306C', end: '#C13584' },
  { start: '#F77737', end: '#E1306C' },
  { start: '#FCAF45', end: '#F77737' },
  { start: '#833AB4', end: '#C13584' },
  { start: '#405DE6', end: '#833AB4' },
  { start: '#5851DB', end: '#405DE6' },
];

const CustomTooltip = ({ active, payload }: any) => {
  const { t } = useTranslation('common');
  const { instagramDealersAvgPostTime } = useUsabilityStats('all');
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    const avg = instagramDealersAvgPostTime.find(
      (d) => d.client_id === entry.client_id
    );
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl p-3 sm:p-4 shadow-2xl">
        <p className="font-bold text-sm text-gray-900 mb-2">{entry.name}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-pink-500" />
            <p className="text-pink-600 font-semibold text-sm">
              {entry.count} {entry.count !== 1 ? t('instagram.stats.publications') : t('instagram.stats.publication')}
            </p>
          </div>
          {avg && avg.avgDays !== null && (
            <p className="text-xs text-gray-500">
              {t('instagram.stats.avgBetweenPosts')} <span className="font-medium text-gray-700">{avg.avgDays.toFixed(1)} {t('instagram.stats.days')}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const InstagramStats: React.FC = () => {
  const { t } = useTranslation('common');
  const {
    instagramDealersFrequency,
    loading,
    instagramDealers,
    totalDealers,
    instagramActiveDealers,
  } = useUsabilityStats('all');

  const sortedData = [...instagramDealersFrequency]
    .sort((a, b) => b.count - a.count)
    .map((item, index) => ({
      ...item,
      color: GRADIENT_COLORS[index % GRADIENT_COLORS.length],
    }));

  const linkedPercentage = totalDealers > 0 ? ((instagramDealers / totalDealers) * 100).toFixed(1) : '0';
  const activePercentage = instagramDealers > 0 ? ((instagramActiveDealers / instagramDealers) * 100).toFixed(1) : '0';

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Background effects */}
      <div className="absolute -right-16 -top-16 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-pink-50 blur-3xl opacity-60" />
      <div className="absolute -left-16 -bottom-16 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-purple-50 blur-3xl opacity-60" />

      <div className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 shadow-lg shadow-pink-500/25">
            <Instagram className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">{t('instagram.stats.title')}</h3>
            <p className="text-[10px] sm:text-xs text-gray-500">{t('instagram.stats.subtitle')}</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-600" />
              <span className="text-[10px] sm:text-xs text-gray-600">{t('instagram.stats.linked')}</span>
            </div>
            {loading ? (
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
            ) : (
              <div className="flex items-baseline gap-1">
                <p className="text-lg sm:text-xl font-bold text-gray-900">{instagramDealers}</p>
                <span className="text-xs text-gray-500">/ {totalDealers}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg sm:rounded-xl bg-gray-50 border border-gray-100 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-pink-600" />
              <span className="text-[10px] sm:text-xs text-gray-600">{t('instagram.stats.linkPercentage')}</span>
            </div>
            {loading ? (
              <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="text-lg sm:text-xl font-bold text-pink-600">{linkedPercentage}%</p>
            )}
          </div>

          <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
              <span className="text-[10px] sm:text-xs text-gray-600">{t('instagram.stats.active30d')}</span>
            </div>
            {loading ? (
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
            ) : (
              <div className="flex items-baseline gap-1">
                <p className="text-lg sm:text-xl font-bold text-gray-900">{instagramActiveDealers}</p>
                <span className="text-xs text-gray-500">/ {instagramDealers}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg sm:rounded-xl bg-gray-50 border border-gray-100 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Image className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-600" />
              <span className="text-[10px] sm:text-xs text-gray-600">{t('instagram.stats.activePercentage')}</span>
            </div>
            {loading ? (
              <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
            ) : (
              <p className="text-lg sm:text-xl font-bold text-purple-600">{activePercentage}%</p>
            )}
          </div>
        </div>

        {/* Info note */}
        <div className="mb-4 sm:mb-6 p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-100">
          <p className="text-[10px] sm:text-xs text-gray-500">
            <span className="font-medium text-gray-700">ℹ️</span> {t('instagram.stats.note')}
          </p>
        </div>

        {/* Chart section */}
        <div>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
            <h4 className="text-xs sm:text-sm font-semibold text-gray-700">{t('instagram.stats.chartTitle')}</h4>
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
            <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-gray-400 text-xs sm:text-sm">
              {t('instagram.stats.noData')}
            </div>
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={sortedData}
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <defs>
                    {sortedData.map((entry, index) => (
                      <linearGradient
                        key={`instagramGradient-${index}`}
                        id={`instagramGradient-${index}`}
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
                        fill={`url(#instagramGradient-${index})`}
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

export default InstagramStats;
