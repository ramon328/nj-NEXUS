import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import { Lead } from '@/types/leads';
import { LeadStatus, STATUS_COLORS } from './leadConstants';
import LeadKanbanCard from './LeadKanbanCard';

interface LeadKanbanColumnProps {
  status: LeadStatus;
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  isOver?: boolean;
}

export default function LeadKanbanColumn({ status, leads, onSelectLead }: LeadKanbanColumnProps) {
  const { t } = useTranslation('leadsPage');
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const colors = STATUS_COLORS[status];

  const cardIds = leads.map((l) => l.id);

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col min-w-[280px] w-[85vw] lg:w-auto lg:flex-1
        h-full min-h-[100px] snap-center rounded-2xl p-3 transition-all duration-150 overflow-hidden
        ${isOver ? `ring-2 ${colors.ring} scale-[1.01] ${colors.columnBg}` : 'bg-slate-50/80'}
      `}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <span className="text-[13px] font-semibold text-slate-700 tracking-tight">
            {t(`status.${status}`)}
          </span>
        </div>
        <span className="text-[12px] font-medium text-slate-400 bg-white rounded-full px-2 py-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          {leads.length}
        </span>
      </div>

      {/* Cards — individual column scroll */}
      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <div
          className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto px-0.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
        >
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-slate-400">
              <Inbox className="w-6 h-6 mb-2 opacity-40" />
              <p className="text-[12px]">{t('kanban.emptyColumn')}</p>
            </div>
          ) : (
            leads.map((lead, index) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <LeadKanbanCard lead={lead} onSelect={onSelectLead} />
              </motion.div>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
