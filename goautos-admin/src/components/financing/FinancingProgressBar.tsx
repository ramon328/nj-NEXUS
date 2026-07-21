import React from 'react';
import { Financing } from '@/types/financing';
import { calculateProgress } from './utils/financingStatusUtils';

type FinancingProgressBarProps = {
  financing: Financing;
};

const FinancingProgressBar = ({ financing }: FinancingProgressBarProps) => {
  const progress = calculateProgress(financing);
  const paidCount = financing.payments?.filter(p => p.is_paid).length || 0;

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className="text-[11px] text-slate-500 whitespace-nowrap">
        {paidCount}/{financing.total_installments}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <span className="text-[11px] text-slate-500 whitespace-nowrap">
        {Math.round(progress)}%
      </span>
    </div>
  );
};

export default FinancingProgressBar;
