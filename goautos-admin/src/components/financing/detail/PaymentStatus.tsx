import React from 'react';
import { FinancingDetailType } from '@/types/financing';
import { getPaymentStatus } from './utils/financingCalculations';
import StatusBadge from './components/StatusBadge';
import PaymentProgressBar from './components/PaymentProgressBar';
import PaymentSummary from './components/PaymentSummary';
import PercentagePaidBar from './components/PercentagePaidBar';

type PaymentStatusProps = {
  financing: FinancingDetailType;
};

const PaymentStatus = ({ financing }: PaymentStatusProps) => {
  const paymentStatus = getPaymentStatus(financing);

  return (
    <div className='bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 p-5'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-[13px] font-medium text-slate-400 uppercase tracking-wider'>
          Estado de Pagos
        </h3>
        <StatusBadge {...paymentStatus} />
      </div>

      <div className='space-y-4'>
        <PaymentProgressBar financing={financing} />
        <PaymentSummary financing={financing} />
        <PercentagePaidBar financing={financing} />
      </div>
    </div>
  );
};

export default PaymentStatus;
