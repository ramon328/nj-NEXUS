import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { BrandModelMetrics } from '@/hooks/admin/types/inventoryAnalytics';
import { useCurrency } from '@/hooks/useCurrency';

interface SalesProfitabilityChartProps {
  loading: boolean;
  data: BrandModelMetrics[];
  title?: string;
  showCard?: boolean;
}

const getMarginColor = (margin: number): string => {
  if (margin >= 20) return '#10b981';
  if (margin >= 10) return '#f59e0b';
  if (margin >= 0) return '#f97316';
  return '#ef4444';
};

const SalesProfitabilityChart: React.FC<SalesProfitabilityChartProps> = ({
  loading,
  data,
  title,
  showCard = true,
}) => {
  const { i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);

  const chartData = data
    .slice(0, 8)
    .map(brand => ({
      name: brand.brandName.length > 12
        ? brand.brandName.slice(0, 12) + '...'
        : brand.brandName,
      fullName: brand.brandName,
      margin: Math.round(brand.avgMargin * 10) / 10,
      avgProfit: brand.avgProfitPerUnit,
      totalProfit: brand.totalProfit,
      totalSold: brand.totalSold,
    }))
    .sort((a, b) => b.margin - a.margin);

  const content = (
    <>
      {loading ? (
        <div className="h-[300px] bg-slate-50 animate-pulse rounded-xl" />
      ) : !data || data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center rounded-xl bg-slate-50/50">
          <p className="text-[13px] text-slate-400">
            {dv('No hay datos de ventas disponibles', 'No sales data available')}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.06} horizontal={true} vertical={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(value) => `${value}%`}
              domain={['dataMin - 5', 'dataMax + 5']}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              width={90}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl bg-white/95 backdrop-blur-lg shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] border border-slate-200/60 px-3.5 py-2.5 space-y-0.5">
                      <p className="text-[12px] font-semibold text-slate-900">{d.fullName}</p>
                      <p className="text-[12px] text-slate-600">
                        {dv('Margen', 'Margin')}: <span className={`font-bold ${d.margin >= 15 ? 'text-emerald-600' : d.margin >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{d.margin}%</span>
                      </p>
                      <p className="text-[12px] text-slate-600">
                        {dv('Ganancia prom.', 'Avg. profit')}: <span className="font-bold">{formatPrice(d.avgProfit)}</span>
                      </p>
                      <p className="text-[12px] text-slate-600">
                        {dv('Ganancia total', 'Total profit')}: <span className="font-bold">{formatPrice(d.totalProfit)}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 pt-1 border-t border-slate-100">
                        {dv('Vendidos', 'Sold')}: {d.totalSold}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ fill: 'rgba(0,0,0,0.02)' }}
            />
            <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />
            <ReferenceLine x={15} stroke="#10b981" strokeWidth={1} strokeDasharray="5 5" />
            <Bar
              dataKey="margin"
              radius={[0, 6, 6, 0]}
              barSize={16}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getMarginColor(entry.margin)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
          {title || dv('Rentabilidad por Marca', 'Profitability by Brand')}
        </CardTitle>
        <p className="text-[13px] text-slate-500">
          {dv('Margen de ganancia promedio (%)', 'Average profit margin (%)')}
        </p>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default SalesProfitabilityChart;
