import { SellerStats } from '@/hooks/admin/useSellersData';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';

interface SellersSalesChartProps {
  sellersStats: SellerStats[];
  loading: boolean;
}

export const SellersSalesChart = ({
  sellersStats,
  loading,
}: SellersSalesChartProps) => {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-slate-100 animate-pulse" />
            <div className="h-4 w-40 bg-slate-100 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="px-4 pb-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-slate-50 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...sellersStats]
    .map((stat) => ({
      name: `${stat.seller.first_name} ${stat.seller.last_name}`.trim() || 'Sin nombre',
      initials: `${stat.seller.first_name?.[0] || ''}${stat.seller.last_name?.[0] || ''}`.toUpperCase(),
      sales: stat.totalSales,
      vehiclesSold: stat.vehiclesSold,
    }))
    .sort((a, b) => b.sales - a.sales);

  const maxSales = Math.max(...sorted.map((s) => s.sales), 1);

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-[18px] h-[18px] text-slate-900" />
          <h3 className="text-[15px] font-semibold text-slate-900">{dv('Ventas por Vendedor', 'Sales by Seller')}</h3>
          <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
            {sorted.length}
          </span>
        </div>
      </div>

      {/* Bars */}
      {sorted.length === 0 ? (
        <div className="px-4 pb-4">
          <div className="text-center py-8 rounded-xl bg-slate-50/50">
            <p className="text-[13px] text-slate-400">{dv('No hay datos para mostrar', 'No data to display')}</p>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4 space-y-2">
          {sorted.map((item) => {
            const pct = maxSales > 0 ? (item.sales / maxSales) * 100 : 0;

            return (
              <div key={item.name} className="flex items-center gap-3">
                {/* Name */}
                <div className="w-24 shrink-0 flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-slate-500">{item.initials}</span>
                  </div>
                  <span className="text-[12px] font-medium text-slate-700 truncate">{item.name.split(' ')[0]}</span>
                </div>

                {/* Bar */}
                <div className="flex-1 h-7 bg-slate-50 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-lg transition-all duration-500"
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>

                {/* Amount + count */}
                <div className="shrink-0 text-right flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-900 tabular-nums">{formatPrice(item.sales)}</span>
                  <span className="text-[11px] text-slate-400 tabular-nums">{item.vehiclesSold} {dv('ventas', 'sales')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
