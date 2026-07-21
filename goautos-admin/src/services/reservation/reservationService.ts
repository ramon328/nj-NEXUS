import { supabase } from '@/integrations/supabase/client';
import { formatDateForDatabase } from './utils';
import posthog from '@/utils/posthog';

/**
 * Get or create a reservation for a vehicle
 */
export const getOrCreateReservation = async (
  vehicleId: number,
  clientId: number
) => {
  try {
    console.log('Getting reservation for vehicle:', vehicleId);

    // Check if there's an existing reservation
    const { data: reservationData, error: reservationError } = await supabase
      .from('vehicles_reservations')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (reservationError) {
      console.error('Error fetching reservation:', reservationError);
      throw reservationError;
    }

    console.log('Reservation data:', reservationData);

    // Get reservation payments if exists
    let payments = [];
    if (reservationData && reservationData.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('vehicles_extras')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('type', 'reservation_payment')
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
        throw paymentsError;
      }

      console.log('Payments data:', paymentsData);
      payments = paymentsData || [];

      return {
        reservation: reservationData[0],
        payments,
        isNew: false,
      };
    }

    // No reservation exists
    return {
      reservation: null,
      payments: [],
      isNew: true,
    };
  } catch (error) {
    console.error('Error in getOrCreateReservation:', error);
    throw error;
  }
};

/**
 * Create a new reservation
 */
export const createReservation = async (
  vehicleId: number,
  customerId: number | null,
  documentId: number,
  expirationDate: Date,
  reservationDate: Date,
  notes: string | null,
  reservationAgreedPrice: number
) => {
  try {
    console.log('Creating reservation with params:', {
      vehicleId,
      customerId,
      documentId,
      expirationDate,
      reservationDate,
      notes,
      reservationAgreedPrice,
    });

    // Format dates for Supabase
    const formattedExpirationDate = formatDateForDatabase(expirationDate);
    const formattedReservationDate = formatDateForDatabase(reservationDate);

    console.log('Formatted dates:', {
      expirationDate: formattedExpirationDate,
      reservationDate: formattedReservationDate,
    });

    const { data, error } = await supabase
      .from('vehicles_reservations')
      .insert({
        vehicle_id: vehicleId,
        customer_id: customerId,
        document_id: documentId,
        expiration_date: formattedExpirationDate,
        reservation_date: formattedReservationDate,
        status: 'active',
        notes,
        reservation_amount: 0, // Initially zero, will be updated as payments are added
        reservation_agreed_price: reservationAgreedPrice,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating reservation:', error);
      throw error;
    }

    console.log('Reservation created with ID:', data?.id);

    posthog.capture({
      distinctId: String(customerId ?? 'anonymous'),
      event: 'reservation_created',
      properties: {
        reservation_id: data?.id,
        vehicle_id: vehicleId,
        customer_id: customerId,
        reservation_agreed_price: reservationAgreedPrice,
      },
    });

    return data.id;
  } catch (error) {
    posthog.captureException(error);
    console.error('Error creating reservation:', error);
    throw error;
  }
};

/**
 * Cancela la reserva ACTIVA de un vehículo y limpia todo lo asociado, dejando el
 * mismo estado final que "eliminar el documento de reserva": sin registro de
 * reserva, sin abonos/adicionales colgados y sin documento huérfano.
 *
 * Se usa cuando el auto sale de "Reservado" hacia otro estado que NO sea
 * "Vendido" (en ese caso el pie se traspasa a la venta, así que NO se limpia).
 *
 * Por qué existe: los abonos (pie) se guardan en `vehicles_extras` keyed solo por
 * `vehicle_id` + `type='reservation_payment'` y se leen siempre por `vehicle_id`.
 * Si al despublicar no se borran, reaparecen y el pie "se suma y se suma" en la
 * siguiente reserva/venta. Cada paso es best-effort (no bloquea el cambio de
 * estado) pero borrar extras + reserva es lo que corta la acumulación.
 */
export const cancelReservationAndCleanup = async (vehicleId: number) => {
  try {
    // 1. Ubicar la reserva activa para conocer su documento asociado.
    const { data: reservation } = await supabase
      .from('vehicles_reservations')
      .select('id, document_id')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Borrar abonos y adicionales de la reserva (el "pie").
    const { error: extrasError } = await supabase
      .from('vehicles_extras')
      .delete()
      .eq('vehicle_id', vehicleId)
      .in('type', ['reservation_payment', 'reservation_additional']);
    if (extrasError) console.warn('Error deleting reservation extras:', extrasError);

    // 3. Borrar el/los registro(s) de reserva activos del vehículo.
    const { error: reservationError } = await supabase
      .from('vehicles_reservations')
      .delete()
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active');
    if (reservationError) console.warn('Error deleting reservation record:', reservationError);

    // 4. Borrar el documento de reserva (y su cotización) para no dejar una nota
    //    huérfana en la sección Documentos apuntando a una reserva ya inexistente.
    const documentId = reservation?.document_id;
    if (documentId) {
      const { error: quotationError } = await supabase
        .from('vehicles_quotations')
        .delete()
        .eq('document_id', documentId);
      if (quotationError && !quotationError.message?.includes('no rows')) {
        console.warn('Error deleting reservation quotation:', quotationError);
      }

      const { error: docError } = await supabase
        .from('vehicles_documents')
        .delete()
        .eq('id', documentId);
      if (docError) console.warn('Error deleting reservation document:', docError);
    }

    return true;
  } catch (error) {
    console.error('Error cancelling reservation and cleaning up:', error);
    return false;
  }
};

/**
 * Update reservation details
 */
export const updateReservation = async (
  reservationId: number,
  expirationDate: Date | string,
  notes: string | null,
  status: string,
  reservationAgreedPrice?: number
) => {
  try {
    const formattedExpirationDate = formatDateForDatabase(expirationDate);

    console.log('Updating reservation:', reservationId, {
      expirationDate: formattedExpirationDate,
      notes,
      status,
      reservationAgreedPrice,
    });

    const updateData: any = {
      expiration_date: formattedExpirationDate,
      notes,
      status,
      updated_at: formatDateForDatabase(new Date()),
    };
    if (reservationAgreedPrice !== undefined) {
      updateData.reservation_agreed_price = reservationAgreedPrice;
    }

    const { error } = await supabase
      .from('vehicles_reservations')
      .update(updateData)
      .eq('id', reservationId);

    if (error) {
      console.error('Error updating reservation:', error);
      throw error;
    }

    console.log('Reservation updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating reservation details:', error);
    return false;
  }
};
