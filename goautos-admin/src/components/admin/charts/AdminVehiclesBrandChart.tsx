import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { BrandDistribution } from '@/hooks/admin/types';
import { useI18n } from '@/hooks/useI18n';
import { useTranslation } from 'react-i18next';
import { Car } from 'lucide-react';

interface AdminVehiclesBrandChartProps {
  loading: boolean;
  brandDistribution: BrandDistribution[];
  totalVehicles: number;
  columnLayout?: boolean;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

const AdminVehiclesBrandChart: React.FC<AdminVehiclesBrandChartProps> = ({
  loading,
  brandDistribution,
  totalVehicles,
}) => {
  const { tCommon } = useI18n();
  const { t: tDashboard, i18n } = useTranslation('dashboard');
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);

  const chartVehicles = brandDistribution.reduce(
    (sum, item) => sum + item.value,
    0
  );
  const hasData = !loading && brandDistribution.length > 0 && chartVehicles > 0;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-40 bg-slate-100 animate-pulse rounded-lg" />
        </div>
        <div className="h-[300px] bg-slate-50 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Car className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">
                {tDashboard('charts.brandDistribution')}
              </h3>
              <p className="text-[12px] text-slate-400">
                {totalVehicles} {tDashboard('labels.vehicles')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-5 pb-3">
        {!hasData ? (
          <div className="h-[250px] flex items-center justify-center rounded-xl bg-slate-50/50">
            <p className="text-[13px] text-slate-400">{tDashboard('messages.noData')}</p>
          </div>
        ) : (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={brandDistribution.map((item) => ({
                    ...item,
                    total: totalVehicles,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {brandDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="#fff"
                      strokeWidth={3}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const item = payload[0];
                      const value = item.value || 0;
                      const total = item.payload?.total || 0;
                      const percent = total > 0 ? (value / total) * 100 : 0;
                      return (
                        <div className="rounded-xl bg-white/95 backdrop-blur-lg shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] border border-slate-200/60 px-3.5 py-2.5 space-y-0.5">
                          <p className="text-[12px] font-semibold text-slate-900">{item.name}</p>
                          <p className="text-[12px] text-slate-600">
                            {value} {tDashboard('labels.vehicles')} ({percent.toFixed(1)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legend as pills */}
      {hasData && (
        <div className="px-5 pb-5">
          <div className="flex flex-wrap gap-2">
            {brandDistribution.map((entry, index) => {
              const percentage = totalVehicles > 0
                ? ((entry.value / totalVehicles) * 100).toFixed(0)
                : '0';
              return (
                <div key={entry.name} className="flex items-center gap-1.5 text-[11px]">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-slate-600 font-medium">{entry.name}</span>
                  <span className="text-slate-400">({percentage}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVehiclesBrandChart;
