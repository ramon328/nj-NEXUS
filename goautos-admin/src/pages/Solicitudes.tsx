import { useState, useMemo, useCallback, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useVehicleRequests, type VehicleRequest } from '@/hooks/useVehicleRequests';
import CreateRequestDialog from '@/components/solicitudes/CreateRequestDialog';
import RequestDetailPanel from '@/components/solicitudes/RequestDetailPanel';
import RequestKanban from '@/components/solicitudes/RequestKanban';
import { RequestMobileCard } from '@/components/solicitudes/RequestMobileCard';
import { REQUEST_STATUSES, type RequestStatus } from '@/components/solicitudes/requestConstants';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';

const Solicitudes = () => {
  const { t } = useTranslation('solicitudes');
  const { requests, isLoading, createRequest, updateStatus, refetch } = useVehicleRequests();
  const { hasPermission, isSuperadmin } = usePermissions();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VehicleRequest | null>(null);
  const [mobileColumn, setMobileColumn] = useState<RequestStatus>('open');

  const canCreate = isSuperadmin || hasPermission(PermissionCode.VEHICLE_REQUESTS_CREATE);
  const canManage = isSuperadmin || hasPermission(PermissionCode.VEHICLE_REQUESTS_MANAGE);

  // Keep selectedRequest in sync with latest data
  useEffect(() => {
    if (selectedRequest) {
      const updated = requests.find((r) => r.id === selectedRequest.id);
      if (updated && updated !== selectedRequest) setSelectedRequest(updated);
      else if (!updated) setSelectedRequest(null);
    }
  }, [requests, selectedRequest]);

  const grouped = useMemo(() => {
    const result: Record<RequestStatus, VehicleRequest[]> = {
      open: [],
      in_progress: [],
      fulfilled: [],
      cancelled: [],
    };
    for (const r of requests) {
      const key = (r.status === 'expired' ? 'cancelled' : r.status) as RequestStatus;
      if (result[key]) result[key].push(r);
    }
    return result;
  }, [requests]);

  const handleStatusChange = useCallback(async (id: string, status: RequestStatus, note?: string) => {
    await updateStatus(id, status as VehicleRequest['status'], undefined, undefined, note);
    refetch();
  }, [updateStatus, refetch]);

  const handleUpdateStatus = useCallback(async (
    id: string,
    status: VehicleRequest['status'],
    assignedTo?: string,
    fulfilledVehicleId?: number,
    statusNote?: string,
  ) => {
    const result = await updateStatus(id, status, assignedTo, fulfilledVehicleId, statusNote);
    if (!result.error) {
      setSelectedRequest(null);
    }
    return result;
  }, [updateStatus]);

  return (
    <DashboardLayout>
      <main className="flex flex-col h-full bg-[#f5f5f7]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-4 space-y-3">
            <div className="flex items-center justify-end">
              {canCreate && (
                <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-1.5 hidden sm:flex">
                  <Plus className="h-4 w-4" />
                  <span>{t('buttons.newRequest')}</span>
                </Button>
              )}
            </div>

            {/* Mobile column tabs */}
            <div className="flex sm:hidden gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
              {REQUEST_STATUSES.map((key) => (
                <button
                  key={key}
                  onClick={() => setMobileColumn(key)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors',
                    mobileColumn === key
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600'
                  )}
                >
                  {t(`columns.${key}`)} ({grouped[key]?.length || 0})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Desktop Kanban with drag-and-drop */}
              <div className="hidden sm:block h-full">
                <RequestKanban
                  requests={requests}
                  onSelectRequest={setSelectedRequest}
                  onStatusChange={handleStatusChange}
                  canManage={canManage}
                />
              </div>

              {/* Mobile list */}
              <div className="sm:hidden px-4 py-4 overflow-y-auto h-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mobileColumn}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2.5"
                  >
                    {(grouped[mobileColumn] || []).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Search className="h-8 w-8 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">{t('card.noRequests')}</p>
                      </div>
                    ) : (
                      (grouped[mobileColumn] || []).map((r) => (
                        <RequestMobileCard
                          key={r.id}
                          request={r}
                          onClick={() => setSelectedRequest(r)}
                          onStatusChange={handleStatusChange}
                          canManage={canManage}
                        />
                      ))
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Mobile FAB */}
      {canCreate && (
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="sm:hidden fixed bottom-24 right-4 z-20 h-14 w-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* Create dialog */}
      <CreateRequestDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={createRequest}
      />

      {/* Detail panel */}
      {selectedRequest && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setSelectedRequest(null)}
          />
          <RequestDetailPanel
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onUpdateStatus={handleUpdateStatus}
            canManage={canManage}
          />
        </>
      )}
    </DashboardLayout>
  );
};

export default Solicitudes;
