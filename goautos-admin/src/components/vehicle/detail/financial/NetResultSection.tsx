import React from 'react';
import { useI18n } from '@/hooks/useI18n';
import { formatCurrency } from '../transactions/utils';

type NetResultSectionProps = {
  netResult: number;
  showSensitiveData: boolean;
};

const NetResultSection: React.FC<NetResultSectionProps> = ({
  netResult,
  showSensitiveData,
}) => {
  const { tCommon } = useI18n();
  const renderHiddenValue = () => {
    return <span className='font-mono tracking-wider'>••••••••</span>;
  };

  const getDisplayValue = () => {
    if (!showSensitiveData) {
      return renderHiddenValue();
    }
    return formatCurrency(netResult);
  };

  return (
    <div className={`rounded-xl p-3 ${netResult >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
      <div className='flex justify-between items-center'>
        <span className='text-[13px] font-semibold text-slate-900'>
          {tCommon('vehicles.detail.financial.netResult')}
        </span>
        <span className={`text-base font-bold ${netResult >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
          {getDisplayValue()}
        </span>
      </div>
    </div>
  );
};

export default NetResultSection;
