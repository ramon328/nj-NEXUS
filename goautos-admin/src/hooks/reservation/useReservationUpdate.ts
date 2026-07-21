import { toast } from '@/hooks/use-toast';
import { updateReservation } from '@/services/reservation';

export const useReservationUpdate = (
  state: {
    reservation: any;
    setSaving: (saving: boolean) => void;
  },
  loadReservation: () => Promise<void>
) => {
  const { reservation, setSaving } = state;

  // Update the reservation details
  const updateReservationDetails = async (data: {
    expirationDate?: Date | string;
    notes?: string | null;
    status?: string | null;
    reservation_agreed_price?: number;
  }) => {
    if (!reservation || !reservation.id) return false;

    setSaving(true);
    try {
      const success = await updateReservation(
        reservation.id,
        data.expirationDate || reservation.expiration_date,
        data.notes !== undefined ? data.notes : reservation.notes,
        data.status || reservation.status,
        data.reservation_agreed_price !== undefined
          ? data.reservation_agreed_price
          : reservation.reservation_agreed_price
      );

      if (!success) {
        throw new Error('No se pudo actualizar la reserva');
      }

      // Reload the data
      await loadReservation();

      toast({
        title: 'Reserva actualizada',
        description: 'La reserva ha sido actualizada exitosamente',
      });

      return true;
    } catch (error) {
      console.error('Error updating reservation:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la reserva',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { updateReservationDetails };
};
