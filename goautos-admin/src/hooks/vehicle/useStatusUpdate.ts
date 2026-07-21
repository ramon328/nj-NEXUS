import React, { useState, Dispatch, SetStateAction } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle } from '@/types/vehicle';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '../useUserProfile';
import {
  markSoldInChileautos,
  updateInChileautos,
  getChileautosIntegration,
  getChileautosListingByVehicle,
} from '@/services/chileautosService';
import posthog from '@/utils/posthog';
import { useMeliCloseStore } from '@/stores/meliCloseStore';
import { toast } from '@/hooks/use-toast';
import { cancelReservationAndCleanup } from '@/services/reservation';

type StatusUpdateData = {
  vehicleId: number;
  oldStatus: string;
  newStatus: string;
};

// Details for action after notification modal is closed
type PostNotificationDetails = {
  vehicleId: number;
  newStatusId: number;
  newStatusName: string;
  // isConsigned: boolean; // Not strictly needed here if only set for consigned flow
  // oldStatusName: string;
};

export const useStatusUpdate = (
  refreshVehicles: () => void,
  // Accept setShowReservationDialog from useVehicleDragDrop
  setShowReservationDialogProp: Dispatch<SetStateAction<boolean>>,
  // Flag para controlar si se debe hacer refresh automático (false para optimistic updates)
  autoRefresh: boolean = true,
  // Called only after the status UPDATE is confirmed in the DB. Lets callers
  // sync their in-memory cache (e.g. useVehicles) when autoRefresh is off, so a
  // later client-side refilter doesn't revert the change. Not called for
  // dialog-gated changes (Vendido/Reservado) until the dialog actually persists.
  onStatusPersisted?: (vehicleId: number, statusId: number) => void
) => {
  const { userData, clientId } = useAuth();

  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [statusUpdateData, setStatusUpdateData] =
    useState<StatusUpdateData | null>(null);
  const [postNotificationDetails, setPostNotificationDetails] =
    useState<PostNotificationDetails | null>(null);

  const _executeDirectOrFinalAction = async (
    vehicleId: number,
    newStatusId: number,
    newStatusName: string
  ) => {
    console.log('[useStatusUpdate] _executeDirectOrFinalAction:', {
      vehicleId,
      newStatusId,
      newStatusName,
    });
    const { data: vehicleData, error: vehicleFetchError } = await supabase
      .from('vehicles')
      .select(
        '*, vehicles_sales:vehicles_sales!vehicles_sales_vehicle_id_fkey(id, status), reservations:vehicles_reservations(id, status)'
      )
      .eq('id', vehicleId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (vehicleFetchError || !vehicleData) {
      console.error(
        '[useStatusUpdate] Failed to fetch vehicle details in _executeDirectOrFinalAction:',
        vehicleFetchError
      );
      await updateVehicleStatus(vehicleId, newStatusId, true);
      return;
    }

    // Guard "venta activa": el trigger de BD protect_sold_vehicle_status revierte
    // a "Vendido" cualquier cambio de estado si el vehículo tiene una venta
    // confirmada. En PROD ese trigger filtra por status IN ('approved','completed')
    // y esta condición usa el mismo criterio, así que solo bloqueamos lo que la
    // base igual iba a revertir en silencio (la tarjeta "miente" 1-2s y vuelve a
    // Vendido). En vez de eso, avisamos al usuario que primero devuelva la venta.
    // OJO: la definición versionada del trigger (20260305250000) incluye además
    // 'pending' (drift respecto a prod); si se realinea el trigger, revisar aquí.
    if (newStatusName !== 'Vendido') {
      const hasConfirmedSale =
        Array.isArray(vehicleData.vehicles_sales) &&
        vehicleData.vehicles_sales.some(
          (s: { status?: string }) =>
            s?.status === 'approved' || s?.status === 'completed'
        );
      if (hasConfirmedSale) {
        console.log(
          '[useStatusUpdate] Bloqueado: el vehículo tiene una venta confirmada, no puede salir de "Vendido" desde aquí.'
        );
        toast({
          title: 'Este auto tiene una venta activa',
          description:
            'Para sacarlo de "Vendido", primero devuelve o rechaza la venta en la sección Ventas. Si no, el sistema lo vuelve a marcar como vendido automáticamente.',
          variant: 'destructive',
        });
        // Revertir el cambio optimista del tablero volviendo al estado del servidor.
        refreshVehicles();
        return;
      }
    }

    if (newStatusName === 'Vendido') {
      const existingSale =
        vehicleData.vehicles_sales && vehicleData.vehicles_sales.length > 0;
      if (existingSale) {
        console.log(
          '[useStatusUpdate] Action: Vendido. Vehicle already has a sale record. Updating status.'
        );
        await updateVehicleStatus(vehicleId, newStatusId, true);
      } else {
        console.log(
          '[useStatusUpdate] Action: Vendido. No existing sale. Showing sale dialog.'
        );
        setSelectedVehicle(vehicleData as Vehicle);
        setShowSaleDialog(true);
      }
    } else if (newStatusName === 'Reservado') {
      // OJO: las reservas se crean con status 'active' (inglés) en
      // reservationService.createReservation. Antes esto comparaba con 'Activa'
      // y nunca hacía match, así que re-abría el diálogo aunque ya hubiera una
      // reserva viva (parte de por qué el pie "reaparecía").
      const activeReservation = vehicleData.reservations?.find((res) => {
        return res.status === 'active';
      });

      if (activeReservation) {
        console.log(
          '[useStatusUpdate] Action: Reservado. Vehicle already has an active reservation. Updating status.'
        );
        await updateVehicleStatus(vehicleId, newStatusId, true);
      } else {
        console.log(
          '[useStatusUpdate] Action: Reservado. No active reservation. Showing reservation dialog.'
        );
        setSelectedVehicle(vehicleData as Vehicle);
        setShowReservationDialogProp(true);
      }
    } else {
      // Salida de "Reservado" hacia un estado que NO es Vendido (ej. Publicado).
      // Si el auto tiene una reserva activa, hay que cancelarla y limpiar sus
      // abonos (pie), si no la reserva/utilidades quedan colgadas y el pie se
      // re-acumula. Se pide confirmación porque borra registros de plata y el
      // cambio de estado puede ser un drag accidental.
      const activeReservation = vehicleData.reservations?.find(
        (res) => res.status === 'active'
      );

      if (activeReservation) {
        const confirmed = window.confirm(
          `Este auto tiene una reserva activa. Al moverlo a "${newStatusName}" se cancelará la reserva y se eliminarán sus abonos (pie) y su documento de reserva. ¿Continuar?`
        );

        if (!confirmed) {
          // Revertir el cambio optimista del tablero: vuelve a "Reservado".
          refreshVehicles();
          return;
        }

        await cancelReservationAndCleanup(vehicleId);
        toast({
          title: 'Reserva cancelada',
          description: 'Se canceló la reserva y se eliminaron sus abonos.',
        });
      }

      console.log(
        '[useStatusUpdate] Action: Other status. Updating status directly.'
      );
      await updateVehicleStatus(vehicleId, newStatusId, true);
    }
  };

  const handleStatusChange = async (
    vehicleId: number,
    newStatusId: number,
    isConsigned: boolean,
    oldStatusName: string,
    newStatusName: string
  ) => {
    console.log('[useStatusUpdate] handleStatusChange:', {
      vehicleId,
      newStatusId,
      isConsigned,
      oldStatusName,
      newStatusName,
    });
    setStatusUpdateData({
      vehicleId,
      oldStatus: oldStatusName,
      newStatus: newStatusName,
    });

    if (isConsigned && oldStatusName !== newStatusName) {
      console.log(
        '[useStatusUpdate] Consigned vehicle, status changing. Showing notification modal first.'
      );
      setPostNotificationDetails({ vehicleId, newStatusId, newStatusName });
      setShowNotificationModal(true);
      return; // Flow continues in processPostNotificationActions
    }

    // Non-consigned vehicle, or consigned but status not effectively changing
    console.log(
      '[useStatusUpdate] Non-consigned or no effective change for consigned. Executing direct action.'
    );
    await _executeDirectOrFinalAction(vehicleId, newStatusId, newStatusName);
  };

  const processPostNotificationActions = async () => {
    console.log('[useStatusUpdate] processPostNotificationActions called.');
    setShowNotificationModal(false); // Ensure notification modal is hidden

    if (postNotificationDetails) {
      const { vehicleId, newStatusId, newStatusName } = postNotificationDetails;
      console.log(
        '[useStatusUpdate] Has postNotificationDetails, proceeding with action:',
        postNotificationDetails
      );
      setPostNotificationDetails(null); // Clear details
      await _executeDirectOrFinalAction(vehicleId, newStatusId, newStatusName);
    } else {
      console.warn(
        '[useStatusUpdate] processPostNotificationActions: No details found. Defaulting to refresh.'
      );
      refreshVehicles(); // Should ideally not happen if called correctly
    }
  };

  // Sync vehicle changes to ChileAutos when status changes
  const syncChileautosOnStatusChange = async (vehicleId: number) => {
    try {
      if (!clientId) return;
      const caIntegration = await getChileautosIntegration(clientId);
      if (!caIntegration || caIntegration.status !== 'active') return;

      const listing = await getChileautosListingByVehicle(vehicleId);
      if (!listing || listing.status !== 'published') return;

      // Fire-and-forget update to keep ChileAutos in sync
      if (caIntegration.sync_on_update) {
        updateInChileautos(vehicleId, clientId).then((result) => {
          if (!result.success) {
            console.warn('[ChileAutos] Status sync failed:', result.error);
          } else {
            console.log('[ChileAutos] Vehicle synced after status change');
          }
        });
      }
    } catch (err) {
      console.warn('[ChileAutos] Error syncing on status change:', err);
    }
  };

  const updateVehicleStatus = async (
    vehicleId: number,
    statusId: number,
    shouldRefresh: boolean
  ) => {
    try {
      console.log('[useStatusUpdate] updateVehicleStatus called with:', {
        vehicleId,
        statusId,
        shouldRefresh,
      });

      // Get current status before updating
      const { data: currentVehicle } = await supabase
        .from('vehicles')
        .select('status_id')
        .eq('id', vehicleId)
        .eq('client_id', clientId)
        .single();

      const oldStatusId = currentVehicle?.status_id || null;

      const { error } = await supabase
        .from('vehicles')
        .update({
          status_id: statusId,
          state_updated_at: new Date().toISOString(),
        })
        .eq('id', vehicleId)
        .eq('client_id', clientId);

      if (error) {
        console.error('Error updating vehicle status:', error);
        return;
      }

      // Sync the caller's in-memory cache now that the DB write is confirmed.
      // This is what keeps the board card in its new column after a refilter
      // (e.g. clearing the search box) when autoRefresh is off.
      onStatusPersisted?.(vehicleId, statusId);

      console.log('[useStatusUpdate] oldStatusId:', oldStatusId);
      console.log('[useStatusUpdate] statusId:', statusId);
      // Record history if status actually changed
      if (oldStatusId !== statusId) {
        await recordStatusHistory(vehicleId, oldStatusId, statusId);

        posthog.capture({
          distinctId: userData?.id || 'anonymous',
          event: 'vehicle_status_changed',
          properties: {
            vehicle_id: vehicleId,
            from_status: oldStatusId,
            to_status: statusId,
          },
        });
      }

      console.log(
        '[useStatusUpdate] Vehicle status updated successfully in DB.'
      );

      // ChileAutos sync: fire-and-forget
      if (clientId) {
        syncChileautosOnStatusChange(vehicleId);
      }

      // Si el nuevo estado es "Vendido", ofrecer cerrar los avisos activos de
      // MercadoLibre (preguntando antes). Solo al transicionar (no si ya estaba).
      if (oldStatusId !== statusId) {
        try {
          const { data: stateRow } = await supabase
            .from('clients_vehicles_states')
            .select('name')
            .eq('id', statusId)
            .single();
          if (stateRow?.name && /vendido/i.test(stateRow.name)) {
            void useMeliCloseStore.getState().requestClose(vehicleId);
          }
        } catch (e) {
          console.warn('[MeLi close] sold-state check failed', e);
        }
      }

      if (shouldRefresh && autoRefresh) {
        console.log('[useStatusUpdate] Calling refreshVehicles().');
        refreshVehicles();
      } else {
        console.log('[useStatusUpdate] Skipping refreshVehicles() (autoRefresh or shouldRefresh is false).');
      }
    } catch (error) {
      console.error('Error in updateVehicleStatus:', error);
    }
  };

  // Simple function to record status history
  const recordStatusHistory = async (
    vehicleId: number,
    oldStatusId: number | null,
    newStatusId: number
  ) => {
    if (!userData) return;

    console.log('[useStatusUpdate] recordStatusHistory called with:', {
      vehicleId,
      oldStatusId,
      newStatusId,
      userId: userData.id,
    });

    try {
      await supabase.from('vehicles_status_history').insert({
        vehicle_id: vehicleId,
        old_status_id: oldStatusId,
        new_status_id: newStatusId,
        changed_by: userData.id,
      });
    } catch (error) {
      console.error('Error recording status history:', error);
    }
  };

  return {
    handleStatusChange,
    updateVehicleStatus,
    showSaleDialog,
    setShowSaleDialog,
    showNotificationModal,
    processPostNotificationActions,
    selectedVehicle,
    setSelectedVehicle,
    statusUpdateData,
  };
};
