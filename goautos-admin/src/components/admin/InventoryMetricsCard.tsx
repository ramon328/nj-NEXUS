import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingUp, TrendingDown, DollarSign, Package, Clock, Globe, RotateCcw } from 'lucide-react';

interface InventoryMetricsCardProps {
  totalInventoryValue: number;
  averageVehiclePrice: number;
  avgPurchasePrice: number;
  inventoryTurnoverRate: number;
  totalActiveVehicles: number;
  oldestVehicleDays?: number;
  newestVehicleDays?: number;
  oldestPublishedDays?: number;
  avgDaysPublished?: number;
  loading: boolean;
}

const InventoryMetricsCard: React.FC<InventoryMetricsCardProps> = ({
  totalInventoryValue,
  averageVehiclePrice,
  avgPurchasePrice,
  inventoryTurnoverRate,
  totalActiveVehicles,
  oldestVehicleDays = 0,
  newestVehicleDays = 0,
  oldestPublishedDays,
  avgDaysPublished,
  loading,
}) => {
  const { i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);

  const potentialProfit = averageVehiclePrice - avgPurchasePrice;
  const rawMargin = avgPurchasePrice > 0 ? ((potentialProfit / avgPurchasePrice) * 100) : 0;
  const potentialMargin = Math.min(Math.max(rawMargin, -100), 500);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 h-full">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-40 bg-slate-100 animate-pulse rounded-lg" />
        </div>
        <div className="h-20 bg-slate-50 animate-pulse rounded-xl mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: dv('Prom. Venta', 'Avg. Sale'),
      value: formatPrice(averageVehiclePrice),
      icon: TrendingUp,
      color: 'text-slate-900',
      bg: 'bg-slate-50/80',
    },
    {
      label: dv('Prom. Compra', 'Avg. Purchase'),
      value: formatPrice(avgPurchasePrice),
      icon: TrendingDown,
      color: 'text-slate-900',
      bg: 'bg-slate-50/80',
    },
    {
      label: dv('Margen Potencial', 'Potential Margin'),
      value: `${potentialMargin.toFixed(1)}%`,
      icon: DollarSign,
      color: potentialMargin > 0 ? 'text-emerald-600' : 'text-red-600',
      bg: potentialMargin > 0 ? 'bg-emerald-50/60' : 'bg-red-50/60',
    },
    {
      label: dv('Rotación', 'Turnover'),
      value: inventoryTurnoverRate.toFixed(2),
      icon: RotateCcw,
      color: 'text-slate-900',
      bg: 'bg-slate-50/80',
    },
    {
      label: dv('Más Antiguo', 'Oldest'),
      value: `${Math.round(oldestVehicleDays)}d`,
      icon: Clock,
      color: oldestVehicleDays > 90 ? 'text-red-700' : 'text-amber-700',
      bg: oldestVehicleDays > 90 ? 'bg-red-50/60' : 'bg-amber-50/60',
    },
    {
      label: dv('Más Reciente', 'Newest'),
      value: `${Math.round(newestVehicleDays)}d`,
      icon: Clock,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50/60',
    },
    ...(oldestPublishedDays !== undefined ? [{
      label: dv('Antiguo Pub.', 'Oldest Pub.'),
      value: `${Math.round(oldestPublishedDays)}d`,
      icon: Globe,
      color: oldestPublishedDays > 90 ? 'text-red-700' : 'text-amber-700',
      bg: oldestPublishedDays > 90 ? 'bg-red-50/60' : 'bg-amber-50/60',
    }] : []),
    ...(avgDaysPublished !== undefined ? [{
      label: dv('Prom. Pub.', 'Avg. Pub.'),
      value: `${Math.round(avgDaysPublished)}d`,
      icon: Globe,
      color: 'text-blue-700',
      bg: 'bg-blue-50/60',
    }] : []),
  ];

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">
              {dv('Métricas de Inventario', 'Inventory Metrics')}
            </h3>
            <p className="text-[12px] text-slate-400">
              {totalActiveVehicles} {dv('vehículos activos', 'active vehicles')}
            </p>
          </div>
        </div>
      </div>

      {/* Body: Hero + Metrics Grid */}
      <div className="px-5 pb-5">
        <div className="flex flex-col gap-3">
          {/* Hero: Total Inventory Value */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl p-4 flex flex-col justify-center">
            <p className="text-[11px] text-blue-600 font-medium uppercase tracking-wider">
              {dv('Valor del Inventario', 'Inventory Value')}
            </p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
              {formatPrice(totalInventoryValue)}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[12px] text-blue-600 font-medium">
                {totalActiveVehicles} {dv('activos', 'active')}
              </span>
            </div>
          </div>

          {/* Metrics Grid — vertical when in sidebar */}
          <div className="grid grid-cols-2 gap-2">
            {metrics.map((metric, i) => {
              const Icon = metric.icon;
              return (
                <div key={i} className={`${metric.bg} rounded-xl p-3 flex flex-col justify-between min-h-[60px]`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="text-[10px] text-slate-500 font-medium truncate">{metric.label}</span>
                  </div>
                  <p className={`text-[15px] font-bold ${metric.color} truncate`}>{metric.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryMetricsCard;
