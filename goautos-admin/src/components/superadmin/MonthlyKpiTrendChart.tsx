import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import type { MonthlyKpiTrend } from '@/hooks/useSuperadminStats';
import { formatCurrency } from '@/lib/utils';

interface MonthlyKpiTrendChartProps {
  loading: boolean;
  data: MonthlyKpiTrend[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className='rounded-lg bg-white shadow-xl border p-3'>
        <p className='font-medium text-gray-900 mb-1'>{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`kpi-${index}`} className='text-gray-600'>
            {entry.dataKey === 'revenue'
              ? `${entry.name}: ${formatCurrency(entry.value)}`
              : `${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const MonthlyKpiTrendChart: React.FC<MonthlyKpiTrendChartProps> = ({
  loading,
  data,
}) => {
  return (
    <Card className='border bg-white'>
      <CardHeader className='pb-2'>
        <div className='flex items-center gap-2'>
          <TrendingUp className='h-5 w-5 text-primary' />
          <CardTitle className='text-lg font-medium'>
            Tendencia Mensual de Ventas y Publicaciones
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className='h-[250px] sm:h-[300px] md:h-[350px]'>
        {loading ? (
          <div className='h-full w-full bg-gray-100 animate-pulse rounded-md' />
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart
              data={data}
              margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray='3 3' stroke='rgba(0,0,0,0.1)' />
              <XAxis
                dataKey='month'
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 10 }}
                iconType='plainline'
                align='center'
                verticalAlign='bottom'
              />
              <Line
                type='monotone'
                dataKey='sales'
                name='Ventas'
                stroke='#10b981'
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type='monotone'
                dataKey='published'
                name='Publicaciones'
                stroke='#6366f1'
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type='monotone'
                dataKey='revenue'
                name='Ingresos'
                stroke='#f59e42'
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyKpiTrendChart;
