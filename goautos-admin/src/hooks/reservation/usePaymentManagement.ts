import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import {
  createReservationPayment,
  updateReservationPayment,
  deleteReservationPayment,
  getReservationPayments,
  createReservationAdditional,
  updateReservationAdditional,
  deleteReservationAdditional,
  getReservationAdditionals,
} from '@/services/reservation';

export const usePaymentManagement = (
  vehicleId: number,
  state: {
    setSaving: (saving: boolean) => void;
    setPayments: (payments: any[]) => void;
    setAdditionals?: (additionals: any[]) => void;
  },
  loadReservation: () => Promise<void>
) => {
  const { setSaving, setPayments, setAdditionals } = state;

  // Add a payment to the reservation
  const addPayment = async (data: {
    amount: number;
    title: string;
    description: string | null;
  }) => {
    if (!vehicleId) return null;

    setSaving(true);
    try {
      console.log(
        'Creating payment for vehicle:',
        vehicleId,
        'amount:',
        data.amount
      );

      const paymentId = await createReservationPayment(
        vehicleId,
        data.amount,
        new Date(),
        data.title,
        data.description
      );

      if (!paymentId) {
        throw new Error('No se pudo registrar el abono');
      }

      console.log('Payment created with ID:', paymentId);

      // Refresh the payment list
      const newPayments = await getReservationPayments(vehicleId);
      console.log('Updated payments list:', newPayments);
      setPayments(newPayments);

      // Reload the reservation to get the updated amount
      await loadReservation();

      toast({
        title: 'Abono registrado',
        description: `Se ha registrado un abono de ${formatCurrency(
          data.amount
        )}`,
      });

      return paymentId;
    } catch (error) {
      console.error('Error adding payment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el abono',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Add an additional to the reservation
  const addAdditional = async (data: {
    amount: number;
    title: string;
    description: string | null;
  }) => {
    if (!vehicleId) return null;

    setSaving(true);
    try {
      console.log(
        'Creating additional for vehicle:',
        vehicleId,
        'amount:',
        data.amount
      );

      const additionalId = await createReservationAdditional(
        vehicleId,
        data.amount,
        new Date(),
        data.title,
        data.description
      );

      if (!additionalId) {
        throw new Error('No se pudo registrar el adicional');
      }

      console.log('Additional created with ID:', additionalId);

      // Refresh the additionals list
      if (setAdditionals) {
        const newAdditionals = await getReservationAdditionals(vehicleId);
        console.log('Updated additionals list:', newAdditionals);
        setAdditionals(newAdditionals);
      }

      // Reload the reservation to get the updated amount
      await loadReservation();

      toast({
        title: 'Adicional registrado',
        description: `Se ha registrado un adicional de ${formatCurrency(
          data.amount
        )}`,
      });

      return additionalId;
    } catch (error) {
      console.error('Error adding additional:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar el adicional',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Update a payment
  const updatePayment = async (
    paymentId: number,
    data: {
      amount: number;
      title: string;
      description: string | null;
    }
  ) => {
    if (!vehicleId) return false;

    setSaving(true);
    try {
      console.log('Updating payment:', paymentId, data);

      const success = await updateReservationPayment(
        paymentId,
        data.amount,
        new Date(),
        data.title,
        data.description
      );

      if (!success) {
        throw new Error('No se pudo actualizar el abono');
      }

      // Refresh the payment list
      const newPayments = await getReservationPayments(vehicleId);
      setPayments(newPayments);

      // Reload the reservation to get the updated amount
      await loadReservation();

      toast({
        title: 'Abono actualizado',
        description: 'El abono ha sido actualizado exitosamente',
      });

      return true;
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el abono',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Update an additional
  const updateAdditional = async (
    additionalId: number,
    data: {
      amount: number;
      title: string;
      description: string | null;
    }
  ) => {
    if (!vehicleId) return false;

    setSaving(true);
    try {
      console.log('Updating additional:', additionalId, data);

      const success = await updateReservationAdditional(
        additionalId,
        data.amount,
        new Date(),
        data.title,
        data.description
      );

      if (!success) {
        throw new Error('No se pudo actualizar el adicional');
      }

      // Refresh the additionals list
      if (setAdditionals) {
        const newAdditionals = await getReservationAdditionals(vehicleId);
        setAdditionals(newAdditionals);
      }

      // Reload the reservation to get the updated amount
      await loadReservation();

      toast({
        title: 'Adicional actualizado',
        description: 'El adicional ha sido actualizado exitosamente',
      });

      return true;
    } catch (error) {
      console.error('Error updating additional:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el adicional',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Delete a payment
  const removePayment = async (paymentId: number) => {
    if (!vehicleId) return false;

    setSaving(true);
    try {
      console.log('Removing payment:', paymentId);

      const success = await deleteReservationPayment(paymentId);

      if (!success) {
        throw new Error('No se pudo eliminar el abono');
      }

      // Refresh the payment list
      const newPayments = await getReservationPayments(vehicleId);
      setPayments(newPayments);

      // Reload the reservation to get the updated amount
      await loadReservation();

      toast({
        title: 'Abono eliminado',
        description: 'El abono ha sido eliminado exitosamente',
      });

      return true;
    } catch (error) {
      console.error('Error removing payment:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el abono',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Delete an additional
  const removeAdditional = async (additionalId: number) => {
    if (!vehicleId) return false;

    setSaving(true);
    try {
      console.log('Removing additional:', additionalId);

      const success = await deleteReservationAdditional(additionalId);

      if (!success) {
        throw new Error('No se pudo eliminar el adicional');
      }

      // Refresh the additionals list
      if (setAdditionals) {
        const newAdditionals = await getReservationAdditionals(vehicleId);
        setAdditionals(newAdditionals);
      }

      // Reload the reservation to get the updated amount
      await loadReservation();

      toast({
        title: 'Adicional eliminado',
        description: 'El adicional ha sido eliminado exitosamente',
      });

      return true;
    } catch (error) {
      console.error('Error removing additional:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el adicional',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    addPayment,
    updatePayment,
    removePayment,
    addAdditional,
    updateAdditional,
    removeAdditional,
  };
};
