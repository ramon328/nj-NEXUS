import React from 'react';
import { Financing } from '@/types/financing';
import { getFinancingStatus } from './utils/financingStatusUtils';
import { useI18n } from '@/hooks/useI18n';

const FinancingStatusBadge = ({ financing }: { financing: Financing }) => {
  const { tCommon } = useI18n();
  const status = getFinancingStatus(financing);

  const labelMap: Record<string, string> = {
    'Completado': tCommon('financing.status.completed'),
    'Con atraso': tCommon('financing.status.late'),
    'En progreso': tCommon('financing.status.inProgress'),
    'Pendiente': tCommon('financing.status.pending'),
  };
  const translatedLabel = labelMap[status.label] || status.label;

  const styleMap: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    destructive: 'bg-red-50 text-red-700 border-red-200/60',
    default: 'bg-blue-50 text-blue-700 border-blue-200/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${styleMap[status.variant] || styleMap.default}`}>
      {translatedLabel}
    </span>
  );
};

export default FinancingStatusBadge;
