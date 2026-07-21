import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyAdminData } from '@/hooks/admin/types';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingDown } from 'lucide-react';

interface AdminExpensesChartProps {
  loading: boolean;
  monthlyData: MonthlyAdminData[];
  columnLayout?: boolean;
  filtroLabel?: string;
}

const CustomTooltip = ({ active, payload, label, formatPrice }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className='rounded-xl bg-white/95 backdrop-blur-sm shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)] border border-slate-200/60 p-3'>
        <p className='font-medium text-slate-900 mb-1'>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`expense-${index}`} className='text-slate-600'>
            {`${entry.name}: ${formatPrice(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const AdminExpensesChart: React.FC<AdminExpensesChartProps> = ({
  loading,
  monthlyData,
  columnLayout,
  filtroLabel,
}) => {
  const { formatPrice } = useCurrency();
  const chartData = monthlyData.map((item) => ({
    month: item.month,
    'Gastos Vehículos': item.vehicleExpenses,
    'Gastos Comunes': item.commonExpenses,
    Comisiones: item.commissions,
  }));

  const totalExpenses = monthlyData.reduce(
    (sum, item) =>
      sum + item.vehicleExpenses + item.commonExpenses + item.commissions,
    0
  );

  const expenseColors = {
    'Gastos Vehículos': '#4f46e5',
    'Gastos Comunes': '#6b7280',
    Comisiones: '#9ca3af',
  };

  return (
    <Card className='rounded-2xl border border-slate-200/60 bg-white'>
      <CardHeader className='pb-2'>
        <div className={`flex flex-col items-start`}>
          <div className='flex items-center gap-2'>
            <div className='text-primary'>
              <TrendingDown className='h-4 w-4 opacity-70' />
            </div>
            <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight'>
              {filtroLabel ? ` ${filtroLabel}` : ''}
            </CardTitle>
          </div>
          <div className={`mt-2`}>
            <p className='text-xs text-slate-500'>Total</p>
            <p className='text-lg font-semibold'>
              {formatPrice(totalExpenses)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className='h-[250px] sm:h-[300px] md:h-[350px]'>
        {loading ? (
          <div className='h-full w-full bg-slate-100 animate-pulse rounded-xl' />
        ) : (
          <ResponsiveContainer
            width='100%'
            height='100%'
            className='flex justify-start'
          >
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
              barGap={6}
              barCategoryGap={18}
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
                  value === 0 ? '0' : `$${value / 1000}k`
                }
              />
              <Tooltip content={<CustomTooltip formatPrice={formatPrice} />} />
              <Bar
                dataKey='Gastos Vehículos'
                fill={expenseColors['Gastos Vehículos']}
                radius={[6, 6, 0, 0]}
                barSize={28}
              />
              <Bar
                dataKey='Gastos Comunes'
                fill={expenseColors['Gastos Comunes']}
                radius={[6, 6, 0, 0]}
                barSize={28}
              />
              <Bar
                dataKey='Comisiones'
                fill={expenseColors['Comisiones']}
                radius={[6, 6, 0, 0]}
                barSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminExpensesChart;
