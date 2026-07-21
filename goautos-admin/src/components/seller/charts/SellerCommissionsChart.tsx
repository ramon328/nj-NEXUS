
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SkeletonChart from '@/components/dashboard/SkeletonChart';
import { MonthlySellerData } from '@/hooks/useSellerDashboard';
import { formatCurrency } from '@/components/dashboard/formatters';

interface SellerCommissionsChartProps {
  loading: boolean;
  monthlyData: MonthlySellerData[];
}

const SellerCommissionsChart = ({ loading, monthlyData }: SellerCommissionsChartProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Comisiones Mensuales</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
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
                formatter={(value: number) => [formatCurrency(value), 'Comisión']}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="commissions" 
                stroke="#7E69AB" 
                fill="#7E69AB" 
                fillOpacity={0.2} 
                name="Comisiones"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SellerCommissionsChart;
