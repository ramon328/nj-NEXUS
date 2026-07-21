import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HandCoins } from 'lucide-react';

interface FinancingStatsChartProps {
  data: { id: number; name: string; total: number }[];
  loading?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    return (
      <div className='rounded-lg bg-white shadow-xl border p-3'>
        <p className='font-medium text-gray-900 mb-1'>{entry.name}</p>
        <p className='text-blue-600 font-semibold'>
          Solicitudes de Financiamiento: {entry.total}
        </p>
      </div>
    );
  }
  return null;
};

const FinancingStatsChart: React.FC<FinancingStatsChartProps> = ({
  data,
  loading,
}) => {
  return (
    <Card className='border bg-white shadow-xl'>
      <CardHeader className='pb-2 flex flex-row items-center justify-between'>
        <div className='flex items-center gap-2'>
          <HandCoins className='h-6 w-6 text-primary' />
          <div>
            <CardTitle className='text-xl font-bold'>
              Automotoras con más Financiamiento
            </CardTitle>
            <div className='text-xs text-muted-foreground font-normal'>
              Top 10 automotoras por solicitudes de financiamiento
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='h-[350px] pt-2'>
        {loading ? (
          <div className='h-full w-full bg-gray-100 animate-pulse rounded-md' />
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={data}
              layout='vertical'
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              barCategoryGap={18}
            >
              <CartesianGrid strokeDasharray='3 3' stroke='rgba(0,0,0,0.1)' />
              <XAxis
                type='number'
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey='name'
                type='category'
                tick={{ fontSize: 14, fill: '#111827', fontWeight: 600 }}
                width={140}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey='total'
                fill='#3b82f6'
                radius={[8, 8, 8, 8]}
                barSize={28}
              >
                <LabelList
                  dataKey='total'
                  position='right'
                  fill='#111827'
                  fontWeight={700}
                  fontSize={16}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancingStatsChart;
