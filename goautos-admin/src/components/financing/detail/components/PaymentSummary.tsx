import React from 'react';
import { FinancingDetailType } from '@/types/financing';
import { formatCurrency } from '@/lib/utils';
import {
  calculateAmountPaid,
  calculateInterestPaid,
  calculateRemainingBalance,
  calculateTotalAmount,
} from '../utils/financingCalculations';

type PaymentSummaryProps = {
  financing: FinancingDetailType;
};

const PaymentSummary = ({ financing }: PaymentSummaryProps) => {
  const amountPaid = calculateAmountPaid(financing);
  const interestPaid = calculateInterestPaid(financing);
  const remainingBalance = calculateRemainingBalance(financing);
  const totalAmount = calculateTotalAmount(financing);

  return (
    <div className='space-y-2'>
      <div className='flex justify-between items-center'>
        <span className='text-[13px] text-slate-600'>Monto Pagado</span>
        <span className='text-[13px] font-medium text-emerald-600'>{formatCurrency(amountPaid)}</span>
      </div>
      {interestPaid > 0 && (
        <div className='flex justify-between items-center'>
          <span className='text-[13px] text-slate-600'>Interés Pagado</span>
          <span className='text-[13px] font-medium text-amber-600'>{formatCurrency(interestPaid)}</span>
        </div>
      )}
      <div className='flex justify-between items-center'>
        <span className='text-[13px] text-slate-600'>Monto Pendiente</span>
        <span className='text-[13px] font-medium text-amber-600'>{formatCurrency(remainingBalance)}</span>
      </div>
      <div className='flex justify-between items-center'>
        <span className='text-[13px] text-slate-600'>Total a Pagar</span>
        <span className='text-[13px] font-semibold text-slate-900'>{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
};

export default PaymentSummary;
