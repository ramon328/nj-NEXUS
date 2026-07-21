import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyAdminData } from '@/hooks/admin/types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import type { NetProfitByPeriod } from '@/hooks/admin/useVehicleNetProfitsByPeriod';

interface ProfitMarginChartProps {
  loading: boolean;
  monthlyData: MonthlyAdminData[];
  filtroLabel?: string;
  /**
   * Datos unificados de utilidad por período, calculados vía el helper.
   * Si están presentes, se usan en lugar de la fórmula vieja basada en buckets
   * de salesCalculations. Coinciden con el resumen del vehículo y el KPI dashboard.
   */
  netProfitData?: NetProfitByPeriod[];
}

const CustomTooltip = ({ active, payload, label, formatPrice }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className='rounded-xl bg-white/95 backdrop-blur-sm shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)] border border-slate-200/60 p-3'>
        <p className='font-medium text-slate-900 mb-1'>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`profit-${index}`} className='text-slate-600'>
            {`${entry.name}: ${formatPrice(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ProfitMarginChart: React.FC<ProfitMarginChartProps> = ({
  loading,
  monthlyData,
  filtroLabel,
  netProfitData,
}) => {
  // Si tenemos datos unificados del helper, los usamos preferencialmente.
  // Sino, fallback a la lógica vieja basada en buckets de salesCalculations.
  const chartData = (() => {
    if (netProfitData && netProfitData.length > 0) {
      // Mapear netProfit a cada mes del monthlyData (manteniendo el orden y los meses
      // sin venta como $0 para que el eje X muestre la línea de tiempo completa).
      const byKey = new Map(netProfitData.map((p) => [p.key, p.netProfit]));
      return monthlyData.map((item) => ({
        month: item.month,
        'Ganancia Neta': byKey.get(item.month) ?? 0,
        'Ventas': item.sales,
        'Gastos': 0,
      }));
    }
    return monthlyData.map((item) => {
      const totalExpenses = item.vehicleExpenses + item.commonExpenses + item.commissions;
      const netProfit = item.sales - totalExpenses;
      return {
        month: item.month,
        'Ganancia Neta': netProfit,
        'Ventas': item.sales,
        'Gastos': totalExpenses,
      };
    });
  })();

  // Calculate total net profit
  const totalNetProfit = chartData.reduce((sum, item) => sum + item['Ganancia Neta'], 0);

  const { formatPrice } = useCurrency();
  const isPositive = totalNetProfit >= 0;

  return (
    <Card className='rounded-2xl border border-slate-200/60 bg-white'>
      <CardHeader className='pb-2'>
        <div className='flex flex-col items-start'>
          <div className='flex items-center gap-2'>
            <div className={isPositive ? 'text-green-600' : 'text-red-600'}>
              {isPositive ? (
                <TrendingUp className='h-4 w-4' />
              ) : (
                <TrendingDown className='h-4 w-4' />
              )}
            </div>
            <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight'>
              {filtroLabel || 'Ganancia/Pérdida Mensual'}
            </CardTitle>
          </div>
          <div className='mt-2'>
            <p className='text-xs text-slate-500'>Total</p>
            <p className={`text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {formatPrice(totalNetProfit)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className='h-[250px] sm:h-[300px] md:h-[350px]'>
        {loading ? (
          <div className='h-full w-full bg-slate-100 animate-pulse rounded-xl' />
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray='3 3' stroke='rgba(0,0,0,0.04)' />
              <XAxis
                dataKey='month'
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                tickFormatter={(value) =>
                  value === 0 ? '0' : `$${(value / 1000).toFixed(0)}k`
                }
              />
              <Tooltip content={<CustomTooltip formatPrice={formatPrice} />} />
              <ReferenceLine y={0} stroke='#666' strokeDasharray='3 3' />
              <Bar
                dataKey='Ganancia Neta'
                radius={[6, 6, 0, 0]}
                barSize={40}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry['Ganancia Neta'] >= 0 ? '#10b981' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfitMarginChart;
