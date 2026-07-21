import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import type { VehicleRequest } from '@/hooks/useVehicleRequests';
import { STATUS_COLORS, STATUS_LABELS, type RequestStatus } from './requestConstants';
import { RequestKanbanCard } from './RequestKanbanCard';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface RequestKanbanColumnProps {
  status: RequestStatus;
  requests: VehicleRequest[];
  onSelectRequest: (r: VehicleRequest) => void;
}

export const RequestKanbanColumn = memo(function RequestKanbanColumn({
  status,
  requests,
  onSelectRequest,
}: RequestKanbanColumnProps) {
  const { t } = useTranslation('solicitudes');
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const colors = STATUS_COLORS[status];
  const ids = requests.map((r) => r.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-2xl p-3 bg-slate-50/80 flex flex-col min-w-[280px] flex-shrink-0 sm:flex-1 h-full transition-all duration-200',
        isOver && `ring-2 ${colors.ring} scale-[1.01] ${colors.columnBg}`,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('h-2.5 w-2.5 rounded-full', colors.dot)} />
        <h3 className="text-sm font-semibold text-slate-700">
          {t(`columns.${status}`)}
        </h3>
        <span className="ml-auto text-xs font-medium text-slate-400 bg-white/80 px-2 py-0.5 rounded-full shadow-sm">
          {requests.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Inbox className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">{t('card.noRequests')}</p>
            </div>
          ) : (
            requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
              >
                <RequestKanbanCard
                  request={request}
                  onClick={() => onSelectRequest(request)}
                />
              </motion.div>
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
});
