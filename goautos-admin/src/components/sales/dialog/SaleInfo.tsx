import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import { getPaymentMethodLabel } from '@/utils/paymentMethods';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SaleInfoProps {
  vehicle: any;
  customer: any;
  salePrice: number;
  paymentMethod?: string;
  financiera?: string;
  selectedSellerId: string | null;
  onSellerChange: (value: string) => void;
  sellerUsers: any[];
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-50 last:border-b-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="text-[12px] font-medium text-slate-900 text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

export const SaleInfo = ({
  vehicle,
  customer,
  salePrice,
  paymentMethod,
  financiera,
  selectedSellerId,
  onSellerChange,
  sellerUsers,
}: SaleInfoProps) => {
  const { tCommon } = useI18n();

  const paymentLabel = getPaymentMethodLabel(paymentMethod) || '-';
  const paymentDisplay = paymentMethod === 'credit' && financiera
    ? `${paymentLabel} (${financiera})`
    : paymentLabel;

  const formattedPrice = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(salePrice);

  return (
    <div className="space-y-3">
      {/* Sale details */}
      <div className="bg-white rounded-xl p-3 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
        <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-2">Venta</h4>
        <InfoRow label={tCommon('sales.saleInfo.salePrice')} value={formattedPrice} />
        <InfoRow label="Método de pago" value={paymentDisplay} />
      </div>

      {/* Seller */}
      <div className="bg-white rounded-xl p-3 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
        <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-2">
          {tCommon('sales.saleInfo.seller')}
        </h4>
        <Select
          value={selectedSellerId || '_none'}
          onValueChange={onSellerChange}
        >
          <SelectTrigger className='text-[13px] h-9 rounded-xl border-slate-200/60'>
            <SelectValue placeholder={tCommon('sales.saleInfo.selectSeller')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='_none'>
              {tCommon('sales.saleInfo.noSeller')}
            </SelectItem>
            {sellerUsers.map((seller) => (
              <SelectItem key={seller.id} value={seller.id.toString()}>
                {`${seller.first_name} ${seller.last_name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
