
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SkeletonChart from './SkeletonChart';
import CustomTooltip from './CustomTooltip';

interface SalesChartProps {
  loading: boolean;
  monthlyData: { month: string; visits: number; sales: number }[];
  formatCurrency: (value: number) => string;
}

const SalesChart = ({ loading, monthlyData, formatCurrency }: SalesChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ventas Mensuales</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {loading ? (
          <SkeletonChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={monthlyData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickFormatter={(value) => `$${value/1000}k`}
              />
              <Tooltip 
                content={<CustomTooltip formatter={formatCurrency} />}
              />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.2} 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesChart;
