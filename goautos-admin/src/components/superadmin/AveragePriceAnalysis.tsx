import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { DollarSign, TrendingUp, BarChart3, Target, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type PriceAnalysis = {
  total_sales: number;
  avg_price: number;
  median_price: number;
  price_range: {
    min: number;
    max: number;
  };
  price_distribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  price_trend: {
    period: string;
    avg_price: number;
    change_percentage: number;
  }[];
  concentration_insight: string;
};

interface AveragePriceAnalysisProps {
  data: PriceAnalysis;
  loading: boolean;
}

// Slate-based palette for pie chart
const PIE_COLORS = ['#1e293b', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200/60 rounded-xl p-3 sm:p-4 shadow-sm">
        <p className="font-semibold text-sm sm:text-base text-slate-800 mb-2">{data.range}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill }} />
            <p className="text-slate-800 font-semibold text-sm">
              {data.count} vehículos
            </p>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm">
            {data.percentage.toFixed(1)}% del total
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const AveragePriceAnalysis: React.FC<AveragePriceAnalysisProps> = ({
  data,
  loading,
}) => {
  const SkeletonLoader = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-20 sm:h-24 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="bg-slate-100 rounded-lg p-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
            </div>
            <div className="h-5 sm:h-6 w-36 sm:w-48 bg-slate-200 rounded animate-pulse" />
          </div>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  // Filter distribution with data
  const filteredDistribution = data.price_distribution
    .filter((entry) => entry.count > 0)
    .map((entry, index) => ({
      ...entry,
      fill: PIE_COLORS[index % PIE_COLORS.length],
    }));

  // Find the dominant range
  const dominantRange = filteredDistribution.reduce(
    (max, item) => (item.percentage > max.percentage ? item : max),
    filteredDistribution[0] || { range: '-', percentage: 0, count: 0 }
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200/60">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-slate-100 rounded-lg p-2">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Análisis de Precios</h3>
            <p className="text-[10px] sm:text-xs text-slate-400">Distribución y métricas de precios de venta</p>
          </div>
        </div>

        {/* Main metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wide">Promedio</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-800">{formatCurrency(data.avg_price)}</p>
          </div>

          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wide">Mediana</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-800">{formatCurrency(data.median_price)}</p>
          </div>

          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wide">Rango</span>
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-800">
              {formatCurrency(data.price_range.min)}
            </p>
            <p className="text-[10px] sm:text-xs text-slate-400">a {formatCurrency(data.price_range.max)}</p>
          </div>

          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wide">Ventas</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-slate-800">{data.total_sales.toLocaleString()}</p>
          </div>
        </div>

        {/* Distribution section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Pie Chart */}
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-3 sm:p-4">
            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 mb-3 sm:mb-4">Distribución de Precios</h4>
            {filteredDistribution.length === 0 ? (
              <div className="h-[160px] sm:h-[200px] flex items-center justify-center text-slate-400 text-xs sm:text-sm">
                No hay datos suficientes
              </div>
            ) : (
              <div className="h-[160px] sm:h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="count"
                      strokeWidth={0}
                      label={({ percentage }) => `${percentage.toFixed(0)}%`}
                      labelLine={false}
                    >
                      {filteredDistribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Legend and insight */}
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-3 sm:p-4">
            <h4 className="text-xs sm:text-sm font-semibold text-slate-800 mb-3 sm:mb-4">Rangos de Precio</h4>
            <div className="space-y-2 sm:space-y-3">
              {filteredDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-xs sm:text-sm text-slate-500">{item.range}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs sm:text-sm font-medium text-slate-800">{item.count}</span>
                    <span className="text-[10px] sm:text-xs text-slate-400 w-10 sm:w-12 text-right">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Insight */}
            {dominantRange && dominantRange.percentage > 0 && (
              <div className="mt-3 sm:mt-4 bg-slate-50 border border-slate-200/60 rounded-xl p-3">
                <p className="text-[10px] sm:text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">Insight:</span> {data.concentration_insight}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AveragePriceAnalysis;
