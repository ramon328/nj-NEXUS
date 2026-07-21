import { useAuth } from '@/contexts/AuthContext';
import { useReservationState } from './reservation/useReservationState';
import { useReservationLoader } from './reservation/useReservationLoader';
import { useReservationCreation } from './reservation/useReservationCreation';
import { usePaymentManagement } from './reservation/usePaymentManagement';
import { useReservationUpdate } from './reservation/useReservationUpdate';

export const useVehicleReservation = (vehicleId: number) => {
  const { clientId } = useAuth();

  // Initialize state management
  const state = useReservationState(vehicleId);

  // Set up reservation loading
  const { loadReservation } = useReservationLoader(vehicleId, clientId, {
    setIsLoading: state.setIsLoading,
    setReservation: state.setReservation,
    setPayments: state.setPayments,
    setAdditionals: state.setAdditionals,
    setIsNew: state.setIsNew,
  });

  // Set up reservation creation
  const { createNewReservation } = useReservationCreation(
    vehicleId,
    clientId,
    { setSaving: state.setSaving },
    loadReservation
  );

  // Set up payment management
  const {
    addPayment,
    updatePayment,
    removePayment,
    addAdditional,
    updateAdditional,
    removeAdditional,
  } = usePaymentManagement(
    vehicleId,
    {
      setSaving: state.setSaving,
      setPayments: state.setPayments,
      setAdditionals: state.setAdditionals,
    },
    loadReservation
  );

  // Set up reservation updates
  const { updateReservationDetails } = useReservationUpdate(
    {
      reservation: state.reservation,
      setSaving: state.setSaving,
    },
    loadReservation
  );

  return {
    // State
    isLoading: state.isLoading,
    reservation: state.reservation,
    payments: state.payments,
    additionals: state.additionals,
    isNew: state.isNew,
    saving: state.saving,
    totalAmount: state.totalAmount,
    totalPayments: state.totalPayments,
    totalAdditionals: state.totalAdditionals,
    agreedPrice: state.agreedPrice,
    remainingAmount: state.remainingAmount,

    // Methods
    loadReservation,
    createNewReservation,
    addPayment,
    updatePayment,
    removePayment,
    addAdditional,
    updateAdditional,
    removeAdditional,
    updateReservationDetails,
  };
};
