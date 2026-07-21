import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';

interface InventoryHealthCardProps {
  loading: boolean;
  ownStockValue: number;
  consignedStockValue: number;
  consignedStockCount: number;
  avgPurchasePrice: number;
  averageVehiclePrice: number;
  inventoryTurnoverRate: number;
  oldestVehicleDays: number;
}

export default function InventoryHealthCard({
  loading,
  ownStockValue,
  consignedStockValue,
  consignedStockCount,
  avgPurchasePrice,
  averageVehiclePrice,
  inventoryTurnoverRate,
  oldestVehicleDays,
}: InventoryHealthCardProps) {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);

  const margin = avgPurchasePrice > 0
    ? ((averageVehiclePrice - avgPurchasePrice) / avgPurchasePrice * 100)
    : 0;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const metrics: Array<{
    label: string;
    value: string;
    bold?: boolean;
    color?: string;
    sub?: string;
  }> = [
    {
      label: dv('Capital propio invertido', 'Own capital invested'),
      value: formatPrice(ownStockValue),
      bold: true,
      sub: consignedStockCount > 0
        ? dv(
            `+ ${consignedStockCount} consignados (${formatPrice(consignedStockValue)})`,
            `+ ${consignedStockCount} consigned (${formatPrice(consignedStockValue)})`
          )
        : undefined,
    },
    {
      label: dv('Margen Promedio', 'Avg Margin'),
      value: `${margin.toFixed(1)}%`,
      color: margin >= 0 ? 'text-emerald-600' : 'text-red-600',
    },
    {
      label: dv('Rotación', 'Turnover'),
      value: inventoryTurnoverRate.toFixed(2),
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white">
      <div className="px-5 pt-5 pb-4">
        <h3 className="text-sm sm:text-base font-semibold text-[#171717]">
          {dv('Salud del inventario', 'Inventory Health')}
        </h3>
      </div>
      <div className="px-5 pb-5 space-y-2.5">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-500">{m.label}</span>
              <span className={`text-[13px] font-semibold ${m.color || 'text-[#171717]'} ${m.bold ? 'text-base' : ''}`}>
                {m.value}
              </span>
            </div>
            {m.sub && (
              <div className="text-[11px] text-slate-400 text-right">{m.sub}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
