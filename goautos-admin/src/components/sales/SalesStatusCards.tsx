import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type SaleStatus = 'pending' | 'approved' | 'rejected';

const STATUSES: SaleStatus[] = ['pending', 'approved', 'rejected'];

const STATUS_ICONS: Record<SaleStatus, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

interface SalesStatusCardsProps {
  counts: Record<SaleStatus, number>;
  totalCount: number;
  activeStatus: SaleStatus | null;
  onStatusClick: (status: SaleStatus | null) => void;
  loading?: boolean;
}

export default function SalesStatusCards({
  counts,
  activeStatus,
  onStatusClick,
  loading,
}: SalesStatusCardsProps) {
  const { t } = useTranslation('salesPage');

  if (loading) {
    return (
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-100 animate-pulse rounded-full h-[34px] w-[140px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-nowrap gap-1.5 shrink-0">
      {STATUSES.map((status) => {
        const Icon = STATUS_ICONS[status];
        const isActive = activeStatus === status;

        return (
          <button
            key={status}
            onClick={() => onStatusClick(isActive ? null : status)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-slate-800 text-white'
                : 'hover:bg-slate-200/60 text-slate-600'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{t(`tabs.${status}`)}</span>
            {status === 'pending' && counts[status] > 0 ? (
              <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                isActive ? 'bg-red-500 text-white' : 'bg-red-500 text-white animate-pulse'
              }`}>
                {counts[status]}
              </span>
            ) : (
              <span className={`text-[11px] ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                {counts[status]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
