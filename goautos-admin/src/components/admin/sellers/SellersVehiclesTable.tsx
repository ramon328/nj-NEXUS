import { Car, Clock } from 'lucide-react';
import { SellerStats } from '@/hooks/admin/useSellersData';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';

interface SellersVehiclesTableProps {
  sellersStats: SellerStats[];
  loading: boolean;
}

export const SellersVehiclesTable = ({
  sellersStats,
  loading,
}: SellersVehiclesTableProps) => {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  // Aplanar todos los vehículos con información del vendedor
  const allVehicles = sellersStats.flatMap((stat) =>
    stat.vehicles.map((vehicle) => ({
      ...vehicle,
      sellerName: `${stat.seller.first_name} ${stat.seller.last_name}`.trim(),
    }))
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-36 bg-slate-100 animate-pulse rounded-lg" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-slate-50 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Car className="w-[18px] h-[18px] text-slate-900" />
            <h3 className="text-[15px] font-semibold text-slate-900">{dv('Vehículos Asignados', 'Assigned Vehicles')}</h3>
            <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {allVehicles.length}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      {allVehicles.length === 0 ? (
        <div className="px-5 pb-5">
          <div className="text-center py-8 rounded-xl bg-slate-50/50">
            <p className="text-[13px] text-slate-400">{dv('No hay vehículos asignados', 'No assigned vehicles')}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Desktop table header */}
          <div className="hidden sm:grid grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr] px-5 py-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider border-t border-slate-100">
            <span>{dv('Vendedor', 'Seller')}</span>
            <span>{dv('Vehículo', 'Vehicle')}</span>
            <span>{dv('Estado', 'Status')}</span>
            <span className="text-right">{dv('Precio', 'Price')}</span>
            <span className="text-right">{dv('Días', 'Days')}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {allVehicles.map((vehicle) => {
              const daysInStock = Math.floor(
                (Date.now() - new Date(vehicle.created_at).getTime()) / (1000 * 60 * 60 * 24)
              );
              const daysColor = daysInStock > 90 ? 'text-red-600 bg-red-50' : daysInStock > 60 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50';

              return (
                <div key={vehicle.id}>
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[1.2fr_1.5fr_1fr_1fr_0.8fr] items-center px-5 py-3 hover:bg-slate-50/50 transition-colors">
                    <span className="text-[13px] font-medium text-slate-900">{vehicle.sellerName}</span>
                    <span className="text-[13px] text-slate-600">
                      {vehicle.brand?.name} {vehicle.model?.name} {vehicle.year}
                    </span>
                    <span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600">
                        {vehicle.status?.name || dv('Sin estado', 'No status')}
                      </span>
                    </span>
                    <span className="text-[13px] font-medium text-slate-700 text-right">{formatPrice(vehicle.price)}</span>
                    <span className="text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${daysColor}`}>
                        <Clock className="w-3 h-3" />
                        {daysInStock}d
                      </span>
                    </span>
                  </div>

                  {/* Mobile card */}
                  <div className="sm:hidden px-5 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-slate-900">
                        {vehicle.brand?.name} {vehicle.model?.name} {vehicle.year}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${daysColor}`}>
                        <Clock className="w-3 h-3" />
                        {daysInStock}d
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-slate-500">{vehicle.sellerName}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600">
                          {vehicle.status?.name || dv('Sin estado', 'No status')}
                        </span>
                      </div>
                      <span className="text-[13px] font-medium text-slate-700">{formatPrice(vehicle.price)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
