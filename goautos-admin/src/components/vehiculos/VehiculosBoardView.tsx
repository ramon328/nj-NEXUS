import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useStatuses } from '@/hooks/useStatuses';
import { useVehicleDragDrop } from '@/hooks/useVehicleDragDrop';
import StatusColumn from './board/StatusColumn';
import VehicleReservationDialog from '../vehicle/detail/reservations/VehicleReservationDialog';
import ConsignmentNotificationModal from './board/ConsignmentNotificationModal';
import VehiclePreviewSheet from './board/VehiclePreviewSheet';
import { Vehicle } from '@/types/vehicle';
import VehicleSaleCreateEditDialog from '../vehicle/detail/sales-2/VehicleSaleCreateEditDialog';
import { useI18n } from '@/hooks/useI18n';
import { supabase } from '@/integrations/supabase/client';
import { getMultipleVehicleChecklistSummaries } from '@/services/vehicleChecklistService';
import type { ChecklistSummary } from '@/types/vehicleChecklist';

interface VehiculosBoardViewProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number) => void;
  onView: (id: number) => void;
  onRefresh: () => Promise<void>;
  // Sync the parent's vehicle cache after a confirmed status change so a
  // client-side refilter (e.g. clearing the search) keeps the card in place.
  onStatusPersisted?: (vehicleId: number, newStatusId: number) => void;
}

