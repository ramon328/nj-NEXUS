import { toast } from '@/hooks/use-toast';
import { addDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  createReservationDocument,
  createReservation,
} from '@/services/reservation';

export const useReservationCreation = (
  vehicleId: number,
  clientId: number | undefined,
  state: {
    setSaving: (saving: boolean) => void;
  },
  loadReservation: () => Promise<void>
) => {
  const { setSaving } = state;

  const createNewReservation = async (data: {
    customerId: number | null;
    validityDays: number;
    notes: string | null;
    reservationAgreedPrice: number;
  }) => {
    if (!vehicleId || !clientId) {
      console.error('Missing vehicleId or clientId:', { vehicleId, clientId });
      return null;
    }

    setSaving(true);
    try {
      console.log('Creating reservation:', {
        vehicleId,
        clientId,
        customerId: data.customerId,
        validityDays: data.validityDays,
        notes: data.notes,
      });

      // 0. Check if a sale already exists for this vehicle
      const { data: existingSale } = await supabase
        .from('vehicles_sales')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .maybeSingle();

      if (existingSale) {
        toast({
          title: 'Error',
          description: 'Este vehículo ya tiene una venta registrada. No se puede crear una reserva.',
          variant: 'destructive',
        });
        return null;
      }

      // 0.5 Check if an active reservation already exists
      const { data: existingReservation } = await supabase
        .from('vehicles_reservations')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingReservation) {
        toast({
          title: 'Error',
          description: 'Este vehículo ya tiene una reserva activa.',
          variant: 'destructive',
        });
        return null;
      }

      // 1. Find the "Reservado" status ID
      const { data: statusData, error: statusError } = await supabase
        .from('clients_vehicles_states')
        .select('id')
        .eq('client_id', clientId)
        .eq('name', 'Reservado')
        .single();

      if (statusError) {
        console.error('Error finding Reserved status:', statusError);
        // Continue with reservation creation even if status couldn't be found
      }

      const reservedStatusId = statusData?.id;
      console.log('Reserved status ID:', reservedStatusId);

      // 2. Create the document
      const documentId = await createReservationDocument(
        vehicleId,
        clientId,
        data.customerId
      );

      if (!documentId) {
        throw new Error('No se pudo crear el documento de reserva');
      }

      console.log('Document created with ID:', documentId);

      // 3. Calculate expiration date correctly using addDays from date-fns
      const reservationDate = new Date();
      const expirationDate = addDays(reservationDate, data.validityDays);

      console.log('Calculated dates:', {
        reservationDate: reservationDate.toISOString(),
        expirationDate: expirationDate.toISOString(),
        validityDays: data.validityDays,
      });

      // 4. Create the reservation
      const reservationId = await createReservation(
        vehicleId,
        data.customerId,
        documentId,
        expirationDate,
        reservationDate,
        data.notes,
        data.reservationAgreedPrice
      );

      if (!reservationId) {
        throw new Error('No se pudo crear la reserva');
      }

      console.log('Reservation created with ID:', reservationId);

      // 5. Update vehicle status to "Reservado" if we found the status ID
      if (reservedStatusId) {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update({ status_id: reservedStatusId })
          .eq('id', vehicleId);

        if (updateError) {
          console.error('Error updating vehicle status:', updateError);
          // We'll still consider the reservation creation successful
          // even if the status update fails
        } else {
          console.log('Vehicle status updated to Reserved (Reservado)');
        }
      } else {
        console.warn(
          "Could not update vehicle status: 'Reservado' status not found for this client"
        );
      }

      // 6. Reload the data
      await loadReservation();

      toast({
        title: 'Reserva creada',
        description: 'La reserva ha sido creada exitosamente',
      });

      return reservationId;
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear la reserva',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  return { createNewReservation };
};
