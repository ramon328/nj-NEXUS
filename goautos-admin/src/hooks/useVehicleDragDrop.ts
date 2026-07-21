import { useState, Dispatch, SetStateAction } from 'react';
import { Vehicle } from '@/types/vehicle';
import { supabase } from '@/integrations/supabase/client';
import { useDragDrop } from './vehicle/useDragDrop';
import { useStatusUpdate } from './vehicle/useStatusUpdate';

export const useVehicleDragDrop = (
  refreshVehicles: () => void,
  onOptimisticUpdate?: (vehicleId: number, newStatusId: number) => void,
  // Called after a status change is confirmed in the DB. Used to keep the
  // parent's in-memory cache in sync when optimistic updates skip the refresh.
  onStatusPersisted?: (vehicleId: number, newStatusId: number) => void
) => {
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null);

  const {
    draggingVehicleId,
    isDragging,
    handleDragStart,
    handleDragEnd,
    setDraggingVehicleId,
    setIsDragging,
  } = useDragDrop();

  const {
    handleStatusChange,
    showSaleDialog,
    setShowSaleDialog,
    showNotificationModal,
    processPostNotificationActions,
    selectedVehicle,
    setSelectedVehicle,
    statusUpdateData,
  } = useStatusUpdate(
    refreshVehicles,
    setShowReservationDialog,
    !onOptimisticUpdate, // Si hay optimistic update, NO hacer autoRefresh
    onStatusPersisted
  );

  const handleReservationComplete = () => {
    setShowReservationDialog(false);
    refreshVehicles();
  };

  const handleSaleComplete = () => {
    setShowSaleDialog(false);
    setSelectedVehicle(null);
    refreshVehicles();
  };

  const handleDialogClose = () => {
    setShowReservationDialog(false);
    setPendingStatusId(null);
  };

  const handleNotificationModalClose = () => {
    if (processPostNotificationActions) {
      processPostNotificationActions();
    } else {
      console.warn(
        'processPostNotificationActions not found, falling back to refreshVehicles'
      );
      refreshVehicles();
    }
  };

  const handleDrop = async (statusId: number) => {
    if (!draggingVehicleId) return;

    // Actualización optimista INMEDIATA antes de llamar al backend
    if (onOptimisticUpdate) {
      onOptimisticUpdate(draggingVehicleId, statusId);
    }

    try {
      const { data: statusData, error: statusError } = await supabase
        .from('clients_vehicles_states')
        .select('name')
        .eq('id', statusId)
        .single();

      if (statusError) {
        console.error('Error fetching status name:', statusError);
        setIsDragging(false);
        setDraggingVehicleId(null);
        // TODO: Rollback optimistic update on error
        if (onOptimisticUpdate) {
          refreshVehicles(); // Revert to server state
        }
        return;
      }

      const { data: vehicleData, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, is_consigned, status:status_id(name)')
        .eq('id', draggingVehicleId)
        .single();

      if (vehicleError) {
        console.error('Error fetching vehicle data:', vehicleError);
        setIsDragging(false);
        setDraggingVehicleId(null);
        // TODO: Rollback optimistic update on error
        if (onOptimisticUpdate) {
          refreshVehicles(); // Revert to server state
        }
        return;
      }

      await handleStatusChange(
        draggingVehicleId,
        statusId,
        vehicleData.is_consigned,
        vehicleData.status?.name || 'Desconocido',
        statusData.name
      );
    } catch (error) {
      console.error('Error in handleDrop:', error);
      // TODO: Rollback optimistic update on error
      if (onOptimisticUpdate) {
        refreshVehicles(); // Revert to server state
      }
    } finally {
      setDraggingVehicleId(null);
      setIsDragging(false);
    }
  };

  return {
    draggingVehicleId,
    isDragging,
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
  };
};
