import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TimeRange } from './TimeRangeSelector';

// Gradient colors for bars
const GRADIENT_COLORS = [
  { start: '#8b5cf6', end: '#7c3aed' },
  { start: '#06b6d4', end: '#0891b2' },
  { start: '#f59e0b', end: '#d97706' },
  { start: '#10b981', end: '#059669' },
  { start: '#ec4899', end: '#db2777' },
  { start: '#3b82f6', end: '#2563eb' },
  { start: '#f97316', end: '#ea580c' },
  { start: '#14b8a6', end: '#0d9488' },
  { start: '#a855f7', end: '#9333ea' },
  { start: '#ef4444', end: '#dc2626' },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl p-3 sm:p-4 shadow-2xl">
        <p className="font-bold text-sm sm:text-base text-gray-900 mb-2">{entry.name}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <p className="text-purple-600 font-semibold text-sm">
            {entry.vehiclesAdded} vehículos
          </p>
        </div>
      </div>
    );
  }
  return null;
};

interface BarChartDealersProps {
  loading: boolean;
  vehiclesByDealerData: { name: string; vehiclesAdded: number }[];
  timeRange: TimeRange;
}

const BarChartDealers: React.FC<BarChartDealersProps> = ({
  loading,
  vehiclesByDealerData,
}) => {
  const chartData = vehiclesByDealerData.slice(0, 10).map((item, index) => ({
    ...item,
    color: GRADIENT_COLORS[index % GRADIENT_COLORS.length],
  }));

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="space-y-2 sm:space-y-3 w-full px-2 sm:px-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 sm:gap-3">
              <div className="w-24 sm:w-32 h-3 sm:h-4 bg-gray-200 rounded animate-pulse" />
              <div className="flex-1 h-5 sm:h-7 bg-gray-100 rounded animate-pulse" style={{ width: `${100 - i * 12}%` }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
        barCategoryGap={12}
      >
        <defs>
          {chartData.map((entry, index) => (
            <linearGradient
              key={`dealerBarGradient-${index}`}
              id={`dealerBarGradient-${index}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor={entry.color.start} />
              <stop offset="100%" stopColor={entry.color.end} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(0,0,0,0.06)"
          horizontal={true}
          vertical={false}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 9, fill: '#6b7280', fontWeight: 500 }}
          width={90}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar
          dataKey="vehiclesAdded"
          radius={[4, 4, 4, 4]}
          barSize={18}
          label={{
            position: 'right',
            fill: '#374151',
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={`url(#dealerBarGradient-${index})`}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChartDealers;
