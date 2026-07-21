import { useState, useCallback, useId } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';

type SeriesKey = 'inventoryValue' | 'avgProfit' | 'vehicleCount';

const SERIES_COLORS: Record<SeriesKey, string> = {
  inventoryValue: '#8b5cf6',
  avgProfit: '#10b981',
  vehicleCount: '#3b82f6',
};

const ALL_KEYS: SeriesKey[] = ['inventoryValue', 'avgProfit', 'vehicleCount'];
const DEFAULT_VISIBLE: SeriesKey[] = ['inventoryValue', 'avgProfit'];

export interface InventoryChartPoint {
  month: string;
  inventoryValue: number;
  avgProfit: number;
  vehicleCount: number;
}

interface Props {
  loading: boolean;
  data: InventoryChartPoint[];
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
}

export default function InventoryPerformanceChart({
  loading,
  data,
  title,
  subtitle,
  headerRight,
}: Props) {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  const SERIES_CONFIG: Record<SeriesKey, { label: string; color: string }> = {
    inventoryValue: { label: dv('Valor Inventario', 'Inventory Value'), color: SERIES_COLORS.inventoryValue },
    avgProfit:      { label: dv('Utilidad Prom.', 'Avg. Profit'),       color: SERIES_COLORS.avgProfit },
    vehicleCount:   { label: dv('Cant. Vehículos', 'Vehicle Count'),    color: SERIES_COLORS.vehicleCount },
  };

  const [visible, setVisible] = useState<Set<SeriesKey>>(new Set(DEFAULT_VISIBLE));
  const uid = useId().replace(/:/g, '');

  const toggle = useCallback((key: SeriesKey) => {
    setVisible(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const tickInterval = data.length <= 6 ? 0
    : data.length <= 12 ? 1
    : data.length <= 18 ? 2
    : 3;

  // Check if we have any $ series visible (to use left axis)
  const hasMoneyAxis = visible.has('inventoryValue') || visible.has('avgProfit');
  const hasCountAxis = visible.has('vehicleCount');

  return (
    <Card className='rounded-2xl border border-slate-200/60 bg-white h-full flex flex-col'>
      <CardHeader className='pb-1 pt-3 px-3 sm:px-6 sm:pt-6 shrink-0'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-2 min-w-0'>
            <CardTitle className='text-sm sm:text-base font-semibold text-slate-900 tracking-tight'>{title}</CardTitle>
            {subtitle && (
              <span className='text-xs font-normal text-slate-400 whitespace-nowrap'>{subtitle}</span>
            )}
          </div>
          {headerRight && (
            <div className='flex justify-end'>
              {headerRight}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className='px-3 sm:px-6 flex-1 flex flex-col min-h-0'>
        <div className='min-h-[250px] sm:min-h-[300px] flex-1'>
          {loading ? (
            <div className='h-full w-full bg-slate-100 animate-pulse rounded-xl' />
          ) : (
            <ResponsiveContainer width='100%' height='100%'>
              <ComposedChart
                data={data}
                margin={{ top: 10, right: hasCountAxis ? 10 : 15, left: 0, bottom: 0 }}
              >
                <defs>
                  {ALL_KEYS.map(key => (
                    <linearGradient key={key} id={`${uid}${key}`} x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor={SERIES_CONFIG[key].color} stopOpacity={0.15} />
                      <stop offset='95%' stopColor={SERIES_CONFIG[key].color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray='3 3' stroke='rgba(0,0,0,0.04)' />
                <XAxis
                  dataKey='month'
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  interval={tickInterval}
                  angle={data.length > 12 ? -45 : 0}
                  textAnchor={data.length > 12 ? 'end' : 'middle'}
                  height={data.length > 12 ? 50 : 30}
                />
                {/* Left Y axis — money */}
                <YAxis
                  yAxisId='money'
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                  tickFormatter={(v) =>
                    v === 0 ? '0' : `$${Math.round(v / 1000)}k`
                  }
                />
                {/* Right Y axis — count */}
                {hasCountAxis && (
                  <YAxis
                    yAxisId='count'
                    orientation='right'
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                  />
                )}
                <Tooltip
                  formatter={(val: any, name: string) => {
                    if (name === SERIES_CONFIG.vehicleCount.label) return [val, name];
                    return [formatPrice(val), name];
                  }}
                />
                <ReferenceLine yAxisId='money' y={0} stroke='#e2e8f0' />
                {visible.has('inventoryValue') && (
                  <Area
                    yAxisId='money'
                    type='monotone'
                    dataKey='inventoryValue'
                    name={SERIES_CONFIG.inventoryValue.label}
                    stroke={SERIES_CONFIG.inventoryValue.color}
                    strokeWidth={2}
                    fill={`url(#${uid}inventoryValue)`}
                  />
                )}
                {visible.has('avgProfit') && (
                  <Area
                    yAxisId='money'
                    type='monotone'
                    dataKey='avgProfit'
                    name={SERIES_CONFIG.avgProfit.label}
                    stroke={SERIES_CONFIG.avgProfit.color}
                    strokeWidth={2}
                    strokeDasharray='6 3'
                    fill={`url(#${uid}avgProfit)`}
                  />
                )}
                {visible.has('vehicleCount') && (
                  <Bar
                    yAxisId={hasCountAxis ? 'count' : 'money'}
                    dataKey='vehicleCount'
                    name={SERIES_CONFIG.vehicleCount.label}
                    fill={SERIES_COLORS.vehicleCount}
                    fillOpacity={0.15}
                    stroke={SERIES_COLORS.vehicleCount}
                    strokeWidth={1}
                    radius={[4, 4, 0, 0]}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend pills */}
        <div className='flex flex-wrap justify-center sm:justify-start gap-2 mt-3 pt-3 border-t border-slate-100'>
          {ALL_KEYS.map(key => {
            const cfg = SERIES_CONFIG[key];
            return (
              <button
                key={key}
                type='button'
                onClick={() => toggle(key)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border transition-all ${
                  visible.has(key)
                    ? 'border-current opacity-100'
                    : 'border-slate-200/60 opacity-40'
                }`}
                style={{ color: cfg.color }}
              >
                <span
                  className='inline-block w-2.5 h-2.5 rounded-full'
                  style={{ backgroundColor: cfg.color }}
                />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
