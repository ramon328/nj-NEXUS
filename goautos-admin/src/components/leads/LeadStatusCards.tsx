import { motion } from 'framer-motion';
import { Clock, UserCheck, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Lead } from '@/types/leads';
import { LeadStatus, STATUS_COLORS, LEAD_STATUSES } from './leadConstants';

const STATUS_ICON_MAP = {
  pending: Clock,
  assigned: UserCheck,
  completed: CheckCircle,
  cancelled: XCircle,
};

interface LeadStatusCardsProps {
  leads: Lead[];
  activeStatus: LeadStatus | null;
  onStatusClick: (status: LeadStatus | null) => void;
}

export default function LeadStatusCards({ leads, activeStatus, onStatusClick }: LeadStatusCardsProps) {
  const { t } = useTranslation('leadsPage');

  const counts: Record<LeadStatus, number> = { pending: 0, assigned: 0, completed: 0, cancelled: 0 };
  leads.forEach((lead) => {
    if (lead.status in counts) counts[lead.status as LeadStatus]++;
  });

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };

  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
  };

  return (
    <>
      {/* Mobile: compact horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pt-1 pb-1 -mx-4 px-4 sm:hidden scrollbar-none">
        {LEAD_STATUSES.map((status) => {
          const colors = STATUS_COLORS[status];
          const Icon = STATUS_ICON_MAP[status];
          const isActive = activeStatus === status;

          return (
            <button
              key={status}
              onClick={() => onStatusClick(isActive ? null : status)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 transition-all duration-200
                ${isActive
                  ? `${colors.bg} ${colors.ring} ring-2`
                  : 'bg-white border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]'
                }
              `}
            >
              <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
              <span className={`text-[13px] font-medium ${colors.text} whitespace-nowrap`}>
                {t(`status.${status}`)}
              </span>
              <span className="text-[13px] font-semibold text-slate-900">{counts[status]}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop: grid cards */}
      <motion.div
        className="hidden sm:grid grid-cols-4 gap-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {LEAD_STATUSES.map((status) => {
          const colors = STATUS_COLORS[status];
          const Icon = STATUS_ICON_MAP[status];
          const isActive = activeStatus === status;

          return (
            <motion.button
              key={status}
              variants={item}
              onClick={() => onStatusClick(isActive ? null : status)}
              className={`
                relative bg-white rounded-2xl p-4 text-left transition-all duration-200
                shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border
                ${isActive
                  ? `${colors.ring} ring-2 border-transparent`
                  : 'border-slate-200/60 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)] hover:scale-[1.01]'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <span className="text-2xl font-semibold tracking-tight text-slate-900">
                  {counts[status]}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                <span className={`text-[13px] font-medium ${colors.text}`}>
                  {t(`status.${status}`)}
                </span>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </>
  );
}
