import React from 'react';
import { formatDate } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';

interface SaleStatusProps {
  status: string;
  approvalDate?: string;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
};

export function getStatusBadge(status: string, tCommon: (key: string) => string) {
  const styles = STATUS_STYLES[status] || STATUS_STYLES.pending;
  const labels: Record<string, string> = {
    pending: tCommon('sales.status.pending'),
    approved: tCommon('sales.saleStatus.approved'),
    rejected: tCommon('sales.saleStatus.rejected'),
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${styles.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      <span className={`text-[11px] font-medium ${styles.text}`}>{labels[status] || status}</span>
    </span>
  );
}

export const SaleStatus = ({ status, approvalDate }: SaleStatusProps) => {
  const { tCommon } = useI18n();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {getStatusBadge(status, tCommon)}
      {approvalDate && (
        <span className="text-[11px] text-slate-400">
          {formatDate(approvalDate)}
        </span>
      )}
    </div>
  );
};
