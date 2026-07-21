import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BrandModelMetrics } from '@/hooks/admin/types/inventoryAnalytics';
import { useCurrency } from '@/hooks/useCurrency';

interface SalesVolumeChartProps {
  loading: boolean;
  data: BrandModelMetrics[];
  title?: string;
  showCard?: boolean;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const SalesVolumeChart: React.FC<SalesVolumeChartProps> = ({
  loading,
  data,
  title,
  showCard = true,
}) => {
  const { i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);

  const sortedData = [...data].sort((a, b) => b.totalSold - a.totalSold);
  const topBrands = sortedData.slice(0, 8);

  const chartData = topBrands.map((brand, i) => ({
    name: brand.brandName,
    sold: brand.totalSold,
    revenue: brand.totalRevenue,
    profit: brand.totalProfit,
    margin: brand.avgMargin,
    avgDays: Math.round(brand.avgDaysFromCreation),
    pct: brand.percentageOfTotal,
    color: COLORS[i % COLORS.length],
  }));

  const totalSold = data.reduce((sum, item) => sum + item.totalSold, 0);

  const content = (
    <>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center">
          <div className="h-full w-full bg-slate-50 animate-pulse rounded-xl" />
        </div>
      ) : !data || data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center rounded-xl bg-slate-50/50">
          <p className="text-[13px] text-slate-400">
            {dv('No hay datos de ventas disponibles', 'No sales data available')}
          </p>
        </div>
      ) : (
        <div>
          {/* Horizontal bar chart */}
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#334155', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl bg-white/95 backdrop-blur-lg shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] border border-slate-200/60 px-3.5 py-2.5 space-y-1">
                          <p className="text-[13px] font-semibold text-slate-900">{d.name}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                            <p className="text-[11px] text-slate-500">{dv('Vendidos', 'Sold')}</p>
                            <p className="text-[11px] font-bold text-slate-900 text-right">{d.sold}</p>
                            <p className="text-[11px] text-slate-500">{dv('Ingresos', 'Revenue')}</p>
                            <p className="text-[11px] font-bold text-slate-900 text-right">{formatPrice(d.revenue)}</p>
                            <p className="text-[11px] text-slate-500">{dv('Ganancia', 'Profit')}</p>
                            <p className={`text-[11px] font-bold text-right ${d.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPrice(d.profit)}</p>
                            <p className="text-[11px] text-slate-500">{dv('Margen', 'Margin')}</p>
                            <p className={`text-[11px] font-bold text-right ${d.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{d.margin.toFixed(1)}%</p>
                            <p className="text-[11px] text-slate-500">{dv('Prom. días', 'Avg. days')}</p>
                            <p className="text-[11px] font-bold text-slate-900 text-right">{d.avgDays}d</p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="sold" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Summary row */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap gap-x-6 gap-y-1 justify-center">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{totalSold}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{dv('Total vendidos', 'Total sold')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">{data.length}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">{dv('Marcas', 'Brands')}</p>
              </div>
              {topBrands[0] && (
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{topBrands[0].brandName}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{dv('Más vendida', 'Top seller')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card className="rounded-2xl border border-slate-200/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-[15px] font-semibold text-slate-900 tracking-tight">
          {title || dv('Volumen de Ventas por Marca', 'Sales Volume by Brand')}
        </CardTitle>
        <p className="text-[13px] text-slate-500">
          {dv('Ranking de marcas más vendidas', 'Top selling brands ranking')}
        </p>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default SalesVolumeChart;
