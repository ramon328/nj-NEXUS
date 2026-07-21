import { SellerStats } from '@/hooks/admin/useSellersData';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { User, TrendingUp, Car, Coins, Handshake } from 'lucide-react';

interface SellersOverviewCardsProps {
  sellersStats: SellerStats[];
  loading: boolean;
}

export const SellersOverviewCards = ({
  sellersStats,
  loading,
}: SellersOverviewCardsProps) => {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-200/60 bg-white p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-4 w-28 bg-slate-100 animate-pulse rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="rounded-lg bg-slate-50/60 px-2.5 py-2 space-y-1">
                  <div className="h-2.5 w-10 bg-slate-100 animate-pulse rounded" />
                  <div className="h-4 w-16 bg-slate-100 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sellersStats.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
          <User className="w-5 h-5 text-slate-300" />
        </div>
        <p className="text-[13px] text-slate-400">
          {dv('No hay vendedores con datos en el período', 'No sellers with data in the period')}
        </p>
      </div>
    );
  }

  // Sort sellers by total sales descending
  const sorted = [...sellersStats].sort((a, b) => b.totalSales - a.totalSales);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 auto-rows-fr">
      {sorted.map((stat, idx) => {
        const name = `${stat.seller.first_name} ${stat.seller.last_name}`.trim();
        const initials = `${stat.seller.first_name?.[0] || ''}${stat.seller.last_name?.[0] || ''}`.toUpperCase();

        // Color palette for avatars
        const colors = [
          'from-blue-500 to-blue-600',
          'from-emerald-500 to-emerald-600',
          'from-purple-500 to-purple-600',
          'from-amber-500 to-amber-600',
          'from-rose-500 to-rose-600',
          'from-cyan-500 to-cyan-600',
        ];
        const avatarColor = colors[idx % colors.length];

        return (
          <div
            key={stat.seller.id}
            className="rounded-2xl border border-slate-200/60 bg-white p-4 transition-shadow"
          >
            {/* Seller identity */}
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center shadow-sm`}>
                <span className="text-[12px] font-bold text-white">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-slate-900 truncate">{name}</p>
                <p className="text-[11px] text-slate-400 truncate">{stat.seller.email}</p>
              </div>
            </div>

            {/* Metrics — 2 columns, numbers have room */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-blue-50/60 px-2.5 py-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] text-blue-600/70">{dv('Ventas', 'Sales')}</span>
                </div>
                <p className="text-[13px] font-semibold text-slate-900">{formatPrice(stat.totalSales)}</p>
              </div>
              <div className="rounded-lg bg-purple-50/60 px-2.5 py-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <Coins className="w-3 h-3 text-purple-500" />
                  <span className="text-[10px] text-purple-600/70">{dv('Comisión', 'Commission')}</span>
                </div>
                <p className="text-[13px] font-semibold text-slate-900">{formatPrice(stat.totalCommissions)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50/60 px-2.5 py-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <Car className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-600/70">{dv('Vendidos', 'Sold')}</span>
                </div>
                <p className="text-[13px] font-semibold text-slate-900">{stat.vehiclesSold}</p>
              </div>
              <div className="rounded-lg bg-slate-50/60 px-2.5 py-2">
                <div className="flex items-center gap-1 mb-0.5">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] text-slate-500">{dv('Asignados', 'Assigned')}</span>
                </div>
                <p className="text-[13px] font-semibold text-slate-900">{stat.assignedVehicles}</p>
              </div>
              {stat.consignmentsCaptured > 0 && (
                <div className="rounded-lg bg-amber-50/60 px-2.5 py-2 col-span-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Handshake className="w-3 h-3 text-amber-500" />
                    <span className="text-[10px] text-amber-600/70">{dv('Consignas captadas', 'Consignments captured')}</span>
                  </div>
                  <p className="text-[13px] font-semibold text-slate-900">{stat.consignmentsCaptured}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
