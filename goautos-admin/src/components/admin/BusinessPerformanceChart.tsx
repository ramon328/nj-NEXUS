import { useState, useCallback, useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';

type SeriesKey = 'sales' | 'costs' | 'margin' | 'inventory';

const SERIES_COLORS: Record<SeriesKey, string> = {
  sales: '#38bdf8',
  costs: '#f43f5e',
  margin: '#22c55e',
  inventory: '#8b5cf6',
};

const ALL_KEYS: SeriesKey[] = ['sales', 'costs', 'inventory', 'margin'];
const DEFAULT_VISIBLE: SeriesKey[] = ['sales', 'costs', 'inventory', 'margin'];

interface Props {
  loading: boolean;
  data: { month: string; sales: number; costs: number; margin: number; inventory: number }[];
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
}

export default function BusinessPerformanceChart({
  loading,
  data,
  title,
  subtitle,
  headerRight,
}: Props) {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation('dashboard');

  const SERIES_CONFIG: Record<SeriesKey, { label: string; color: string }> = {
    sales:     { label: t('businessPerformance.sales'),          color: SERIES_COLORS.sales },
    costs:     { label: t('businessPerformance.costs'),          color: SERIES_COLORS.costs },
    margin:    { label: t('businessPerformance.margin'),         color: SERIES_COLORS.margin },
    inventory: { label: t('businessPerformance.inventoryValue'), color: SERIES_COLORS.inventory },
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

  // Detectar puntos de cambio de año (donde "Ene" aparece después de "Dic")
  const yearBreaks: string[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].month.startsWith('Ene') && data[i - 1].month.startsWith('Dic')) {
      yearBreaks.push(data[i].month);
    }
  }

  // Calcular intervalo de ticks según cantidad de datos
  const tickInterval = data.length <= 6 ? 0
    : data.length <= 12 ? 1
    : data.length <= 18 ? 2
    : 3;

  return (
    <Card className='rounded-2xl border border-slate-200/60 bg-white'>
      <CardHeader className='pb-1 pt-3 px-3 sm:px-6 sm:pt-6'>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-2 min-w-0'>
            <CardTitle className='text-sm sm:text-base font-semibold text-[#171717] tracking-tight'>{title}</CardTitle>
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
      <CardContent className='px-3 sm:px-6'>
        <div className='h-[250px] sm:h-[300px] md:h-[350px]'>
          {loading ? (
            <div className='h-full w-full bg-slate-100 animate-pulse rounded-xl' />
          ) : data.length === 0 || data.every(d => d.sales === 0 && d.costs === 0 && d.margin === 0) ? (
            <div className='h-full flex flex-col items-center justify-center text-slate-400'>
              <BarChart3 className='h-10 w-10 mb-2 text-slate-300' />
              <p className='text-sm font-medium'>Sin información para el período seleccionado</p>
            </div>
          ) : (
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart
                data={data}
                margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
              >
                <defs>
                  {ALL_KEYS.map(key => (
                    <linearGradient key={key} id={`${uid}${key}`} x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor={SERIES_CONFIG[key].color} stopOpacity={0.12} />
                      <stop offset='95%' stopColor={SERIES_CONFIG[key].color} stopOpacity={0.03} />
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
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
                  width={55}
                  tickFormatter={(v) => {
                    if (v === 0) return '0';
                    if (Math.abs(v) >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
                    if (Math.abs(v) >= 1_000_000) return `$${Math.round(v / 1_000_000)}M`;
                    if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`;
                    return `$${v}`;
                  }}
                />
                <Tooltip
                  formatter={(val: any, name: string) => [formatPrice(val), name]}
                />
                {/* Líneas verticales en cambio de año */}
                {yearBreaks.map(monthKey => (
                  <ReferenceLine
                    key={monthKey}
                    x={monthKey}
                    stroke='#d1d5db'
                    strokeDasharray='4 4'
                    strokeWidth={1.5}
                  />
                ))}
                {ALL_KEYS.map(key =>
                  visible.has(key) ? (
                    <Area
                      key={key}
                      type='monotone'
                      dataKey={key}
                      name={SERIES_CONFIG[key].label}
                      stroke={SERIES_CONFIG[key].color}
                      strokeWidth={2}
                      strokeDasharray={key === 'inventory' ? '6 3' : undefined}
                      fill={`url(#${uid}${key})`}
                    />
                  ) : null
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend pills — below chart */}
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
