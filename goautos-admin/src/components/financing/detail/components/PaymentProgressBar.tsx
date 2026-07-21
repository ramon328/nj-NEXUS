import React from 'react';
import { FinancingDetailType } from '@/types/financing';
import { calculateProgress } from '../utils/financingCalculations';

type PaymentProgressBarProps = {
  financing: FinancingDetailType;
};

const PaymentProgressBar = ({ financing }: PaymentProgressBarProps) => {
  const progress = calculateProgress(financing);
  const paidCount = financing.payments.filter(p => p.is_paid).length;

  return (
    <div className='space-y-2'>
      <div className='flex justify-between items-center'>
        <span className='text-[13px] text-slate-600'>Progreso de Pagos</span>
        <span className='text-[13px] text-slate-500'>
          {paidCount}/{financing.total_installments} cuotas ({Math.round(progress)}%)
        </span>
      </div>
      <div className='h-1.5 rounded-full bg-slate-100'>
        <div
          className='h-1.5 rounded-full bg-primary transition-all'
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default PaymentProgressBar;
