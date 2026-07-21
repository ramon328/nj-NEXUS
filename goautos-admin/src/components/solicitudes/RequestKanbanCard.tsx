import { memo, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Phone, Search, Clock, User } from 'lucide-react';
import type { VehicleRequest } from '@/hooks/useVehicleRequests';
import { getRelativeTime, formatBudget, getRequestInitials, STATUS_COLORS, type RequestStatus } from './requestConstants';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface RequestKanbanCardProps {
  request: VehicleRequest;
  onClick: () => void;
  isDragOverlay?: boolean;
}

export const RequestKanbanCard = memo(function RequestKanbanCard({
  request,
  onClick,
  isDragOverlay = false,
}: RequestKanbanCardProps) {
  const { t } = useTranslation('solicitudes');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: request.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleClick = useCallback(() => {
    if (!isDragging) onClick();
  }, [isDragging, onClick]);

  const status = (request.status === 'expired' ? 'cancelled' : request.status) as RequestStatus;
  const colors = STATUS_COLORS[status];
  const vehicleLabel = [request.brand_name, request.model_name, request.version_name].filter(Boolean).join(' ');
  const yearRange = request.year_min
    ? `${request.year_min}${request.year_max ? `-${request.year_max}` : '+'}`
    : null;
  const budget = formatBudget(request.budget_min, request.budget_max, t);
  const initials = getRequestInitials(request.customer_name);

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      onClick={handleClick}
      className={cn(
        'bg-white rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all select-none',
        isDragOverlay && 'rotate-[3deg] shadow-[0_12px_28px_rgba(0,0,0,0.2)] scale-[1.03]',
        isDragging && 'z-50',
      )}
    >
      {/* Customer row */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0', colors.bg, colors.text)}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-800 truncate">{request.customer_name}</p>
          {request.customer_phone && (
            <p className="flex items-center gap-1 text-xs text-slate-400">
              <Phone className="h-3 w-3" />
              {request.customer_phone}
            </p>
          )}
        </div>
      </div>

      {/* Vehicle wanted */}
      <div className="flex items-center gap-2 mb-1.5">
        <Search className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        <span className="text-xs text-slate-600 truncate">
          {vehicleLabel || t('card.vehicleNotSpecified')}
        </span>
        {yearRange && (
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 flex-shrink-0">
            {yearRange}
          </span>
        )}
      </div>

      {/* Budget */}
      {budget && (
        <p className="text-xs text-primary font-medium mt-1.5">{budget}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-50">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-slate-300" />
          <span className="text-[11px] text-slate-400">{getRelativeTime(request.created_at, t)}</span>
        </div>
        {request.assigned_user_name && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-slate-300" />
            <span className="text-[11px] text-slate-400">{request.assigned_user_name}</span>
          </div>
        )}
      </div>
    </div>
  );
});
