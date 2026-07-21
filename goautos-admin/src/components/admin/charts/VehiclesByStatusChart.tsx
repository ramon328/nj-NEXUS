import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface VehiclesByStatusChartProps {
  loading: boolean;
  statusData: Array<{ status: string; count: number; percentage: number }>;
  title?: string;
}

const STATUS_COLORS: Record<string, string> = {
  'Disponible': '#0ea5e9',
  'Reservado': '#3b82f6',
  'En revisión': '#818cf8',
  'En preparación': '#7dd3fc',
  'Publicado': '#38bdf8',
  'No publicado': '#94a3b8',
};

const DEFAULT_COLORS = ['#0ea5e9', '#3b82f6', '#7dd3fc', '#818cf8', '#94a3b8', '#bae6fd', '#6366f1', '#cbd5e1'];

const getStatusColor = (status: string, index: number): string => {
  return STATUS_COLORS[status] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
};

const VehiclesByStatusChart: React.FC<VehiclesByStatusChartProps> = ({
  loading,
  statusData,
  title,
}) => {
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);

  const totalVehicles = statusData?.reduce((sum, item) => sum + item.count, 0) || 0;

  const chartHeight = Math.max(120, (statusData?.length || 0) * 44 + 40);

  // Calculate dynamic Y-axis width based on longest status name
  const maxLabelLen = statusData?.reduce((max, s) => Math.max(max, s.status.length), 0) || 0;
  const yAxisWidth = Math.min(130, Math.max(80, maxLabelLen * 7));

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5">
        <div className="h-4 w-40 bg-slate-100 animate-pulse rounded-lg mb-1" />
        <div className="h-3 w-28 bg-slate-100 animate-pulse rounded-lg mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 w-20 bg-slate-100 animate-pulse rounded" />
              <div className="flex-1 h-6 bg-slate-50 animate-pulse rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!statusData || statusData.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm sm:text-base font-semibold text-[#171717]">
            {title || dv('Distribución por estado', 'Distribution by Status')}
          </h3>
        </div>
        <div className="px-5 pb-5">
          <div className="h-[120px] flex items-center justify-center rounded-xl bg-slate-50/50">
            <p className="text-[13px] text-slate-400">{dv('No hay datos disponibles', 'No data available')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm sm:text-base font-semibold text-[#171717]">
          {title || dv('Distribución por estado', 'Distribution by Status')}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {totalVehicles} {dv('vehículos en total', 'total vehicles')}
        </p>
      </div>

      {/* Horizontal bar chart */}
      <div className="px-3 sm:px-5 pb-5">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={statusData}
              layout="vertical"
              margin={{ top: 0, right: 15, left: 5, bottom: 0 }}
            >
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="status"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={yAxisWidth}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl bg-slate-900 text-white px-3 py-2 space-y-0.5">
                        <p className="text-[12px] font-semibold">{data.status}</p>
                        <p className="text-[12px] text-slate-300">
                          {data.count} {dv('vehículos', 'vehicles')} · {data.percentage.toFixed(1)}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getStatusColor(entry.status, index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default VehiclesByStatusChart;
