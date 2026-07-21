import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyAdminData } from '@/hooks/admin/types';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingUp } from 'lucide-react';

interface AdminSalesChartProps {
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
        <p className='text-primary'>{`Ventas: ${formatPrice(
          payload[0].value
        )}`}</p>
      </div>
    );
  }
  return null;
};

const AdminSalesChart: React.FC<AdminSalesChartProps> = ({
  loading,
  monthlyData,
  columnLayout,
  filtroLabel,
}) => {
  const { formatPrice, currency } = useCurrency();
  const totalSales = monthlyData.reduce((sum, item) => sum + item.sales, 0);

  return (
    <Card className='rounded-2xl border border-slate-200/60 bg-white'>
      <CardHeader className='pb-2'>
        <div className='flex flex-col items-start'>
          <div className='flex items-center gap-2'>
            <div className='text-primary'>
              <TrendingUp className='h-4 w-4 opacity-70' />
            </div>
            <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight'>
              {filtroLabel ? ` ${filtroLabel}` : ''}
            </CardTitle>
          </div>
          <div className={`mt-2`}>
            <p className='text-xs text-slate-500'>Total</p>
            <p className='text-lg font-semibold'>{formatPrice(totalSales)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className='h-[250px] sm:h-[300px] md:h-[350px] pt-4'>
        {loading ? (
          <div className='h-full w-full bg-slate-100 animate-pulse rounded-xl' />
        ) : (
          <ResponsiveContainer
            width='100%'
            height='100%'
            className='flex justify-start'
          >
            <AreaChart
              data={monthlyData}
              margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id='colorSales' x1='0' y1='0' x2='0' y2='1'>
                  <stop
                    offset='5%'
                    stopColor='#4f46e5'
                    stopOpacity={0.1}
                  />
                  <stop
                    offset='95%'
                    stopColor='#4f46e5'
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
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
              <Area
                type='monotone'
                dataKey='sales'
                stroke='#4f46e5'
                strokeWidth={2}
                fillOpacity={1}
                fill='url(#colorSales)'
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSalesChart;
