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
import { TrendingUp, Building2 } from 'lucide-react';
import { TimeRange } from './TimeRangeSelector';
import BarChartDealers from './BarChartDealers';
import { cn } from '@/lib/utils';

// Slate gradient colors
const BAR_GRADIENT = { start: '#64748b', end: '#475569' };

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-lg">
        <p className="font-bold text-sm sm:text-base text-slate-900 mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-500" />
          <p className="text-slate-600 font-semibold text-sm">
            {payload[0].value} vehículos agregados
          </p>
        </div>
      </div>
    );
  }
  return null;
};

interface BarChartVehiclesProps {
  loading: boolean;
  monthlyData: {
    month: string;
    vehiclesAdded: number;
  }[];
  weeklyData?: {
    week: string;
    vehiclesAdded: number;
  }[];
  dailyData?: {
    month: string;
    vehiclesAdded: number;
  }[];
  timeRange: TimeRange;
  vehiclesByDealerData: { name: string; vehiclesAdded: number }[];
  vehiclesByDateData: { date: string; vehiclesAdded: number }[];
}

const SkeletonChart = () => (
  <div className="h-[280px] sm:h-[300px] flex items-end gap-1.5 sm:gap-2 px-2 sm:px-4">
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="flex-1 bg-slate-100 rounded-t animate-pulse"
        style={{ height: `${30 + Math.random() * 50}%` }}
      />
    ))}
  </div>
);

const BarChartVehiclesContent: React.FC<{
  data: { date: string; vehiclesAdded: number }[];
  timeRange: TimeRange;
}> = ({ data, timeRange }) => {
  const formatXAxis = (value: string) => {
    if (!value) return '';
    return value;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        barGap={4}
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BAR_GRADIENT.start} />
            <stop offset="100%" stopColor={BAR_GRADIENT.end} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(0,0,0,0.06)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
          angle={timeRange === '6months' || timeRange === '1year' || timeRange === 'all' ? -20 : 0}
          textAnchor={timeRange === '6months' || timeRange === '1year' || timeRange === 'all' ? 'end' : 'middle'}
          height={50}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar
          dataKey="vehiclesAdded"
          fill="url(#barGradient)"
          radius={[6, 6, 0, 0]}
          maxBarSize={50}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

interface BarChartVehiclesTabsProps extends BarChartVehiclesProps {
  vehiclesByDealerData: { name: string; vehiclesAdded: number }[];
}

const BarChartVehiclesTabs: React.FC<BarChartVehiclesTabsProps> = (props) => {
  const [tab, setTab] = React.useState<'fecha' | 'automotora'>('fecha');

  const getChartTitle = () => {
    if (tab === 'automotora') return 'Top Automotoras por Vehículos';
    switch (props.timeRange) {
      case '7days':
        return 'Vehículos Agregados (7 días)';
      case '30days':
        return 'Vehículos Agregados (30 días)';
      case '6months':
        return 'Vehículos Agregados (6 meses)';
      case '1year':
        return 'Vehículos Agregados (Anual)';
      case 'all':
        return 'Vehículos Agregados (Histórico)';
      default:
        return 'Vehículos Agregados';
    }
  };

  const getChartSubtitle = () => {
    if (tab === 'automotora')
      return 'Top 10 automotoras por vehículos subidos en el período';
    return 'Tendencia de vehículos agregados al inventario';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/60">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-slate-100 rounded-lg p-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{getChartTitle()}</h3>
              <p className="text-[10px] sm:text-xs text-slate-500">{getChartSubtitle()}</p>
            </div>
          </div>

          {/* Tab toggle — pill style */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 self-start sm:self-auto">
            <button
              onClick={() => setTab('fecha')}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-full transition-colors',
                tab === 'fecha'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              )}
            >
              <TrendingUp className="h-3 w-3" />
              General
            </button>
            <button
              onClick={() => setTab('automotora')}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-full transition-colors',
                tab === 'automotora'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              )}
            >
              <Building2 className="h-3 w-3" />
              Por Automotora
            </button>
          </div>
        </div>

        {/* Chart content */}
        <div className="h-[280px] sm:h-[320px]">
          {tab === 'fecha' ? (
            props.loading ? (
              <SkeletonChart />
            ) : (
              <BarChartVehiclesContent
                data={props.vehiclesByDateData}
                timeRange={props.timeRange}
              />
            )
          ) : (
            <BarChartDealers
              loading={props.loading}
              vehiclesByDealerData={props.vehiclesByDealerData}
              timeRange={props.timeRange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BarChartVehiclesTabs;
