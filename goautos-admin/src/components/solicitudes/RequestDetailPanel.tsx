import { useState, useCallback } from 'react';
import { X, Phone, Mail, Calendar, User, Car, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VehicleRequest } from '@/hooks/useVehicleRequests';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { STATUS_COLORS, type RequestStatus } from './requestConstants';
import StatusChangeDialog from './StatusChangeDialog';

interface RequestDetailPanelProps {
  request: VehicleRequest;
  onClose: () => void;
  onUpdateStatus: (
    id: string,
    status: VehicleRequest['status'],
    assignedTo?: string,
    fulfilledVehicleId?: number,
    statusNote?: string,
  ) => Promise<{ error: string | null }>;
  canManage: boolean;
}

const DETAIL_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  fulfilled: 'bg-green-100 text-green-700',
  expired: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-600',
};

function formatCurrency(val: number | null): string {
  if (val == null) return '-';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
}

export default function RequestDetailPanel({ request, onClose, onUpdateStatus, canManage }: RequestDetailPanelProps) {
  const { t } = useTranslation('solicitudes');
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<VehicleRequest['status'] | null>(null);
  const statusColor = DETAIL_STATUS_COLORS[request.status] || DETAIL_STATUS_COLORS.open;
  const currentStatus = (request.status === 'expired' ? 'cancelled' : request.status) as RequestStatus;

  const handleStatusChange = useCallback((newStatus: VehicleRequest['status']) => {
    setPendingStatus(newStatus);
  }, []);

  const handleConfirmChange = useCallback(async (note?: string) => {
    if (!pendingStatus) return;
    setIsUpdating(true);
    await onUpdateStatus(request.id, pendingStatus, undefined, undefined, note);
    setPendingStatus(null);
    setIsUpdating(false);
  }, [request.id, onUpdateStatus, pendingStatus]);

  const vehicleLabel = [request.brand_name, request.model_name].filter(Boolean).join(' ') || t('card.vehicleNotSpecified');
  const yearRange = request.year_min
    ? `${request.year_min}${request.year_max ? ` - ${request.year_max}` : '+'}`
    : null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{t('detail.title')}</h3>
          <span className={cn('inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full', statusColor)}>
            {t(`status.${request.status}`)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Customer info */}
        <section className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('detail.customer')}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-700">{request.customer_name}</span>
            </div>
            {request.customer_phone && (
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <a href={`tel:${request.customer_phone}`} className="text-sm text-primary hover:underline">
                  {request.customer_phone}
                </a>
              </div>
            )}
            {request.customer_email && (
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <a href={`mailto:${request.customer_email}`} className="text-sm text-primary hover:underline">
                  {request.customer_email}
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Vehicle info */}
        <section className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('detail.vehicleWanted')}</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Car className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-700">{vehicleLabel}</span>
            </div>
            {yearRange && (
              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700">{t('detail.year', { range: yearRange })}</span>
              </div>
            )}
            {(request.budget_min || request.budget_max) && (
              <div className="flex items-center gap-2.5">
                <DollarSign className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700">
                  {request.budget_min && request.budget_max
                    ? `${formatCurrency(request.budget_min)} — ${formatCurrency(request.budget_max)}`
                    : request.budget_min
                      ? t('budget.from', { amount: formatCurrency(request.budget_min) })
                      : t('budget.upTo', { amount: formatCurrency(request.budget_max) })
                  }
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Assigned to */}
        {request.assigned_user_name && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('detail.assignedTo')}</p>
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-700">{request.assigned_user_name}</span>
            </div>
          </section>
        )}

        {/* Notes */}
        {request.notes && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('detail.notes')}</p>
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{request.notes}</p>
          </section>
        )}

        {/* Dates */}
        <section className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('detail.dates')}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-600">
                {t('detail.created', { date: new Date(request.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-600">
                {t('detail.expires', { date: new Date(request.expires_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) })}
              </span>
            </div>
          </div>
        </section>

        {/* Status history */}
        {request.status_history && request.status_history.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('history.title')}</p>
            <div className="space-y-0">
              {request.status_history.map((entry, i) => {
                const fromColor = STATUS_COLORS[entry.from as RequestStatus];
                const toColor = STATUS_COLORS[entry.to as RequestStatus];
                return (
                  <div key={i} className="flex gap-3 pb-3 last:pb-0">
                    {/* Timeline dot + line */}
                    <div className="flex flex-col items-center">
                      <div className={cn('h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0', toColor?.dot ?? 'bg-slate-300')} />
                      {i < request.status_history.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 mt-1" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', fromColor?.bg ?? 'bg-slate-100', fromColor?.text ?? 'text-slate-500')}>
                          {t(`status.${entry.from}`, entry.from)}
                        </span>
                        <span className="text-slate-400 text-[10px]">→</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', toColor?.bg ?? 'bg-slate-100', toColor?.text ?? 'text-slate-500')}>
                          {t(`status.${entry.to}`, entry.to)}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-xs text-slate-600 mt-0.5">{entry.note}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(entry.changed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Footer actions */}
      {(request.status === 'open' || request.status === 'in_progress') && (
        <div className="px-5 py-4 border-t border-slate-100 space-y-2">
          {request.status === 'open' && (
            <Button
              className="w-full"
              onClick={() => handleStatusChange('in_progress')}
              disabled={isUpdating}
            >
              {t('detail.takeRequest')}
            </Button>
          )}
          {request.status === 'in_progress' && (
            <Button
              className="w-full"
              onClick={() => handleStatusChange('fulfilled')}
              disabled={isUpdating}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('detail.markFulfilled')}
            </Button>
          )}
          {canManage && (
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => handleStatusChange('cancelled')}
              disabled={isUpdating}
            >
              <XCircle className="h-4 w-4 mr-2" />
              {t('detail.cancelRequest')}
            </Button>
          )}
        </div>
      )}

      {/* Status change confirmation dialog */}
      {pendingStatus && (
        <StatusChangeDialog
          open={!!pendingStatus}
          onOpenChange={(open) => { if (!open) setPendingStatus(null); }}
          fromStatus={currentStatus}
          toStatus={(pendingStatus === 'expired' ? 'cancelled' : pendingStatus) as RequestStatus}
          onConfirm={handleConfirmChange}
        />
      )}
    </div>
  );
}
