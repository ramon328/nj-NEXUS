import { useState, useCallback, useEffect, useMemo } from 'react';
import { Vehicle } from '@/types/vehicle';
import { useI18n } from '@/hooks/useI18n';
import { useStatuses, Status } from '@/hooks/useStatuses';
import { useStatusUpdate } from '@/hooks/vehicle/useStatusUpdate';
import { AlertTriangle, ChevronRight, ChevronDown, ImageOff, Check } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import VehicleReservationDialog from '@/components/vehicle/detail/reservations/VehicleReservationDialog';
import VehicleSaleCreateEditDialog from '@/components/vehicle/detail/sales-2/VehicleSaleCreateEditDialog';
import ConsignmentNotificationModal from '@/components/vehiculos/board/ConsignmentNotificationModal';
import { getMultipleVehicleChecklistSummaries } from '@/services/vehicleChecklistService';
import type { ChecklistSummary } from '@/types/vehicleChecklist';

interface VehiculosMobileCardsProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onRefresh?: () => void;
}

function formatPrice(price?: number) {
  if (!price) return null;
  return `$${price.toLocaleString('es-CL')}`;
}

function getDaysInStatus(stateUpdatedAt?: string) {
  if (!stateUpdatedAt) return 0;
  const diff = Date.now() - new Date(stateUpdatedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function VehiculosMobileCards({
  vehicles,
  isLoading,
  onView,
  onRefresh,
}: VehiculosMobileCardsProps) {
  const { tCommon } = useI18n();
  const { statuses } = useStatuses();

  // Status change sheet
  const [statusSheetVehicle, setStatusSheetVehicle] = useState<Vehicle | null>(null);
  const [showReservationDialog, setShowReservationDialog] = useState(false);

  // Checklist summaries for mobile cards
  const [checklistSummaries, setChecklistSummaries] = useState<Map<number, ChecklistSummary>>(new Map());

  // Stable key over vehicle ids — avoids re-running the checklist fetch when
  // the parent passes a new vehicles array reference but the id set is the
  // same (typical after an optimistic status update).
  const vehicleIdsKey = useMemo(
    () =>
      (vehicles.map((v) => v.id).filter(Boolean) as number[])
        .slice()
        .sort((a, b) => a - b)
        .join(','),
    [vehicles]
  );

  // Fetch checklist summaries for all vehicles
  useEffect(() => {
    if (!vehicleIdsKey) {
      setChecklistSummaries(new Map());
      return;
    }
    const vehicleIds = vehicleIdsKey.split(',').map(Number);

    getMultipleVehicleChecklistSummaries(vehicleIds)
      .then((summaries) => setChecklistSummaries(summaries))
      .catch((err) => console.error('Error fetching checklist summaries:', err));
  }, [vehicleIdsKey]);

  const {
    handleStatusChange,
    showSaleDialog,
    setShowSaleDialog,
    processPostNotificationActions,
    showNotificationModal,
    selectedVehicle,
    setSelectedVehicle,
    statusUpdateData,
  } = useStatusUpdate(
    () => onRefresh?.(),
    setShowReservationDialog,
    true
  );

  const onStatusBadgeTap = useCallback(
    (e: React.MouseEvent, vehicle: Vehicle) => {
      e.stopPropagation();
      setStatusSheetVehicle(vehicle);
    },
    []
  );

  const onSelectStatus = useCallback(
    (status: Status) => {
      if (!statusSheetVehicle) return;
      const oldStatusName = statusSheetVehicle.status?.name || '';
      handleStatusChange(
        Number(statusSheetVehicle.id),
        status.id,
        Boolean(statusSheetVehicle.is_consigned),
        oldStatusName,
        status.name
      );
      setStatusSheetVehicle(null);
    },
    [statusSheetVehicle, handleStatusChange]
  );

  const sortedStatuses = [...statuses].sort((a, b) => (a.order || 0) - (b.order || 0));

  if (isLoading) {
    return (
      <div className="px-3 py-3 space-y-2 overflow-y-auto h-full">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex gap-3 bg-white rounded-xl p-2.5 animate-pulse">
            <div className="w-[88px] h-[88px] rounded-lg bg-slate-100 flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3.5 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-4 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 text-sm">
        {tCommon('vehicles.table.empty')}
      </div>
    );
  }

  return (
    <>
      <div className="px-3 py-3 space-y-1.5 overflow-y-auto h-full pb-6">
        {vehicles.map((vehicle) => {
          const title = [vehicle.brand?.name, vehicle.model?.name]
            .filter(Boolean)
            .join(' ');
          const days = getDaysInStatus(vehicle.state_updated_at);
          const statusColor = vehicle.status?.color || '#64748b';
          const statusName = vehicle.status?.name || '';
          const hasFines = vehicle.fines_count != null && vehicle.fines_count > 0;
          const checklistSummary = vehicle.id ? checklistSummaries.get(vehicle.id) : undefined;

          return (
            <div
              key={vehicle.id}
              className="relative w-full bg-white rounded-xl border border-slate-100 text-left overflow-hidden"
            >
              {/* Top row: thumbnail + info + chevron */}
              <div className="flex items-start gap-3 p-2.5">
                <button
                  onClick={() => onView(vehicle.id)}
                  className="w-[88px] h-[88px] rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 active:opacity-80"
                >
                  {vehicle.main_image ? (
                    <img
                      src={vehicle.main_image}
                      alt={title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageOff className="h-5 w-5" />
                    </div>
                  )}
                </button>

                <button
                  onClick={() => onView(vehicle.id)}
                  className="flex-1 min-w-0 py-0.5 text-left active:opacity-70"
                >
                  <p className="text-[14px] font-semibold text-slate-900 leading-tight truncate">
                    {title || 'Sin nombre'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {vehicle.year && (
                      <span className="text-[12px] text-slate-500">{vehicle.year}</span>
                    )}
                    {vehicle.mileage != null && (
                      <>
                        <span className="text-slate-300 text-[10px]">·</span>
                        <span className="text-[12px] text-slate-500">
                          {vehicle.mileage.toLocaleString('es-CL')} km
                        </span>
                      </>
                    )}
                    {vehicle.license_plate && (
                      <>
                        <span className="text-slate-300 text-[10px]">·</span>
                        <span className="text-[12px] font-medium uppercase text-slate-500">
                          {vehicle.license_plate}
                        </span>
                      </>
                    )}
                    <span className="text-slate-300 text-[10px]">·</span>
                    <span className="text-[12px] text-slate-400">{days}d</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {vehicle.price != null && vehicle.price > 0 && (
                      <span className="text-[15px] font-bold text-slate-900">
                        {formatPrice(vehicle.price)}
                      </span>
                    )}
                    {hasFines && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 text-[10px] font-semibold text-red-600">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {vehicle.fines_count}
                      </span>
                    )}
                  </div>
                  {vehicle.seller && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">
                      {vehicle.seller.first_name} {vehicle.seller.last_name}
                    </p>
                  )}
                </button>

                <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0 mt-1" />
              </div>

              {/* Progress bar for checklist (when applicable) */}
              {checklistSummary && checklistSummary.total > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 pb-2.5">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        checklistSummary.percentComplete >= 100
                          ? 'bg-green-500'
                          : checklistSummary.percentComplete >= 50
                          ? 'bg-blue-500'
                          : 'bg-orange-500'
                      }`}
                      style={{ width: `${checklistSummary.percentComplete}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      checklistSummary.percentComplete >= 100
                        ? 'text-green-600'
                        : checklistSummary.percentComplete >= 50
                        ? 'text-blue-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {checklistSummary.percentComplete}%
                  </span>
                </div>
              )}

              {/* Status badge — absolute bottom-right */}
              <button
                onClick={(e) => onStatusBadgeTap(e, vehicle)}
                className={`absolute right-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border active:scale-[0.97] transition-transform ${
                  checklistSummary && checklistSummary.total > 0 ? 'bottom-8' : 'bottom-2'
                }`}
                style={{
                  backgroundColor: `${statusColor}1A`,
                  color: statusColor,
                  borderColor: `${statusColor}4D`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                <span>{statusName}</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Status change bottom sheet — arrastrable (Vaul) */}
      <Drawer
        open={!!statusSheetVehicle}
        onOpenChange={(open) => { if (!open) setStatusSheetVehicle(null); }}
      >
        <DrawerContent>
          <div className="px-5 pb-2 pt-2">
            <p className="text-[15px] font-semibold text-slate-900">
              Cambiar estado
            </p>
            <p className="text-[13px] text-slate-400 truncate mt-0.5">
              {statusSheetVehicle
                ? [statusSheetVehicle.brand?.name, statusSheetVehicle.model?.name].filter(Boolean).join(' ')
                : ''}
            </p>
          </div>
          <div
            className="px-2 pb-3 max-h-[50vh] overflow-y-auto"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
          >
            {sortedStatuses.map((status) => {
              const isCurrent = statusSheetVehicle?.status_id === status.id;
              return (
                <button
                  key={status.id}
                  onClick={() => onSelectStatus(status)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors ${
                    isCurrent
                      ? 'bg-slate-50'
                      : 'active:bg-slate-50'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: status.color || '#64748b' }}
                  />
                  <span className={`flex-1 text-left text-[14px] ${isCurrent ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                    {status.name}
                  </span>
                  {isCurrent && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Reservation dialog */}
      {selectedVehicle && showReservationDialog && (
        <VehicleReservationDialog
          isOpen={showReservationDialog}
          onClose={() => setShowReservationDialog(false)}
          vehicle={selectedVehicle}
          onSuccess={() => {
            setShowReservationDialog(false);
            onRefresh?.();
          }}
        />
      )}

      {/* Sale dialog */}
      {selectedVehicle && showSaleDialog && (
        <VehicleSaleCreateEditDialog
          isOpen={showSaleDialog}
          onClose={() => setShowSaleDialog(false)}
          vehicle={selectedVehicle}
          onSuccess={() => {
            setShowSaleDialog(false);
            onRefresh?.();
          }}
        />
      )}

      {/* Consignment notification modal */}
      {showNotificationModal && statusUpdateData && (
        <ConsignmentNotificationModal
          isOpen={showNotificationModal}
          onClose={() => processPostNotificationActions()}
          vehicleId={statusSheetVehicle?.id || selectedVehicle?.id || 0}
          previousStatus={statusUpdateData.oldStatus}
          newStatus={statusUpdateData.newStatus}
        />
      )}
    </>
  );
}
