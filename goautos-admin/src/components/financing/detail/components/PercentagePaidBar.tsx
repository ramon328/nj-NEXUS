import React from 'react';
import { FinancingDetailType } from '@/types/financing';
import { calculatePercentagePaid } from '../utils/financingCalculations';

type PercentagePaidBarProps = {
  financing: FinancingDetailType;
};

const PercentagePaidBar = ({ financing }: PercentagePaidBarProps) => {
  const percentagePaid = calculatePercentagePaid(financing);

  return (
    <div className='rounded-xl bg-slate-50/80 p-3.5'>
      <div className='flex justify-between items-center mb-2'>
        <span className='text-[13px] font-medium text-slate-600'>Porcentaje Pagado</span>
        <span className='text-[13px] font-semibold text-slate-900'>{Math.round(percentagePaid)}%</span>
      </div>
      <div className='h-2 rounded-full bg-slate-200/60'>
        <div
          className='h-2 rounded-full bg-primary transition-all'
          style={{ width: `${Math.min(percentagePaid, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default PercentagePaidBar;
