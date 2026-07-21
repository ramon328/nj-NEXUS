
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SkeletonChart from './SkeletonChart';
import CustomTooltip from './CustomTooltip';
import { STATUS_COLORS } from './ChartColors';

interface StatusChartProps {
  loading: boolean;
  statusData: Record<string, number>;
}

const StatusChart = ({ loading, statusData }: StatusChartProps) => {
  // Prepare status distribution data
  const chartData = Object.entries(statusData).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || '#3b82f6'
  }));

  // Ensure statuses are ordered by importance for business
  const orderedStatusData = [...chartData].sort((a, b) => {
    // Define priority order
    const priority: Record<string, number> = {
      'Publicado': 1,
      'Reservado': 2,
      'Vendido': 3
    };
    
    return (priority[a.name] || 99) - (priority[b.name] || 99);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Vehículos por Estado</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {loading ? (
          <SkeletonChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={orderedStatusData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {orderedStatusData.map((entry) => (
                  <Cell 
                    key={`cell-${entry.name}`} 
                    fill={entry.color} 
                    strokeWidth={entry.name === 'Publicado' ? 2 : 0}
                    stroke={entry.name === 'Publicado' ? '#1d4ed8' : undefined}
                  />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomTooltip formatter={(value: number) => `${value} vehículos`} />}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default StatusChart;
