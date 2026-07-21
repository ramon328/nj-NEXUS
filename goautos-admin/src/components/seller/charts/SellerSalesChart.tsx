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
import SkeletonChart from '@/components/dashboard/SkeletonChart';
import { MonthlySellerData } from '@/hooks/useSellerDashboard';

interface SellerSalesChartProps {
  loading: boolean;
  monthlyData: MonthlySellerData[];
}

const SellerSalesChart = ({ loading, monthlyData }: SellerSalesChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg font-semibold'>
          Ventas Mensuales
        </CardTitle>
      </CardHeader>
      <CardContent className='h-[400px]'>
        {loading ? (
          <SkeletonChart />
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray='3 3' opacity={0.1} />
              <XAxis dataKey='month' tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [value, 'Ventas']}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Bar
                dataKey='sales'
                fill='#9b87f5'
                radius={[4, 4, 0, 0]}
                name='Ventas'
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SellerSalesChart;
