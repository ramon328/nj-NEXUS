import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface ReservationSummaryProps {
  agreedPrice: number;
  totalPayments: number;
  totalAdditionals: number;
  remainingAmount: number;
}

const ReservationSummary: React.FC<ReservationSummaryProps> = ({
  agreedPrice,
  totalPayments,
  totalAdditionals,
  remainingAmount,
}) => {
  const { t } = useTranslation('vehicleReservations');
  const safeAgreedPrice =
    isNaN(agreedPrice) || agreedPrice === null || agreedPrice === undefined
      ? 0
      : agreedPrice;
  const safeTotalPayments =
    isNaN(totalPayments) ||
    totalPayments === null ||
    totalPayments === undefined
      ? 0
      : totalPayments;
  const safeTotalAdditionals =
    isNaN(totalAdditionals) ||
    totalAdditionals === null ||
    totalAdditionals === undefined
      ? 0
      : totalAdditionals;
  const safeRemainingAmount =
    isNaN(remainingAmount) ||
    remainingAmount === null ||
    remainingAmount === undefined
      ? safeAgreedPrice - safeTotalPayments + safeTotalAdditionals
      : remainingAmount;

  const hasData =
    safeAgreedPrice > 0 || safeTotalPayments > 0 || safeTotalAdditionals > 0;

  if (!hasData) {
    return (
      <div className='p-2 rounded-lg border'>
        <p className='text-xs font-semibold text-slate-700 mb-1'>
          {t('summary.title')}
        </p>
        <p className='text-xs text-muted-foreground text-center py-3'>
          {t('summary.empty.title')}
        </p>
      </div>
    );
  }

  return (
    <div className='p-2 rounded-lg border'>
      <p className='text-xs font-semibold text-slate-700 mb-1.5'>
        {t('summary.title')}
      </p>
      <div className='space-y-1 text-xs'>
        <div className='flex justify-between items-center'>
          <span className='text-muted-foreground'>
            {t('summary.agreedPrice')}
          </span>
          <span className='font-medium'>
            {formatCurrency(safeAgreedPrice)}
          </span>
        </div>

        <div className='flex justify-between items-center'>
          <span className='text-muted-foreground'>
            {t('summary.totalPaid')}
          </span>
          <span className='font-medium text-green-600'>
            - {formatCurrency(safeTotalPayments)}
          </span>
        </div>

        {safeTotalAdditionals > 0 && (
          <div className='flex justify-between items-center'>
            <span className='text-muted-foreground'>
              {t('summary.totalAdditionals')}
            </span>
            <span className='font-medium text-orange-600'>
              + {formatCurrency(safeTotalAdditionals)}
            </span>
          </div>
        )}

        <div className='border-t pt-1.5 mt-1.5'>
          <div className='flex justify-between items-center'>
            <span className='font-semibold text-xs'>
              {safeRemainingAmount >= 0
                ? t('summary.remaining')
                : t('summary.overpayment')}
            </span>
            <span
              className={`font-bold text-sm ${
                safeRemainingAmount >= 0 ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {safeRemainingAmount >= 0
                ? formatCurrency(safeRemainingAmount)
                : `- ${formatCurrency(Math.abs(safeRemainingAmount))}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationSummary;
