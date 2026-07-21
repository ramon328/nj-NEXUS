import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BrandModelMetrics } from '@/hooks/admin/types/inventoryAnalytics';

interface SalesVelocityChartProps {
  loading: boolean;
  data: BrandModelMetrics[];
  title?: string;
  showCard?: boolean;
}

const SalesVelocityChart: React.FC<SalesVelocityChartProps> = ({
  loading,
  data,
  title,
  showCard = true,
}) => {
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);

  const chartData = data
    .slice(0, 8)
    .map(brand => ({
      name: brand.brandName.length > 12
        ? brand.brandName.slice(0, 12) + '...'
        : brand.brandName,
      fullName: brand.brandName,
      daysFromCreation: brand.avgDaysFromCreation,
      daysFromPublication: brand.avgDaysFromPublication || 0,
      totalSold: brand.totalSold,
    }));

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
              tickFormatter={(value) => `${value}d`}
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
                        {dv('Desde ingreso', 'From entry')}: <span className="font-bold text-blue-600">{d.daysFromCreation} {dv('días', 'days')}</span>
                      </p>
                      {d.daysFromPublication > 0 && (
                        <p className="text-[12px] text-slate-600">
                          {dv('Desde publicación', 'From publication')}: <span className="font-bold text-emerald-600">{d.daysFromPublication} {dv('días', 'days')}</span>
                        </p>
                      )}
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
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => (
                <span className="text-[11px] text-slate-500">
                  {value === 'daysFromCreation'
                    ? dv('Desde ingreso', 'From entry')
                    : dv('Desde publicación', 'From publication')
                  }
                </span>
              )}
              iconType="circle"
              iconSize={8}
            />
            <Bar
              dataKey="daysFromCreation"
              fill="#3b82f6"
              radius={[0, 6, 6, 0]}
              barSize={12}
              name="daysFromCreation"
            />
            <Bar
              dataKey="daysFromPublication"
              fill="#10b981"
              radius={[0, 6, 6, 0]}
              barSize={12}
              name="daysFromPublication"
            />
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
          {title || dv('Velocidad de Venta por Marca', 'Sales Velocity by Brand')}
        </CardTitle>
        <p className="text-[13px] text-slate-500">
          {dv('Días promedio hasta la venta', 'Average days until sale')}
        </p>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
};

export default SalesVelocityChart;
