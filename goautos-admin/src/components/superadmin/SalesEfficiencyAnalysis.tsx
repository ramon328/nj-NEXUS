import React from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Target, TrendingUp, Award, Clock, Car } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type SalesEfficiency = {
  id: number;
  name: string;
  total_vehicles: number;
  sold_vehicles: number;
  conversion_rate: number;
  avg_days_to_sell: number;
  total_revenue: number;
  avg_price_per_vehicle: number;
  stock_turnover: number;
};

interface SalesEfficiencyAnalysisProps {
  data: SalesEfficiency[];
  loading: boolean;
}

// Slate gradient for bars
const BAR_GRADIENT = { start: '#64748b', end: '#475569' };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-lg min-w-[180px]">
        <p className="font-bold text-sm sm:text-base text-slate-800 mb-2 sm:mb-3 truncate max-w-[200px]">{label}</p>
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs sm:text-sm">Conversion</span>
            <span className="text-slate-800 font-bold text-sm">{data.conversionRate?.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs sm:text-sm">Vendidos</span>
            <span className="text-slate-800 font-medium text-sm">{data.soldVehicles}/{data.totalVehicles}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs sm:text-sm">Dias promedio</span>
            <span className="text-slate-800 font-medium text-sm">{data.avgDaysToSell?.toFixed(0)} dias</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs sm:text-sm">Ingresos</span>
            <span className="text-slate-800 font-medium text-sm">{formatCurrency(data.totalRevenue)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const SalesEfficiencyAnalysis: React.FC<SalesEfficiencyAnalysisProps> = ({
  data,
  loading,
}) => {
  const SkeletonLoader = () => (
    <div className="space-y-2 sm:space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 sm:gap-3">
          <div className="w-28 sm:w-40 h-3 sm:h-4 bg-slate-200 rounded animate-pulse" />
          <div className="flex-1 h-5 sm:h-6 bg-slate-100 rounded animate-pulse" style={{ width: `${100 - i * 12}%` }} />
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
              <Target className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
            </div>
            <div className="h-5 sm:h-6 w-40 sm:w-56 bg-slate-200 rounded animate-pulse" />
          </div>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  // Sort by conversion rate
  const sortedData = [...data].sort((a, b) => b.conversion_rate - a.conversion_rate);

  const chartData = sortedData.slice(0, 12).map((dealer) => ({
    name: dealer.name,
    conversionRate: dealer.conversion_rate,
    avgDaysToSell: dealer.avg_days_to_sell,
    stockTurnover: dealer.stock_turnover,
    totalRevenue: dealer.total_revenue,
    soldVehicles: dealer.sold_vehicles,
    totalVehicles: dealer.total_vehicles,
  }));

  // Calculate aggregate stats
  const avgConversion = data.length > 0
    ? data.reduce((sum, d) => sum + d.conversion_rate, 0) / data.length
    : 0;
  const totalVehicles = data.reduce((sum, d) => sum + d.total_vehicles, 0);
  const totalSold = data.reduce((sum, d) => sum + d.sold_vehicles, 0);
  const avgDays = data.length > 0
    ? data.reduce((sum, d) => sum + d.avg_days_to_sell, 0) / data.length
    : 0;

  // Find top performer
  const topPerformer = sortedData[0];

  return (
    <div className="rounded-xl bg-white border border-slate-200/60">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-slate-100 rounded-lg p-2">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Eficiencia de Ventas</h3>
            <p className="text-[10px] sm:text-xs text-slate-400">Tasa de conversion por automotora</p>
          </div>
        </div>

        {/* Top performer highlight */}
        {topPerformer && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="bg-slate-100 rounded-lg p-2">
                <Award className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wide font-medium">Mejor Rendimiento</p>
                <p className="text-sm sm:text-base font-bold text-slate-800 truncate">{topPerformer.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              <div className="text-center p-1.5 sm:p-2 rounded-lg border border-slate-200/60 bg-white">
                <p className="text-sm sm:text-lg font-bold text-slate-800">{topPerformer.conversion_rate.toFixed(1)}%</p>
                <p className="text-[8px] sm:text-[10px] text-slate-400 uppercase">Conversion</p>
              </div>
              <div className="text-center p-1.5 sm:p-2 rounded-lg border border-slate-200/60 bg-white">
                <p className="text-sm sm:text-lg font-bold text-slate-800">{topPerformer.sold_vehicles}/{topPerformer.total_vehicles}</p>
                <p className="text-[8px] sm:text-[10px] text-slate-400 uppercase">Vendidos</p>
              </div>
              <div className="text-center p-1.5 sm:p-2 rounded-lg border border-slate-200/60 bg-white">
                <p className="text-sm sm:text-lg font-bold text-slate-800">{topPerformer.avg_days_to_sell.toFixed(0)}</p>
                <p className="text-[8px] sm:text-[10px] text-slate-400 uppercase">Dias Prom.</p>
              </div>
              <div className="text-center p-1.5 sm:p-2 rounded-lg border border-slate-200/60 bg-white">
                <p className="text-[10px] sm:text-sm font-bold text-slate-800">{formatCurrency(topPerformer.total_revenue)}</p>
                <p className="text-[8px] sm:text-[10px] text-slate-400 uppercase">Ingresos</p>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-[200px] sm:h-[250px] mb-4 sm:mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 35, left: 0, bottom: 0 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
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
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              />
              <Bar
                dataKey="conversionRate"
                radius={[4, 4, 4, 4]}
                barSize={14}
                fill="url(#efficiencyGradient)"
                label={{
                  position: 'right',
                  fill: '#334155',
                  fontSize: 10,
                  fontWeight: 600,
                  formatter: (value: number) => `${value.toFixed(1)}%`,
                }}
              />
              <defs>
                <linearGradient
                  id="efficiencyGradient"
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

        {/* Aggregate metrics */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-2 sm:p-3 text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
            </div>
            <p className="text-base sm:text-xl font-bold text-slate-800">{avgConversion.toFixed(1)}%</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 uppercase">Prom. General</p>
          </div>
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-2 sm:p-3 text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
              <Car className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
            </div>
            <p className="text-base sm:text-xl font-bold text-slate-800">{totalVehicles.toLocaleString()}</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 uppercase">Vehiculos</p>
          </div>
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-2 sm:p-3 text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
              <Award className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
            </div>
            <p className="text-base sm:text-xl font-bold text-slate-800">{totalSold.toLocaleString()}</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 uppercase">Vendidos</p>
          </div>
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-2 sm:p-3 text-center">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-0.5 sm:mb-1">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500" />
            </div>
            <p className="text-base sm:text-xl font-bold text-slate-800">{avgDays.toFixed(0)}</p>
            <p className="text-[8px] sm:text-[10px] text-slate-400 uppercase">Dias Prom.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesEfficiencyAnalysis;
