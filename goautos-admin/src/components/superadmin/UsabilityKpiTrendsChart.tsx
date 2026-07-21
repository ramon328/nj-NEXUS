import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';
import { UsabilityKpiTrendsData } from '@/hooks/useUsabilityStats';

interface UsabilityKpiTrendsChartProps {
  usabilityKpiTrendsData: UsabilityKpiTrendsData[];
}

// Modern contrasting colors
const COLOR_LEADS = '#3b82f6'; // Blue
const COLOR_TASADOR = '#f59e0b'; // Amber
const COLOR_INSTAGRAM = '#ec4899'; // Pink
const COLOR_BUILDER = '#10b981'; // Emerald

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl p-3 sm:p-4 shadow-2xl min-w-[200px]">
        <p className="font-bold text-sm text-gray-900 mb-3 pb-2 border-b border-gray-100">{label}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_LEADS }} />
              <span className="text-xs text-gray-600">Leads activos</span>
            </div>
            <span className="text-sm font-bold" style={{ color: COLOR_LEADS }}>{payload[0]?.payload.leads}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_TASADOR }} />
              <span className="text-xs text-gray-600">Tasador activo</span>
            </div>
            <span className="text-sm font-bold" style={{ color: COLOR_TASADOR }}>{payload[0]?.payload.tasador}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_INSTAGRAM }} />
              <span className="text-xs text-gray-600">Instagram activo</span>
            </div>
            <span className="text-sm font-bold" style={{ color: COLOR_INSTAGRAM }}>{payload[0]?.payload.instagram}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLOR_BUILDER }} />
              <span className="text-xs text-gray-600">Builder Web</span>
            </div>
            <span className="text-sm font-bold" style={{ color: COLOR_BUILDER }}>{payload[0]?.payload.builder}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = () => (
  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-2 sm:mt-4">
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: COLOR_LEADS }} />
      <span className="text-[10px] sm:text-xs text-gray-600">Leads activos</span>
    </div>
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: COLOR_TASADOR }} />
      <span className="text-[10px] sm:text-xs text-gray-600">Tasador</span>
    </div>
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: COLOR_INSTAGRAM }} />
      <span className="text-[10px] sm:text-xs text-gray-600">Instagram</span>
    </div>
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: COLOR_BUILDER }} />
      <span className="text-[10px] sm:text-xs text-gray-600">Builder Web</span>
    </div>
  </div>
);

const UsabilityKpiTrendsChart: React.FC<UsabilityKpiTrendsChartProps> = ({
  usabilityKpiTrendsData,
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Background effects */}
      <div className="absolute -right-16 -top-16 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-blue-50 blur-3xl opacity-60" />
      <div className="absolute -left-16 -bottom-16 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-emerald-50 blur-3xl opacity-60" />

      <div className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Evolución de KPIs de Usabilidad</h3>
            <p className="text-[10px] sm:text-xs text-gray-500">Tendencia histórica de adopción por automotoras</p>
          </div>
        </div>

        {/* Chart */}
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={usabilityKpiTrendsData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="leads"
                name="Leads activos"
                stroke={COLOR_LEADS}
                strokeWidth={3}
                dot={{ r: 3, fill: COLOR_LEADS, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: COLOR_LEADS, strokeWidth: 2, stroke: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="tasador"
                name="Tasador"
                stroke={COLOR_TASADOR}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 2, fill: COLOR_TASADOR, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: COLOR_TASADOR, strokeWidth: 2, stroke: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="instagram"
                name="Instagram"
                stroke={COLOR_INSTAGRAM}
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ r: 2, fill: COLOR_INSTAGRAM, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: COLOR_INSTAGRAM, strokeWidth: 2, stroke: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="builder"
                name="Builder Web"
                stroke={COLOR_BUILDER}
                strokeWidth={2}
                dot={{ r: 2, fill: COLOR_BUILDER, strokeWidth: 0 }}
                activeDot={{ r: 4, fill: COLOR_BUILDER, strokeWidth: 2, stroke: '#fff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Custom Legend */}
        <CustomLegend />
      </div>
    </div>
  );
};

export default UsabilityKpiTrendsChart;
