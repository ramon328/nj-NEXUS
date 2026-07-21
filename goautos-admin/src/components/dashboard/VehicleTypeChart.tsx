
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SkeletonChart from './SkeletonChart';
import CustomTooltip from './CustomTooltip';
import { COLORS } from './ChartColors';

interface VehicleTypeChartProps {
  loading: boolean;
  vehicleTypes: { name: string; value: number }[];
}

const VehicleTypeChart = ({ loading, vehicleTypes }: VehicleTypeChartProps) => {
  // Format vehicleTypes data to ensure we have a valid array even if empty
  const chartData = vehicleTypes.length > 0 
    ? vehicleTypes 
    : [{ name: 'Sin datos', value: 1 }];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Distribución por Tipo de Vehículo</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {loading ? (
          <SkeletonChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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

export default VehicleTypeChart;
