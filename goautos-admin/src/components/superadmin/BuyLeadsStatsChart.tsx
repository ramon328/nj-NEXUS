import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { HandCoins, FileText, CreditCard, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuyLeadsStatsChartProps {
  consignacionData: { id: number; name: string; total: number }[];
  directaData: { id: number; name: string; total: number }[];
  financiamientoData: { id: number; name: string; total: number }[];
  loading?: boolean;
  emptyMessages: {
    consignacion: string;
    directa: string;
    financiamiento: string;
  };
}

// Gradient colors for each tab
const TAB_COLORS = {
  consignacion: { start: '#3b82f6', end: '#2563eb', accent: 'blue' },
  directa: { start: '#10b981', end: '#059669', accent: 'emerald' },
  financiamiento: { start: '#f59e0b', end: '#d97706', accent: 'amber' },
};

const CustomTooltip = ({ active, payload, tab }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    const colors = TAB_COLORS[tab as keyof typeof TAB_COLORS];
    return (
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200 rounded-xl p-3 sm:p-4 shadow-2xl">
        <p className="font-bold text-sm sm:text-base text-gray-900 mb-2">{entry.name}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.start }} />
          <p className="font-semibold text-sm" style={{ color: colors.start }}>
            {entry.total} leads
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const BuyLeadsStatsChart: React.FC<BuyLeadsStatsChartProps> = ({
  consignacionData,
  directaData,
  financiamientoData,
  loading,
  emptyMessages,
}) => {
  const [tab, setTab] = useState<'consignacion' | 'directa' | 'financiamiento'>('consignacion');

  const getTabData = () => {
    switch (tab) {
      case 'directa':
        return {
          data: directaData,
          emptyMessage: emptyMessages.directa,
          title: 'Leads de Compra Directa',
          subtitle: 'Top 10 automotoras por leads de compra directa',
          colors: TAB_COLORS.directa,
          Icon: FileText,
        };
      case 'financiamiento':
        return {
          data: financiamientoData,
          emptyMessage: emptyMessages.financiamiento,
          title: 'Leads de Financiamiento',
          subtitle: 'Top 10 automotoras por solicitudes de financiamiento',
          colors: TAB_COLORS.financiamiento,
          Icon: CreditCard,
        };
      default:
        return {
          data: consignacionData,
          emptyMessage: emptyMessages.consignacion,
          title: 'Leads de Compra por Consignación',
          subtitle: 'Top 10 automotoras por leads de consignación',
          colors: TAB_COLORS.consignacion,
          Icon: HandCoins,
        };
    }
  };

  const { data, emptyMessage, title, subtitle, colors, Icon } = getTabData();
  const totalLeads = data.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Background effects */}
      <div className="absolute -right-16 -top-16 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-blue-50 blur-3xl opacity-60" />
      <div className="absolute -left-16 -bottom-16 h-32 w-32 sm:h-40 sm:w-40 rounded-full bg-emerald-50 blur-3xl opacity-60" />

      <div className="relative p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl shadow-lg"
              style={{ background: `linear-gradient(135deg, ${colors.start}, ${colors.end})` }}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-[10px] sm:text-xs text-gray-500">{subtitle}</p>
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg sm:rounded-xl bg-gray-100 border border-gray-200 self-start sm:self-auto">
            <button
              onClick={() => setTab('consignacion')}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md sm:rounded-lg transition-all duration-200',
                tab === 'consignacion'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              )}
            >
              <HandCoins className="h-3 w-3" />
              <span className="hidden lg:inline">Consignación</span>
            </button>
            <button
              onClick={() => setTab('directa')}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md sm:rounded-lg transition-all duration-200',
                tab === 'directa'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              )}
            >
              <FileText className="h-3 w-3" />
              <span className="hidden lg:inline">Directa</span>
            </button>
            <button
              onClick={() => setTab('financiamiento')}
              className={cn(
                'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-md sm:rounded-lg transition-all duration-200',
                tab === 'financiamiento'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              )}
            >
              <CreditCard className="h-3 w-3" />
              <span className="hidden lg:inline">Financiamiento</span>
            </button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div
            className="rounded-lg sm:rounded-xl border p-2.5 sm:p-3"
            style={{
              background: `linear-gradient(135deg, ${colors.start}10, ${colors.start}05)`,
              borderColor: `${colors.start}30`
            }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: colors.start }} />
              <span className="text-[10px] sm:text-xs text-gray-600">Total Leads</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{totalLeads.toLocaleString()}</p>
          </div>
          <div className="rounded-lg sm:rounded-xl bg-gray-50 border border-gray-100 p-2.5 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
              <span className="text-[10px] sm:text-xs text-gray-600">Automotoras</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-900">{data.length}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[280px] sm:h-[320px]">
          {loading ? (
            <div className="space-y-2 sm:space-y-3 h-full flex flex-col justify-center">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 sm:gap-3">
                  <div className="w-24 sm:w-32 h-3 sm:h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="flex-1 h-6 sm:h-7 bg-gray-100 rounded animate-pulse" style={{ width: `${100 - i * 12}%` }} />
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs sm:text-sm">
              {emptyMessage || 'No hay datos para mostrar.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                barCategoryGap={12}
              >
                <defs>
                  <linearGradient id={`leadsGradient-${tab}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={colors.start} />
                    <stop offset="100%" stopColor={colors.end} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={true} vertical={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 9, fill: '#374151', fontWeight: 500 }}
                  width={100}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip tab={tab} />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar
                  dataKey="total"
                  fill={`url(#leadsGradient-${tab})`}
                  radius={[4, 4, 4, 4]}
                  barSize={20}
                >
                  <LabelList
                    dataKey="total"
                    position="right"
                    fill="#374151"
                    fontWeight={600}
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

const AllBuyLeadsStatsChart: React.FC<BuyLeadsStatsChartProps> = ({
  consignacionData,
  loading,
  emptyMessages,
}) => {
  const data = consignacionData;
  const emptyMessage = emptyMessages.consignacion;

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-white border border-gray-100 shadow-lg">
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-emerald-50 blur-3xl opacity-60" />

      <div className="relative p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
            <HandCoins className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900">Todos los Leads de Consignación</h3>
            <p className="text-[10px] sm:text-xs text-gray-500">Top 10 automotoras por leads</p>
          </div>
        </div>

        <div className="h-[280px] sm:h-[320px]">
          {loading ? (
            <div className="h-full w-full bg-gray-100 animate-pulse rounded-lg" />
          ) : data.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-xs sm:text-sm">
              {emptyMessage || 'No hay datos para mostrar.'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                barCategoryGap={12}
              >
                <defs>
                  <linearGradient id="allLeadsGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#374151', fontWeight: 500 }} width={100} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip tab="directa" />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="total" fill="url(#allLeadsGradient)" radius={[4, 4, 4, 4]} barSize={20}>
                  <LabelList dataKey="total" position="right" fill="#374151" fontWeight={600} fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export { AllBuyLeadsStatsChart };
export default BuyLeadsStatsChart;
