import React from 'react';
import { getPaymentMethodLabel } from '@/utils/paymentMethods';

interface PaymentsSectionProps {
  paymentMethod: string;
  total: number;
  formatCurrency: (value: number) => string;
}

const PaymentsSection = ({
  paymentMethod,
  total,
  formatCurrency,
}: PaymentsSectionProps) => {
  const displayMethod = paymentMethod
    ? getPaymentMethodLabel(paymentMethod).toUpperCase()
    : 'TRANSFERENCIA';

  return (
    <div className='border border-gray-200 rounded-lg p-4 mb-6'>
      <h2 className='font-semibold text-lg mb-2'>PAGOS</h2>
      <div className='space-y-2'>
        <div className='flex justify-between'>
          <p>{displayMethod}</p>
          <p>{formatCurrency(total)}</p>
        </div>
        <hr className='my-2' />
        <div className='flex justify-between font-semibold'>
          <p>TOTAL</p>
          <p>{formatCurrency(total)}</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentsSection;
