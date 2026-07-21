import React from 'react';
import { SaleSummaryRow } from '@/hooks/admin/types/salesSummary';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';

interface SalesSummaryCardsProps {
  sales: SaleSummaryRow[];
  loading: boolean;
  onVehicleClick: (vehicleId: number) => void;
  onCustomerClick: (customerId: number) => void;
  onSaleNoteClick: (saleId: number, vehicleId: number) => void;
}

export const SalesSummaryCards: React.FC<SalesSummaryCardsProps> = ({
  sales,
  loading,
  onVehicleClick,
  onCustomerClick,
  onSaleNoteClick,
}) => {
  const { t } = useTranslation('dashboard');
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

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
              <div className="h-4 w-32 bg-slate-100 animate-pulse rounded-lg" />
              <div className="h-5 w-16 bg-slate-100 animate-pulse rounded-lg" />
            </div>
            <div className="h-3 w-40 bg-slate-100 animate-pulse rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <div className="h-2.5 w-14 bg-slate-100 animate-pulse rounded-lg" />
                  <div className="h-3.5 w-20 bg-slate-100 animate-pulse rounded-lg" />
                </div>
              ))}
            </div>
            <div className="h-5 w-24 bg-slate-100 animate-pulse rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">{t('salesSummary.noSales')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {sales.map((sale) => (
        <div
          key={sale.saleId}
          className="rounded-2xl border border-slate-200/60 p-4 transition-shadow space-y-2.5"
        >
          {/* Fila 1: Título + badge patente */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onVehicleClick(sale.vehicleId)}
              className="text-[14px] font-semibold text-slate-900 hover:text-primary transition-colors cursor-pointer truncate"
            >
              {sale.vehicleBrand} {sale.vehicleModel} {sale.vehicleYear}
            </button>
            <span className="bg-slate-100 text-slate-500 text-[11px] font-medium px-1.5 py-0.5 rounded-md shrink-0">
              {sale.vehiclePatent}
            </span>
          </div>

          {/* Fila 2: Fecha | vendedor | cliente */}
          <div className="flex items-center gap-1.5 text-[13px] text-slate-500 flex-wrap">
            <span>{formatDate(sale.saleDate)}</span>
            <span className="text-slate-300">·</span>
            <span className="truncate">{sale.sellerName}</span>
            <span className="text-slate-300">·</span>
            <button
              onClick={() => onCustomerClick(sale.customerId)}
              className="text-primary hover:text-primary/80 hover:underline cursor-pointer truncate"
            >
              {sale.customerEmail}
            </button>
          </div>

          {/* Fila 3: Grid 2x2 financiero */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <div>
              <div className="text-[11px] text-slate-400">{t('salesSummary.acquisitionPrice')}</div>
              <div className="text-[13px] text-slate-700 font-medium">
                {sale.acquisitionPrice !== null ? formatPrice(sale.acquisitionPrice) : '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">{t('salesSummary.extrasCost')}</div>
              <div className="text-[13px] text-slate-700 font-medium">
                {sale.extrasCost > 0 ? formatPrice(sale.extrasCost) : '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">{t('salesSummary.salePrice')}</div>
              <div className="text-[13px] text-slate-700 font-medium">
                {formatPrice(sale.salePrice)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">
                {sale.acquisitionType === 'Consignado'
                  ? dv('Ganancia consignación', 'Consignment gain')
                  : dv('Comisión vendedor', 'Seller commission')}
              </div>
              <div className="text-[13px] text-slate-700 font-medium">
                {formatPrice(sale.commission)}
              </div>
            </div>
          </div>

          {/* Fila 4: Ganancia + badge tipo */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
              sale.acquisitionType === 'Consignado'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-blue-50 text-blue-600'
            }`}>
              {sale.acquisitionType}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400">{t('salesSummary.profit')}</span>
              {sale.profit !== null ? (
                <span className={`text-[15px] font-semibold ${
                  sale.profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {formatPrice(sale.profit)}
                </span>
              ) : (
                <span className="text-slate-400 text-[13px]">—</span>
              )}
            </div>
          </div>

          {/* Link nota de venta */}
          <button
            onClick={() => onSaleNoteClick(sale.saleId, sale.vehicleId)}
            className="text-[11px] text-primary/70 hover:text-primary hover:underline cursor-pointer"
          >
            {dv('Ver nota de venta', 'View sale note')} #{sale.saleId}
          </button>
        </div>
      ))}
    </div>
  );
};