const VehiculosBoardView: React.FC<VehiculosBoardViewProps> = ({
  vehicles,
  isLoading,
  onDelete,
  onEdit,
  onView,
  onRefresh,
  onStatusPersisted,
}) => {
  const { tCommon } = useI18n();
  const { statuses, isLoading: statusesLoading } = useStatuses();
  const boardRef = useRef<HTMLDivElement>(null);

  // Estado local para actualizaciones optimistas
  const [optimisticVehicles, setOptimisticVehicles] = useState<Vehicle[]>(vehicles);

  // Estados para manejo de ventas existentes
  const [saleData, setSaleData] = useState<any>(null);
  const [saleId, setSaleId] = useState<number | null>(null);

  // Estados para el preview sheet
  const [previewVehicle, setPreviewVehicle] = useState<Vehicle | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Checklist summaries for board cards
  const [checklistSummaries, setChecklistSummaries] = useState<Map<number, ChecklistSummary>>(new Map());

  // Sincronizar con vehicles prop cuando cambie desde el backend
  useEffect(() => {
    setOptimisticVehicles(vehicles);
  }, [vehicles]);

  // Stable key over vehicle ids — avoids re-running the checklist fetch when
  // only fields mutate (e.g. optimistic status change) while the id set is
  // unchanged.
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

  // Callback para actualización optimista inmediata
  const handleOptimisticUpdate = (vehicleId: number, newStatusId: number) => {
    setOptimisticVehicles((prevVehicles) =>
      prevVehicles.map((vehicle) =>
        vehicle.id === vehicleId
          ? { ...vehicle, status_id: newStatusId }
          : vehicle
      )
    );
  };

  const {
    handleDragStart,
    handleDragEnd,
    handleDrop,
    showReservationDialog,
    showSaleDialog,
    selectedVehicle,
    handleDialogClose,
    handleReservationComplete,
    handleSaleComplete,
    showNotificationModal,
    handleNotificationModalClose,
    statusUpdateData,
  } = useVehicleDragDrop(onRefresh, handleOptimisticUpdate, onStatusPersisted);

  // Verificar si existe una venta cuando se abre el diálogo de venta
  // NOTA: Este useEffect debe estar DESPUÉS de useVehicleDragDrop porque usa showSaleDialog y selectedVehicle
  useEffect(() => {
    const checkExistingSale = async () => {
      if (showSaleDialog && selectedVehicle) {
        try {
          const { data: existingSaleData, error } = await supabase
            .from('vehicles_sales')
            .select('*, document:document_id(*)')
            .eq('vehicle_id', selectedVehicle.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error('Error checking existing sale:', error);
          }

          if (existingSaleData) {
            // Si existe una venta, cargar los datos para modo edición
            setSaleData(existingSaleData);
            setSaleId(existingSaleData.document_id);
          } else {
            // Si no existe, limpiar los datos (modo crear)
            setSaleData(null);
            setSaleId(null);
          }
        } catch (error) {
          console.error('Error checking existing sale:', error);
          setSaleData(null);
          setSaleId(null);
        }
      }
    };

    checkExistingSale();
  }, [showSaleDialog, selectedVehicle]);

  // Handle status columns drop
  const handleColumnDrop = (statusId: number) => {
    handleDrop(statusId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle vehicle preview
  const handlePreviewVehicle = (vehicleId: number) => {
    const vehicle = optimisticVehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
      setPreviewVehicle(vehicle);
      setIsPreviewOpen(true);
    }
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewVehicle(null);
  };

  const handleViewDetails = (vehicleId: number) => {
    setIsPreviewOpen(false);
    setPreviewVehicle(null);
    onView(vehicleId);
  };

  // Sort statuses by order
  const sortedStatuses = [...statuses].sort((a, b) => {
    const orderA = a.order || 0;
    const orderB = b.order || 0;
    return orderA - orderB;
  });

  // Group vehicles by status usando optimisticVehicles para UI instantánea
  const vehiclesByStatus = sortedStatuses.reduce((acc, status) => {
    acc[status.id] = optimisticVehicles.filter((v) => v.status_id === status.id);
    return acc;
  }, {} as Record<number, typeof optimisticVehicles>);

  if (isLoading || statusesLoading) {
    return (
      <div className='flex justify-center items-center h-64'>
        <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary'></div>
      </div>
    );
  }

  return (
    <div className='h-full'>
      <div
        ref={boardRef}
        className='flex gap-4 p-6 pb-6 overflow-x-auto items-start h-full'
      >
        {sortedStatuses.map((status) => (
          <StatusColumn
            key={status.id}
            status={status}
            vehicles={vehiclesByStatus[status.id] || []}
            onDragOver={handleDragOver}
            onDrop={() => handleColumnDrop(status.id)}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onViewVehicle={handlePreviewVehicle}
            onEditVehicle={onEdit}
            onDeleteVehicle={onDelete}
            checklistSummaries={checklistSummaries}
          />
        ))}

        {sortedStatuses.length === 0 && (
          <div className='flex items-center justify-center w-full'>
            <p className='text-muted-foreground'>
              {tCommon('vehicles.board.noStatuses')}
            </p>
          </div>
        )}
      </div>

      {/* Existing dialogs */}
      {showReservationDialog && selectedVehicle && (
        <VehicleReservationDialog
          isOpen={showReservationDialog}
          onClose={handleDialogClose}
          vehicle={selectedVehicle}
          onSuccess={handleReservationComplete}
        />
      )}

      {showSaleDialog && selectedVehicle && (
        <VehicleSaleCreateEditDialog
          isOpen={showSaleDialog}
          onClose={() => {
            handleDialogClose();
            setSaleData(null);
            setSaleId(null);
          }}
          vehicle={selectedVehicle}
          saleId={saleId || undefined}
          initialData={saleData}
          onSuccess={() => {
            handleSaleComplete();
            setSaleData(null);
            setSaleId(null);
          }}
        />
      )}

      {/* New notification modal */}
      {showNotificationModal && statusUpdateData && (
        <ConsignmentNotificationModal
          isOpen={showNotificationModal}
          onClose={handleNotificationModalClose}
          vehicleId={statusUpdateData.vehicleId}
          previousStatus={statusUpdateData.oldStatus}
          newStatus={statusUpdateData.newStatus}
        />
      )}

      {/* Vehicle Preview Sheet */}
      <VehiclePreviewSheet
        vehicle={previewVehicle}
        open={isPreviewOpen}
        onClose={handleClosePreview}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
};

export default VehiculosBoardView;
