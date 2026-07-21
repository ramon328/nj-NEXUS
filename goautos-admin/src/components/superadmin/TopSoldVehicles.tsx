import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { ShoppingCart, TrendingUp, Car } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

type TopSoldVehicle = {
  id: number;
  brand: string;
  model: string;
  vehicle_type: string;
  total_sold: number;
  avg_price: number;
  total_clients: number;
};

type TopSoldCategory = {
  name: string;
  total_sold: number;
};

interface TopSoldVehiclesProps {
  modelsData: TopSoldVehicle[];
  typesData: TopSoldCategory[];
  loading: boolean;
  selectedClientName?: string;
}

type ViewType = 'model' | 'type';

// Subtle slate-to-blue gradient for bars
const BAR_GRADIENT = { start: '#64748b', end: '#475569' };

// Custom Y-axis tick with primary (brand + model) and secondary (variant) styling
const CustomYAxisTick = ({ x, y, payload, chartData }: any) => {
  // Find the full data for this item
  const itemData = chartData?.find((d: any) => d.name === payload.value);

  if (!itemData) {
    // Fallback for types view or if data not found
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={-8}
          y={4}
          textAnchor="end"
          fill="#1e293b"
          fontSize={11}
          fontWeight={600}
        >
          {payload.value}
        </text>
      </g>
    );
  }

  const { brand, modelName, variant } = itemData;
  const primaryText = brand ? `${brand} ${modelName}` : modelName;
  const secondaryText = variant || '';

  // Calculate positions
  const hasSecondary = secondaryText.length > 0;
  const primaryY = hasSecondary ? -4 : 4;
  const secondaryY = 10;

  return (
    <g transform={`translate(${x},${y})`}>
      {/* Primary text: Brand + Model name - bold and dark */}
      <text
        x={-8}
        y={primaryY}
        textAnchor="end"
        fill="#1e293b"
        fontSize={11}
        fontWeight={600}
      >
        {primaryText}
      </text>
      {/* Secondary text: Variant - smaller and lighter */}
      {hasSecondary && (
        <text
          x={-8}
          y={secondaryY}
          textAnchor="end"
          fill="#94a3b8"
          fontSize={9}
          fontWeight={400}
        >
          {secondaryText.length > 28 ? secondaryText.substring(0, 26) + '...' : secondaryText}
        </text>
      )}
    </g>
  );
};

const CustomTooltip = ({ active, payload, label, isModelView, selectedClientName }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200/60 rounded-xl p-3 sm:p-4 shadow-lg">
        <p className="font-semibold text-sm sm:text-base text-slate-800 mb-2">{label}</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <p className="text-slate-700 font-semibold text-[13px]">
              {data.sold} unidades vendidas
            </p>
          </div>
          {isModelView && !selectedClientName && data.totalClients && (
            <p className="text-slate-400 text-xs sm:text-[13px]">
              Vendido por {data.totalClients} automotora(s)
            </p>
          )}
          {isModelView && (
            <>
              <p className="text-slate-400 text-xs sm:text-[13px]">
                Tipo: {data.type}
              </p>
              <p className="text-slate-700 text-xs sm:text-[13px] font-medium">
                Precio promedio: {formatCurrency(data.avgPrice)}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const TopSoldVehicles: React.FC<TopSoldVehiclesProps> = ({
  modelsData,
  typesData,
  loading,
  selectedClientName,
}) => {
  const [viewType, setViewType] = useState<ViewType>('model');

  const SkeletonLoader = () => (
    <div className="space-y-2 sm:space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex items-center gap-2 sm:gap-3">
          <div className="w-20 sm:w-32 h-3 sm:h-4 bg-slate-200 rounded animate-pulse" />
          <div className="flex-1 h-6 sm:h-8 bg-slate-100 rounded animate-pulse" style={{ width: `${100 - i * 10}%` }} />
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-xl bg-white border border-slate-200/60">
        <div className="p-4 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="bg-slate-100 rounded-lg p-2">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
            </div>
            <div className="h-5 sm:h-6 w-28 sm:w-36 bg-slate-200 rounded animate-pulse" />
          </div>
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  const isModelView = viewType === 'model';

  const chartData = isModelView
    ? modelsData.map((vehicle) => {
        // Separate model name from variant/version
        const modelParts = vehicle.model.split(' ');
        // First 1-2 words are usually the model name, rest is variant
        const modelName = modelParts.slice(0, 2).join(' ');
        const variant = modelParts.slice(2).join(' ');

        return {
          name: `${vehicle.brand} ${vehicle.model}`,
          brand: vehicle.brand,
          modelName: modelName,
          variant: variant,
          sold: vehicle.total_sold,
          avgPrice: vehicle.avg_price,
          totalClients: vehicle.total_clients,
          type: vehicle.vehicle_type,
        };
      })
    : typesData.map((category) => ({
        name: category.name,
        brand: '',
        modelName: category.name,
        variant: '',
        sold: category.total_sold,
      }));

  const title = isModelView ? 'Modelos Más Vendidos' : 'Tipos Más Vendidos';
  const description = selectedClientName
    ? `Top 10 para ${selectedClientName}`
    : 'Top 10 entre todas las automotoras';

  // Calculate total for percentage display
  const totalSold = chartData.reduce((acc, item) => acc + item.sold, 0);

  return (
    <div className="rounded-xl bg-white border border-slate-200/60">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-slate-100 rounded-lg p-2">
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
              <p className="text-[10px] sm:text-xs text-slate-400">{description}</p>
            </div>
          </div>

          {/* Toggle buttons — pill style */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 self-start sm:self-auto">
            <button
              onClick={() => setViewType('model')}
              className={cn(
                'px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-full transition-colors',
                viewType === 'model'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              )}
            >
              Modelo
            </button>
            <button
              onClick={() => setViewType('type')}
              className={cn(
                'px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-full transition-colors',
                viewType === 'type'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-200/60'
              )}
            >
              Tipo
            </button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span className="text-[10px] sm:text-xs text-slate-400">Total Vendidos</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-slate-800">{totalSold.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Car className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500" />
              <span className="text-[10px] sm:text-xs text-slate-400">Variantes</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-slate-800">{chartData.length}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[320px] sm:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={180}
                axisLine={false}
                tickLine={false}
                tick={(props: any) => <CustomYAxisTick {...props} chartData={chartData} />}
                interval={0}
              />
              <Tooltip
                content={<CustomTooltip isModelView={isModelView} selectedClientName={selectedClientName} />}
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              />
              <Bar
                dataKey="sold"
                radius={[4, 4, 4, 4]}
                barSize={22}
                fill="url(#soldGradient)"
              />
              <defs>
                <linearGradient
                  id="soldGradient"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor={BAR_GRADIENT.start} />
                  <stop offset="100%" stopColor={BAR_GRADIENT.end} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TopSoldVehicles;
