import { Receipt } from 'lucide-react';
import { SellerStats } from '@/hooks/admin/useSellersData';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface SellersSalesTableProps {
  sellersStats: SellerStats[];
  loading: boolean;
}

export const SellersSalesTable = ({
  sellersStats,
  loading,
}: SellersSalesTableProps) => {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const isEs = i18n.language?.toLowerCase().startsWith('es');
  const dv = (esStr: string, en: string) => isEs ? esStr : en;

  // Aplanar todas las ventas con información del vendedor
  const allSales = sellersStats.flatMap((stat) =>
    stat.sales.map((sale) => ({
      ...sale,
      sellerName: `${stat.seller.first_name} ${stat.seller.last_name}`.trim(),
    }))
  );

  // Ordenar por fecha descendente
  const sortedSales = allSales.sort(
    (a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
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
            <Receipt className="w-[18px] h-[18px] text-slate-900" />
            <h3 className="text-[15px] font-semibold text-slate-900">{dv('Ventas por Vendedor', 'Sales by Seller')}</h3>
            <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {allSales.length}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      {sortedSales.length === 0 ? (
        <div className="px-5 pb-5">
          <div className="text-center py-8 rounded-xl bg-slate-50/50">
            <p className="text-[13px] text-slate-400">
              {dv('No hay ventas en el período seleccionado', 'No sales in the selected period')}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Desktop table header */}
          <div className="hidden sm:grid grid-cols-[1.2fr_1fr_1.5fr_1fr_1fr] px-5 py-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider border-t border-slate-100">
            <span>{dv('Vendedor', 'Seller')}</span>
            <span>{dv('Fecha', 'Date')}</span>
            <span>{dv('Vehículo', 'Vehicle')}</span>
            <span className="text-right">{dv('Precio', 'Price')}</span>
            <span className="text-right">{dv('Comisión', 'Commission')}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {sortedSales.map((sale) => (
              <div key={sale.id}>
                {/* Desktop row */}
                <div className="hidden sm:grid grid-cols-[1.2fr_1fr_1.5fr_1fr_1fr] items-center px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <span className="text-[13px] font-medium text-slate-900">{sale.sellerName}</span>
                  <span className="text-[13px] text-slate-500">
                    {format(new Date(sale.sale_date), 'dd/MM/yyyy', {
                      locale: isEs ? es : undefined,
                    })}
                  </span>
                  <span className="text-[13px] text-slate-600">
                    {sale.vehicle?.brand?.name} {sale.vehicle?.model?.name} {sale.vehicle?.year}
                  </span>
                  <span className="text-[13px] font-semibold text-slate-900 text-right">
                    {formatPrice(sale.sale_price)}
                  </span>
                  <span className="text-[13px] font-medium text-emerald-600 text-right">
                    {formatPrice(sale.commission_amount)}
                  </span>
                </div>

                {/* Mobile card */}
                <div className="sm:hidden px-5 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-slate-900">
                      {sale.vehicle?.brand?.name} {sale.vehicle?.model?.name} {sale.vehicle?.year}
                    </span>
                    <span className="text-[13px] font-semibold text-slate-900">
                      {formatPrice(sale.sale_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12px] text-slate-500">
                      <span>{sale.sellerName}</span>
                      <span className="text-slate-300">·</span>
                      <span>
                        {format(new Date(sale.sale_date), 'dd/MM/yyyy', {
                          locale: isEs ? es : undefined,
                        })}
                      </span>
                    </div>
                    <span className="text-[12px] font-medium text-emerald-600">
                      {formatPrice(sale.commission_amount)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
