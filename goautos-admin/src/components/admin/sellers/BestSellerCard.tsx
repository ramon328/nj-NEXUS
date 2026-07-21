import { Trophy, TrendingUp, Car, Coins, Target, ChevronRight } from 'lucide-react';
import { SellerStats } from '@/hooks/admin/useSellersData';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BestSellerCardProps {
  bestSeller: SellerStats | null;
  loading: boolean;
  sellersStats?: SellerStats[];
}

export const BestSellerCard = ({ bestSeller, loading, sellersStats = [] }: BestSellerCardProps) => {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const isEs = i18n.language?.toLowerCase().startsWith('es');
  const dv = (esStr: string, en: string) => isEs ? esStr : en;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 w-24 bg-slate-100 animate-pulse rounded-lg" />
            <div className="h-5 w-36 bg-slate-100 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="h-16 bg-slate-50 animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!bestSeller || bestSeller.totalSales === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-3">
          <Trophy className="w-6 h-6 text-amber-400" />
        </div>
        <p className="text-[14px] font-medium text-slate-600">{dv('Mejor Vendedor', 'Best Seller')}</p>
        <p className="text-[13px] text-slate-400 mt-1">
          {dv('No hay ventas en el período', 'No sales in the period')}
        </p>
      </div>
    );
  }

  const name = `${bestSeller.seller.first_name} ${bestSeller.seller.last_name}`.trim();
  const initials = `${bestSeller.seller.first_name?.[0] || ''}${bestSeller.seller.last_name?.[0] || ''}`.toUpperCase();

  // Derived metrics
  const avgSalePrice = bestSeller.vehiclesSold > 0
    ? bestSeller.totalSales / bestSeller.vehiclesSold
    : 0;
  const commissionRate = bestSeller.totalSales > 0
    ? (bestSeller.totalCommissions / bestSeller.totalSales) * 100
    : 0;

  // Team share
  const teamTotalSales = sellersStats.reduce((sum, s) => sum + s.totalSales, 0);
  const teamShare = teamTotalSales > 0
    ? Math.round((bestSeller.totalSales / teamTotalSales) * 100)
    : 0;

  // Sales sorted by date (most recent first)
  const sortedSales = [...bestSeller.sales].sort(
    (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
  );

  return (
    <div className="rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-yellow-50/30 p-5 flex flex-col h-full">
      {/* Header — Trophy + name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200/50">
            <span className="text-[14px] font-bold text-white">{initials}</span>
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-amber-600/70 uppercase tracking-wider">
            {dv('Mejor Vendedor', 'Best Seller')}
          </p>
          <p className="text-[16px] font-semibold text-slate-900 tracking-tight truncate">{name}</p>
        </div>
      </div>

      {/* Hero metric — total sales */}
      <div className="rounded-xl bg-white/60 backdrop-blur-sm p-3.5 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-500">{dv('Total en ventas', 'Total sales')}</span>
          {teamShare > 0 && (
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-100/80 px-2 py-0.5 rounded-full">
              {teamShare}% {dv('del equipo', 'of team')}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight">
          {formatPrice(bestSeller.totalSales)}
        </p>
      </div>

      {/* Metrics — compact inline rows */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between rounded-lg bg-white/50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[12px] text-slate-500">{dv('Vendidos', 'Sold')}</span>
          </div>
          <p className="text-[15px] font-bold text-slate-900">{bestSeller.vehiclesSold}</p>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white/50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-[12px] text-slate-500">{dv('Comisiones', 'Commissions')}</span>
          </div>
          <p className="text-[15px] font-bold text-slate-900">{formatPrice(bestSeller.totalCommissions)}</p>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white/50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[12px] text-slate-500">{dv('Ticket promedio', 'Avg ticket')}</span>
          </div>
          <p className="text-[15px] font-bold text-slate-900">{formatPrice(avgSalePrice)}</p>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white/50 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[12px] text-slate-500">{dv('Tasa comisión', 'Comm. rate')}</span>
          </div>
          <p className="text-[15px] font-bold text-slate-900">{commissionRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Recent sales list */}
      <div className="space-y-1.5 mt-auto">
        {sortedSales.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1">
              {dv('Últimas ventas', 'Recent sales')}
            </p>
            {sortedSales.slice(0, 3).map((sale, i) => (
              <div key={sale.id} className="rounded-lg bg-white/50 px-3 py-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-emerald-600">{i + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-slate-700 truncate">
                    {sale.vehicle?.brand?.name} {sale.vehicle?.model?.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-semibold text-slate-900">{formatPrice(sale.sale_price)}</p>
                  <p className="text-[10px] text-slate-400">
                    {format(new Date(sale.sale_date), 'dd MMM', { locale: isEs ? es : undefined })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {bestSeller.assignedVehicles > 0 && (
          <div className="flex items-center justify-between px-1 pt-1">
            <span className="text-[11px] text-slate-400">
              {dv('Vehículos asignados', 'Assigned vehicles')}
            </span>
            <span className="text-[12px] font-semibold text-slate-600 flex items-center gap-0.5">
              {bestSeller.assignedVehicles}
              <ChevronRight className="w-3 h-3 text-slate-300" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
