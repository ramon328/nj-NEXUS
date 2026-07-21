import React from 'react';
import { CostItem } from '@/hooks/admin/useCostsSummary';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Receipt, Users } from 'lucide-react';

interface CostsSummaryCardsProps {
  costs: CostItem[];
  loading: boolean;
  onVehicleClick: (vehicleId: number) => void;
}

const typeConfig: Record<string, { label: { es: string; en: string }; color: string; bgColor: string; iconBg: string; badgeBg: string; Icon: React.FC<{ className?: string }> }> = {
  acquisition: {
    label: { es: 'Adquisición', en: 'Acquisition' },
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
    iconBg: 'bg-blue-100 text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-600',
    Icon: ShoppingCart,
  },
  expense: {
    label: { es: 'Gasto', en: 'Expense' },
    color: '#ef4444',
    bgColor: 'bg-red-50',
    iconBg: 'bg-red-100 text-red-600',
    badgeBg: 'bg-red-50 text-red-600',
    Icon: Receipt,
  },
  commission: {
    label: { es: 'Comisión', en: 'Commission' },
    color: '#f59e0b',
    bgColor: 'bg-amber-50',
    iconBg: 'bg-amber-100 text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-600',
    Icon: Users,
  },
};

export const CostsSummaryCards: React.FC<CostsSummaryCardsProps> = ({
  costs,
  loading,
  onVehicleClick,
}) => {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const isEs = i18n.language?.toLowerCase().startsWith('es');
  const dv = (es: string, en: string) => isEs ? es : en;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200/60 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-slate-100 animate-pulse rounded-lg" />
              <div className="h-4 w-32 bg-slate-100 animate-pulse rounded-lg" />
            </div>
            <div className="h-3 w-40 bg-slate-100 animate-pulse rounded-lg" />
            <div className="h-5 w-24 bg-slate-100 animate-pulse rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (costs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">
          {dv('No hay costos para mostrar', 'No costs to display')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {costs.map((cost) => {
        const config = typeConfig[cost.type] || typeConfig.expense;
        const { Icon } = config;
        const categoryName = isEs ? cost.categoryNameEs : cost.categoryNameEn;
        const typeLabel = isEs ? config.label.es : config.label.en;

        return (
          <div
            key={cost.id}
            className="rounded-2xl border border-slate-200/60 p-4 transition-shadow space-y-2.5"
          >
            {/* Fila 1: Icono + título + vehículo */}
            <div className="flex items-center gap-2.5">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${config.iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[14px] font-semibold text-slate-900 line-clamp-1">
                  {cost.title}
                </span>
              </div>
            </div>

            {/* Fila 2: Descripción (si existe) */}
            {cost.description && (
              <p className="text-[12px] text-slate-500 line-clamp-2">{cost.description}</p>
            )}

            {/* Fila 3: Fecha · categoría · vehículo */}
            <div className="flex items-center gap-1.5 text-[13px] text-slate-500 flex-wrap">
              <span>{formatDate(cost.createdAt)}</span>
              <span className="text-slate-300">·</span>
              <span className="truncate">{categoryName}</span>
              {cost.vehicleId && (
                <>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => onVehicleClick(cost.vehicleId!)}
                    className="text-primary hover:text-primary/80 hover:underline cursor-pointer truncate"
                  >
                    {cost.vehicleInfo}
                  </button>
                </>
              )}
            </div>

            {/* Fila 4: Monto + badge tipo */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${config.badgeBg}`}>
                {typeLabel}
              </span>
              <span className="text-[15px] font-semibold text-red-600">
                {formatPrice(cost.amount)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
