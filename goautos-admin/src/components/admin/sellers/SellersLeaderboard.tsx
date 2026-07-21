import { Users, Trophy } from 'lucide-react';
import { SellerStats } from '@/hooks/admin/useSellersData';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';

interface SellersLeaderboardProps {
  sellersStats: SellerStats[];
  loading: boolean;
}

export const SellersLeaderboard = ({
  sellersStats,
  loading,
}: SellersLeaderboardProps) => {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-slate-100 animate-pulse" />
          <div className="h-4 w-40 bg-slate-100 animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200/60 bg-white p-4 h-[160px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (sellersStats.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Users className="w-[18px] h-[18px] text-slate-900" />
            <h3 className="text-[15px] font-semibold text-slate-900">
              {dv('Leaderboard', 'Leaderboard')}
            </h3>
          </div>
        </div>
        <div className="px-4 pb-4">
          <div className="text-center py-8 rounded-xl bg-slate-50/50">
            <p className="text-[13px] text-slate-400">
              {dv('No hay vendedores con datos en el período', 'No sellers with data in the period')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...sellersStats].sort((a, b) => b.totalSales - a.totalSales);
  const teamTotal = sorted.reduce((s, st) => s + st.totalSales, 0);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div className="space-y-3">
      {/* Section title */}
      <div className="flex items-center gap-2.5">
        <Users className="w-[18px] h-[18px] text-slate-900" />
        <h3 className="text-[15px] font-semibold text-slate-900">
          {dv('Leaderboard', 'Leaderboard')}
        </h3>
        <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
          {sorted.length}
        </span>
      </div>

      {/* Top 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {top3.map((stat, idx) => {
          const name = `${stat.seller.first_name} ${stat.seller.last_name}`.trim();
          const initials = `${stat.seller.first_name?.[0] || ''}${stat.seller.last_name?.[0] || ''}`.toUpperCase();
          const teamShare = teamTotal > 0 ? Math.round((stat.totalSales / teamTotal) * 100) : 0;
          const avgTicket = stat.vehiclesSold > 0 ? stat.totalSales / stat.vehiclesSold : 0;
          const commRate = stat.totalSales > 0 ? (stat.totalCommissions / stat.totalSales) * 100 : 0;

          return (
            <div
              key={stat.seller.id}
              className={`rounded-2xl border bg-white p-4 flex flex-col ${
                idx === 0 ? 'border-slate-300' : 'border-slate-200/60'
              }`}
            >
              {/* Header: avatar + name + rank */}
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-slate-500">{initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-900 truncate">{name}</p>
                  <p className="text-[11px] text-slate-400">{dv('Vendedor', 'Seller')}</p>
                </div>
                {idx === 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                    <Trophy className="w-3 h-3" />
                    #1
                  </span>
                ) : (
                  <span className="text-[13px] font-bold text-slate-300 shrink-0">#{idx + 1}</span>
                )}
              </div>

              {/* Total sales */}
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{dv('Total en ventas', 'Total sales')}</p>
              <p className="text-xl font-bold text-slate-900 tracking-tight tabular-nums mb-2">{formatPrice(stat.totalSales)}</p>

              {/* Team share bar */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden mr-2">
                  <div className="h-full bg-slate-400 rounded-full" style={{ width: `${teamShare}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums shrink-0">{teamShare}%</span>
              </div>

              {/* 2x2 metrics */}
              <div className="grid grid-cols-2 gap-2 mt-auto">
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[10px] text-slate-400">{dv('Vendidos', 'Sold')}</p>
                  <p className="text-[13px] font-semibold text-slate-900">{stat.vehiclesSold} {dv('veh.', 'veh.')}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[10px] text-slate-400">{dv('Comisiones', 'Commissions')}</p>
                  <p className="text-[13px] font-semibold text-slate-900 tabular-nums">{formatPrice(stat.totalCommissions)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[10px] text-slate-400">{dv('Ticket prom.', 'Avg ticket')}</p>
                  <p className="text-[13px] font-semibold text-slate-900 tabular-nums">{formatPrice(avgTicket)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <p className="text-[10px] text-slate-400">{dv('Tasa com.', 'Comm. rate')}</p>
                  <p className="text-[13px] font-semibold text-slate-900 tabular-nums">{commRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rest of team */}
      {rest.length > 0 && (
        <div className="rounded-2xl border border-slate-200/60 bg-white">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2.5">
              <h3 className="text-[14px] font-semibold text-slate-900">{dv('Resto del equipo', 'Rest of team')}</h3>
              <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                {rest.length}
              </span>
            </div>
          </div>
          <div className="px-4 pb-3 space-y-1">
            {rest.map((stat, idx) => {
              const name = `${stat.seller.first_name} ${stat.seller.last_name}`.trim();
              const initials = `${stat.seller.first_name?.[0] || ''}${stat.seller.last_name?.[0] || ''}`.toUpperCase();

              return (
                <div
                  key={stat.seller.id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <span className="text-[12px] font-bold text-slate-300 w-5 text-center shrink-0">#{idx + 4}</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-slate-500">{initials}</span>
                  </div>
                  <p className="text-[13px] font-medium text-slate-800 flex-1 min-w-0 truncate">{name}</p>
                  <p className="text-[13px] font-semibold text-slate-900 tabular-nums shrink-0">{formatPrice(stat.totalSales)}</p>
                  <span className="text-[11px] text-slate-400 shrink-0">{stat.vehiclesSold} {dv('veh.', 'veh.')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
