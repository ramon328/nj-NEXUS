import { memo, useState, useCallback, useMemo } from 'react';
import { Phone, Search, Clock, Check, User } from 'lucide-react';
import type { VehicleRequest } from '@/hooks/useVehicleRequests';
import {
  STATUS_COLORS,
  REQUEST_STATUSES,
  getRelativeTime,
  formatBudget,
  getRequestInitials,
  type RequestStatus,
} from './requestConstants';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import StatusChangeDialog from './StatusChangeDialog';

interface RequestMobileCardProps {
  request: VehicleRequest;
  onClick: () => void;
  onStatusChange: (id: string, status: RequestStatus, note?: string) => void;
  canManage: boolean;
}

export const RequestMobileCard = memo(function RequestMobileCard({
  request,
  onClick,
  onStatusChange,
  canManage,
}: RequestMobileCardProps) {
  const { t } = useTranslation('solicitudes');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<RequestStatus | null>(null);

  const currentStatus = (request.status === 'expired' ? 'cancelled' : request.status) as RequestStatus;
  const colors = STATUS_COLORS[currentStatus];
  const initials = getRequestInitials(request.customer_name);
  const vehicleLabel = [request.brand_name, request.model_name, request.version_name].filter(Boolean).join(' ');
  const yearRange = request.year_min
    ? `${request.year_min}${request.year_max ? `-${request.year_max}` : '+'}`
    : null;
  const budget = formatBudget(request.budget_min, request.budget_max, t);

  // Filter cancelled from drawer if user can't manage
  const availableStatuses = useMemo(
    () => canManage ? REQUEST_STATUSES : REQUEST_STATUSES.filter((s) => s !== 'cancelled'),
    [canManage],
  );

  const handleStatusSelect = useCallback(
    (status: RequestStatus) => {
      setDrawerOpen(false);
      if (status !== currentStatus) {
        setPendingStatus(status);
      }
    },
    [currentStatus],
  );

  const handleConfirmChange = useCallback(
    (note?: string) => {
      if (pendingStatus) {
        onStatusChange(request.id, pendingStatus, note);
        setPendingStatus(null);
      }
    },
    [pendingStatus, onStatusChange, request.id],
  );

  return (
    <>
      <div
        onClick={onClick}
        className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform"
      >
        {/* Top row: avatar + name + time */}
        <div className="flex items-center gap-3 mb-3">
          <div className={cn('h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0', colors.bg, colors.text)}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">{request.customer_name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-slate-300" />
              <span className="text-[11px] text-slate-400">{getRelativeTime(request.created_at, t)}</span>
            </div>
          </div>

          {/* Status pill — opens drawer */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDrawerOpen(true);
            }}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-medium flex-shrink-0 transition-colors',
              colors.bg,
              colors.text,
            )}
          >
            {t(`status.${currentStatus}`)}
          </button>
        </div>

        {/* Vehicle info */}
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

        {/* Phone */}
        {request.customer_phone && (
          <div className="flex items-center gap-2 mb-1.5">
            <Phone className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
            <span className="text-xs text-slate-500">{request.customer_phone}</span>
          </div>
        )}

        {/* Budget */}
        {budget && (
          <p className="text-xs text-primary font-medium mt-2">{budget}</p>
        )}

        {/* Assigned user */}
        {request.assigned_user_name && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-50">
            <User className="h-3 w-3 text-slate-300" />
            <span className="text-[11px] text-slate-400">{request.assigned_user_name}</span>
          </div>
        )}
      </div>

      {/* Status change drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('detail.title')}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)' }}>
            <div className="space-y-1">
              {availableStatuses.map((status) => {
                const sc = STATUS_COLORS[status];
                const isActive = status === currentStatus;
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusSelect(status)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                      isActive ? 'bg-slate-100' : 'hover:bg-slate-50 active:bg-slate-100',
                    )}
                  >
                    <div className={cn('h-3 w-3 rounded-full flex-shrink-0', sc.dot)} />
                    <span className="text-sm font-medium text-slate-700 flex-1">
                      {t(`columns.${status}`)}
                    </span>
                    {isActive && <Check className="h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {pendingStatus && (
        <StatusChangeDialog
          open={!!pendingStatus}
          onOpenChange={(open) => { if (!open) setPendingStatus(null); }}
          fromStatus={currentStatus}
          toStatus={pendingStatus}
          onConfirm={handleConfirmChange}
        />
      )}
    </>
  );
});
