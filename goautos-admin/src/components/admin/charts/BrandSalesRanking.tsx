import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrandModelMetrics } from '@/hooks/admin/types/inventoryAnalytics';
import { BrandDistribution } from '@/hooks/admin/types';
import { useCurrency } from '@/hooks/useCurrency';
import { ChevronDown, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

interface BrandSalesRankingProps {
  loading: boolean;
  data: BrandModelMetrics[];
  brandDistribution?: BrandDistribution[];
  totalVehicles?: number;
}

type SortKey = 'totalSold' | 'avgDaysFromCreation' | 'avgMargin' | 'totalProfit';

const SORT_OPTIONS: { key: SortKey; esLabel: string; enLabel: string }[] = [
  { key: 'totalSold', esLabel: 'Más vendidas', enLabel: 'Most sold' },
  { key: 'avgMargin', esLabel: 'Mayor margen', enLabel: 'Best margin' },
  { key: 'totalProfit', esLabel: 'Más rentables', enLabel: 'Most profit' },
  { key: 'avgDaysFromCreation', esLabel: 'Más rápidas', enLabel: 'Fastest' },
];

const DONUT_COLORS = ['#0ea5e9', '#38bdf8', '#7dd3fc', '#3b82f6', '#93c5fd', '#818cf8', '#bae6fd', '#cbd5e1'];

const BrandSalesRanking: React.FC<BrandSalesRankingProps> = ({
  loading,
  data,
  brandDistribution,
  totalVehicles = 0,
}) => {
  const { i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);
  const [sortKey, setSortKey] = useState<SortKey>('totalSold');
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-36 bg-slate-100 animate-pulse rounded-lg" />
          <div className="h-8 w-64 bg-slate-100 animate-pulse rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="flex flex-col items-center gap-3">
            <div className="w-[160px] h-[160px] bg-slate-100 animate-pulse rounded-full" />
            <div className="flex flex-wrap gap-2 justify-center">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-6 w-20 bg-slate-100 animate-pulse rounded-full" />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-11 bg-slate-50 animate-pulse rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm sm:text-base font-semibold text-[#171717]">
            {dv('Análisis por Marca', 'Brand Analysis')}
          </h3>
        </div>
        <div className="px-5 pb-5">
          <div className="text-center py-8 rounded-xl bg-slate-50/50">
            <BarChart3 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-[13px] text-slate-400">
              {dv('No hay datos de ventas disponibles', 'No sales data available')}
            </p>
            <p className="text-[11px] text-slate-300 mt-1">
              {dv('Se necesitan ventas para generar el análisis', 'Sales needed to generate analysis')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => {
    if (sortKey === 'avgDaysFromCreation') return a[sortKey] - b[sortKey];
    return b[sortKey] - a[sortKey];
  });
  const top = sorted.slice(0, 5);

  // Derive donut data from top brands based on active sort metric
  const donutData = top.map(brand => {
    let value: number;
    switch (sortKey) {
      case 'totalSold': value = brand.totalSold; break;
      case 'avgMargin': value = Math.max(0, brand.avgMargin); break;
      case 'totalProfit': value = Math.max(0, brand.totalProfit); break;
      case 'avgDaysFromCreation': {
        const maxDays = Math.max(...top.map(b => b.avgDaysFromCreation));
        value = maxDays > 0 ? maxDays - brand.avgDaysFromCreation + 1 : 1;
        break;
      }
    }
    return { name: brand.brandName, value };
  });

  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, outerRadius, name, percent, index }: any) => {
    if (percent < 0.04) return null;
    const radius = outerRadius + 28;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const isRight = x > cx;
    const pct = `${(percent * 100).toFixed(0)}%`;
    const color = DONUT_COLORS[index % DONUT_COLORS.length];
    const words = (name as string).split(' ');
    const shortName = words.length > 1
      ? `${words[0]} ${words.slice(1).map((w: string) => w[0] + '.').join(' ')}`
      : name;
    const label = `${shortName} ${pct}`;
    const pillW = label.length * 5.8 + 22;
    const pillH = 20;
    const pillX = isRight ? x + 2 : x - pillW - 2;
    const pillY = y - pillH / 2;
    return (
      <g>
        <rect x={pillX} y={pillY} width={pillW} height={pillH} rx={10} ry={10} fill="#f8fafc" stroke="#e2e8f0" strokeWidth={0.5} />
        <circle cx={pillX + 10} cy={y} r={3} fill={color} />
        <text x={pillX + 18} y={y} fill="#475569" dominantBaseline="central" fontSize={10} fontWeight={500}>{label}</text>
      </g>
    );
  };

  const getMarginColor = (m: number) => m >= 15 ? 'text-emerald-600' : m >= 5 ? 'text-amber-600' : 'text-red-500';
  const getDaysColor = (d: number) => d <= 30 ? 'text-emerald-600' : d <= 60 ? 'text-amber-600' : 'text-red-500';

  const getPrimaryMetric = (brand: BrandModelMetrics) => {
    switch (sortKey) {
      case 'totalSold': return `${brand.totalSold} ${dv('uds', 'units')}`;
      case 'avgMargin': return `${brand.avgMargin.toFixed(1)}%`;
      case 'totalProfit': return formatPrice(brand.totalProfit);
      case 'avgDaysFromCreation': return `${Math.round(brand.avgDaysFromCreation)}d`;
    }
  };

  const getPrimaryColor = (brand: BrandModelMetrics) => {
    switch (sortKey) {
      case 'totalSold': return 'text-slate-900';
      case 'avgMargin': return getMarginColor(brand.avgMargin);
      case 'totalProfit': return brand.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500';
      case 'avgDaysFromCreation': return getDaysColor(brand.avgDaysFromCreation);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white">
      {/* Header: title left, sort pills right */}
      <div className="px-5 pt-5 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-sm sm:text-base font-semibold text-[#171717] shrink-0">
          {dv('Análisis por Marca', 'Brand Analysis')}
        </h3>
        <div className="flex items-center bg-slate-100 rounded-xl p-0.5 sm:max-w-[360px] w-full sm:w-auto">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              className={cn(
                'flex-1 px-2 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-medium whitespace-nowrap transition-all',
                sortKey === opt.key
                  ? 'bg-white text-slate-900 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.08)]'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {dv(opt.esLabel, opt.enLabel)}
            </button>
          ))}
        </div>
      </div>

      {/* Content: donut left, ranking right */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Donut with callout labels */}
          <div className="flex items-center justify-center lg:border-r lg:border-slate-100 lg:pr-5 overflow-visible">
            <PieChart width={260} height={220} style={{ overflow: 'visible' }}>
              <Pie
                data={donutData}
                cx={130}
                cy={110}
                outerRadius={55}
                innerRadius={33}
                dataKey="value"
                paddingAngle={2}
                strokeWidth={0}
                label={renderLabel}
                labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              >
                {donutData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </div>

          {/* Ranking list */}
          <div className="flex-1 min-w-0">
            <div className="space-y-0.5">
              {top.map((brand, i) => {
                const isExpanded = expandedBrand === brand.brandId;

                return (
                  <div key={brand.brandId}>
                    <button
                      onClick={() => setExpandedBrand(isExpanded ? null : brand.brandId)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <span className={cn(
                        'text-[12px] font-bold w-5 text-center shrink-0',
                        i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-300'
                      )}>
                        {i + 1}
                      </span>
                      <span className="text-[13px] font-semibold text-slate-900 truncate text-left flex-1">
                        {brand.brandName}
                      </span>
                      <span className={cn('text-[13px] font-bold tabular-nums shrink-0', getPrimaryColor(brand))}>
                        {getPrimaryMetric(brand)}
                      </span>
                      <ChevronDown className={cn(
                        'w-3.5 h-3.5 text-slate-300 transition-transform shrink-0',
                        isExpanded && 'rotate-180'
                      )} />
                    </button>

                    {isExpanded && (
                      <div className="ml-[30px] mr-2 mb-1.5 p-3 rounded-xl bg-slate-50/80 grid grid-cols-2 gap-x-4 gap-y-2">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">{dv('Prom. días', 'Avg days')}</p>
                          <p className={cn('text-[13px] font-semibold tabular-nums', getDaysColor(brand.avgDaysFromCreation))}>
                            {Math.round(brand.avgDaysFromCreation)} {dv('días', 'days')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">{dv('Margen', 'Margin')}</p>
                          <p className={cn('text-[13px] font-semibold tabular-nums', getMarginColor(brand.avgMargin))}>
                            {brand.avgMargin.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">{dv('Ganancia total', 'Total profit')}</p>
                          <p className={cn('text-[13px] font-semibold tabular-nums', brand.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                            {formatPrice(brand.totalProfit)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">{dv('Prom./unidad', 'Avg/unit')}</p>
                          <p className="text-[13px] font-semibold tabular-nums text-slate-700">
                            {formatPrice(brand.avgProfitPerUnit)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 mt-1" />
            <div className="py-3 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Top {top.length} {dv('de', 'of')} {data.length}
              </span>
              <span className="text-[12px] text-slate-500">
                <strong className="text-slate-900">{data.reduce((s, b) => s + b.totalSold, 0)}</strong> {dv('vendidos', 'sold')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandSalesRanking;
