import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
} from 'recharts';
import { Timer } from 'lucide-react';

import type { FastestSellingVehicle } from '@/hooks/useSuperadminStats';

interface FastestSellingVehiclesProps {
  data: FastestSellingVehicle[];
  loading: boolean;
}

const FastestSellingVehicles: React.FC<FastestSellingVehiclesProps> = ({
  data,
  loading,
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Timer className='h-5 w-5' />
            Autos de Mayor Rotación
          </CardTitle>
          <CardDescription>
            Calculando los modelos que se venden más rápido...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='h-[350px] bg-muted animate-pulse rounded'></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-xl font-bold'>
          <Timer className='h-5 w-5 text-primary' />
          Autos de Mayor Rotación
        </CardTitle>
        <CardDescription>
          Top 10 de modelos que se venden más rápido (menor tiempo promedio
          desde publicación hasta venta).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={350}>
          <BarChart
            data={data.map((v) => ({
              name: `${v.brand} ${v.model}`,
              avgDays: v.avg_days_to_sell,
              totalSold: v.total_sold,
            }))}
            layout='vertical'
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis
              type='number'
              domain={[0, 'dataMax']}
              tickFormatter={(d) => `${Math.round(d)}d`}
            />
            <YAxis
              type='category'
              dataKey='name'
              width={180}
              axisLine={false}
              tickLine={false}
              tick={{
                dx: -10,
                fill: 'hsl(var(--foreground))',
                fontSize: 14,
              }}
              style={{ textAnchor: 'end' }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted))' }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className='bg-background border rounded-lg p-3 shadow-lg text-sm'>
                      <p className='font-bold text-base mb-1'>{label}</p>
                      <p className='text-primary font-semibold'>
                        {Math.round(data.avgDays)} días promedio hasta la venta
                      </p>
                      <p className='text-muted-foreground'>
                        Total vendido: {data.totalSold}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey='avgDays'
              fill='hsl(var(--primary))'
              radius={[4, 4, 4, 4]}
            >
              <LabelList
                dataKey='avgDays'
                position='right'
                offset={10}
                className='fill-foreground font-bold'
                fontSize={14}
                formatter={(value: number) => `${Math.round(value)}d`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default FastestSellingVehicles;
