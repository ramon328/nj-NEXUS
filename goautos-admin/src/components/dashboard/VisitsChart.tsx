import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import CustomTooltip from './CustomTooltip';
import { BarChart3, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VisitsChartProps {
  loading: boolean;
  monthlyData: { month: string; visits: number; leads?: number; sales?: number }[];
  filtroLabel?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
}

const VisitsChart = ({
  loading,
  monthlyData,
  filtroLabel,
  subtitle,
  headerRight,
}: VisitsChartProps) => {
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  const isDaily =
    monthlyData.length > 0 &&
    /[a-z]{3}/i.test(monthlyData[0].month) &&
    /\d{2}-\d{2}/.test(monthlyData[0].month);

  const hasData = monthlyData.length > 0 && monthlyData.some(d => d.visits > 0 || (d.leads ?? 0) > 0);

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white p-4 sm:p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[14px] font-semibold text-slate-900">
              {filtroLabel || dv('Visitas', 'Visits')}
            </h3>
            {subtitle && (
              <span className="text-[12px] text-slate-400 font-normal">{subtitle}</span>
            )}
            <TooltipProvider>
              <Tooltip delayDuration={100}>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-slate-300 hover:text-slate-500 transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px]">
                  <p className="text-[12px]">
                    {dv(
                      'Un visitante único se cuenta una sola vez por día, sin importar cuántas páginas visite.',
                      'A unique visitor is counted once per day, regardless of how many pages they visit.'
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span className="text-[11px] text-slate-400">{dv('Visitas', 'Visits')}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-[11px] text-slate-400">Leads</span>
            </span>
          </div>
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[250px] sm:min-h-[280px]">
        {loading ? (
          <div className="h-full bg-slate-50 animate-pulse rounded-xl" />
        ) : !hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <BarChart3 className="h-10 w-10 mb-2 text-slate-300" />
            <p className="text-sm font-medium">{dv('Sin información para el período seleccionado', 'No data for the selected period')}</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                interval={isDaily ? 0 : undefined}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <RechartsTooltip
                content={
                  <CustomTooltip
                    multiLine
                    labels={{ visits: dv('Visitas', 'Visits'), leads: 'Leads' }}
                  />
                }
                cursor={{ stroke: '#0ea5e9', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="visits"
                name={dv('Visitas', 'Visits')}
                stroke="#0ea5e9"
                strokeWidth={2}
                fill="url(#visitsFill)"
                dot={{ r: 3, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="leads"
                name="Leads"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#leadsFill)"
                dot={{ r: 3, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default VisitsChart;
