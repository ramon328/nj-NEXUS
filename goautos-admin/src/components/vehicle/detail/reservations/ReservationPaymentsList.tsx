import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface ReservationPaymentsListProps {
  payments: any[];
  onEdit: (payment: any) => void;
  onDelete: (paymentId: number) => void;
  totalAmount: number;
}

const ReservationPaymentsList: React.FC<ReservationPaymentsListProps> = ({
  payments,
  onEdit,
  onDelete,
  totalAmount,
}) => {
  const { t } = useTranslation('vehicleReservations');
  if (payments.length === 0) {
    return (
      <div className='text-center py-4 text-muted-foreground'>
        <p className='text-xs'>{t('payments.empty.title')}</p>
        <p className='text-[11px] mt-0.5'>
          {t('payments.empty.subtitle')}
        </p>
        <Button
          variant='secondary'
          size='sm'
          className='mt-2 text-xs'
          onClick={() => onEdit(null)}
        >
          {t('payments.empty.registerFirst')}
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-1.5'>
      {payments.map((payment) => (
        <div
          key={payment.id}
          className='flex items-center justify-between p-2 border rounded-lg text-xs'
        >
          <div className='flex-1 min-w-0'>
            <p className='font-medium truncate'>
              {payment.title || t('payments.item.defaultTitle')}
            </p>
            {payment.description && (
              <p className='text-[11px] text-muted-foreground truncate'>
                {payment.description}
              </p>
            )}
            <div className='flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5'>
              <span>
                {payment.created_at &&
                  format(parseISO(payment.created_at), 'dd/MM/yyyy', {
                    locale: es,
                  })}
              </span>
              <span className='font-semibold text-green-600'>
                {formatCurrency(payment.amount || 0)}
              </span>
            </div>
          </div>
          <div className='flex items-center gap-1 ml-2 shrink-0'>
            <Button variant='ghost' size='sm' className='h-7 w-7 p-0' onClick={() => onEdit(payment)}>
              <Edit className='h-3.5 w-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              className='h-7 w-7 p-0 text-destructive'
              onClick={() => onDelete(payment.id)}
            >
              <Trash2 className='h-3.5 w-3.5' />
            </Button>
          </div>
        </div>
      ))}

      <div className='border-t pt-1.5 mt-1.5'>
        <div className='flex justify-between items-center text-xs font-semibold'>
          <span>{t('payments.totalPayments')}</span>
          <span className='text-green-600'>{formatCurrency(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
};

export default ReservationPaymentsList;
