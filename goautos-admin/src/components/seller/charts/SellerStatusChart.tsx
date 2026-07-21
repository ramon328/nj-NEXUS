
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SkeletonChart from '@/components/dashboard/SkeletonChart';

interface SellerStatusChartProps {
  loading: boolean;
  approvedSales: number;
  pendingSales: number;
  rejectedSales: number;
}

const SellerStatusChart = ({ 
  loading, 
  approvedSales, 
  pendingSales, 
  rejectedSales 
}: SellerStatusChartProps) => {
  const data = [
    { name: 'Aprobadas', value: approvedSales, color: '#10b981' },
    { name: 'Pendientes', value: pendingSales, color: '#f59e0b' },
    { name: 'Rechazadas', value: rejectedSales, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const isEmpty = data.length === 0 || data.every(item => item.value === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Estado de Ventas</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        {loading ? (
          <SkeletonChart />
        ) : isEmpty ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No hay datos de ventas disponibles</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} ventas`, '']}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SellerStatusChart;
