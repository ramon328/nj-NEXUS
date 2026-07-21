import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useVehicleReservation } from '@/hooks/useVehicleReservation';

type ReservationStep = 'customer' | 'details' | 'firstPayment' | 'payments';

export const useReservationDialog = (
  vehicleId: number,
  isOpen: boolean,
  onSuccess?: () => void
) => {
  const { t } = useTranslation('vehicleReservations');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAdditionalForm, setShowAdditionalForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedAdditional, setSelectedAdditional] = useState<any>(null);
  const [step, setStep] = useState<ReservationStep>('customer');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null
  );

  const {
    isLoading,
    reservation,
    payments,
    additionals,
    isNew,
    saving,
    totalAmount,
    totalPayments,
    totalAdditionals,
    agreedPrice,
    remainingAmount,
    createNewReservation,
    addPayment,
    updatePayment,
    removePayment,
    addAdditional,
    updateAdditional,
    removeAdditional,
    updateReservationDetails,
    loadReservation,
  } = useVehicleReservation(vehicleId);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log('Dialog opened, initializing state');
      setShowPaymentForm(false);
      setShowAdditionalForm(false);
      setSelectedPayment(null);
      setSelectedAdditional(null);
      setSelectedCustomerId(null);

      // Force reload data to ensure we have latest info
      loadReservation().then(() => {
        console.log('After loading reservation:', { reservation, isNew });
        // If we already have a reservation, go to payments view
        if (reservation && !isNew) {
          console.log('Existing reservation found, going to payments step');
          setStep('payments');
        } else {
          console.log('No existing reservation found, going to customer step');
          setStep('customer');
        }
      });
    }
  }, [isOpen]);

  // Handle reservation state changes
  useEffect(() => {
    if (isOpen && reservation && !isNew && step === 'customer') {
      console.log(
        "Reservation exists and we're on customer step, moving to payments"
      );
      setStep('payments');
    }
  }, [reservation, isNew, step, isOpen]);

  // Force reload the data when the step changes to firstPayment
  useEffect(() => {
    if (step === 'firstPayment') {
      console.log('Step changed to firstPayment, reloading data');
      loadReservation();
    }
  }, [step]);

  const handleCustomerSelected = (customerId: number | null) => {
    console.log('Customer selected:', customerId);
    setSelectedCustomerId(customerId);

    // Force a reload to check if there's already a reservation for this vehicle
    loadReservation().then(() => {
      if (isNew) {
        console.log('Moving to details step');
        setStep('details');
      } else {
        console.log('Moving to payments step');
        setStep('payments');
      }
    });
  };

  const handleReservationCreated = async (data: {
    validityDays: number;
    notes: string | null;
    customerId: number | null;
    reservationAgreedPrice: number;
  }) => {
    // Use the stored selectedCustomerId if one wasn't provided in the data
    const customerIdToUse =
      data.customerId !== null ? data.customerId : selectedCustomerId;

    console.log('Creating reservation with data:', {
      ...data,
      customerId: customerIdToUse,
    });

    const success = await createNewReservation({
      ...data,
      customerId: customerIdToUse,
    });

    if (success) {
      console.log('Reservation created successfully, moving to payment step');

      // Force reload reservation data to ensure we have the latest information
      await loadReservation();

      // Move to first payment step
      setStep('payments');
    }
  };

  const handleSkipFirstPayment = () => {
    console.log('Skipping first payment, moving to payments step');
    setStep('payments');
    if (onSuccess) onSuccess();
  };

  const handleAddPayment = () => {
    console.log('Adding new payment');
    setSelectedPayment(null);
    setShowPaymentForm(true);
    setShowAdditionalForm(false);
  };

  const handleEditPayment = (payment: any) => {
    console.log('Editing payment:', payment);
    setSelectedPayment(payment);
    setShowPaymentForm(true);
    setShowAdditionalForm(false);
  };

  const handleAddAdditional = () => {
    console.log('Adding new additional');
    setSelectedAdditional(null);
    setShowAdditionalForm(true);
    setShowPaymentForm(false);
  };

  const handleEditAdditional = (additional: any) => {
    console.log('Editing additional:', additional);
    setSelectedAdditional(additional);
    setShowAdditionalForm(true);
    setShowPaymentForm(false);
  };

  const handlePaymentSubmit = async (data: {
    amount: number;
    title: string;
    description: string | null;
  }) => {
    console.log('Submitting payment:', data);
    let success = false;

    if (selectedPayment) {
      // Update existing payment
      success = await updatePayment(selectedPayment.id, data);
    } else {
      // Create new payment
      const paymentId = await addPayment(data);
      success = !!paymentId;
    }

    if (success) {
      setShowPaymentForm(false);
      setSelectedPayment(null);
      // Don't call onSuccess here - keep modal open
    }
  };

  const handleAdditionalSubmit = async (data: {
    amount: number;
    title: string;
    description: string | null;
  }) => {
    console.log('Submitting additional:', data);
    let success = false;

    if (selectedAdditional) {
      // Update existing additional
      success = await updateAdditional(selectedAdditional.id, data);
    } else {
      // Create new additional
      const additionalId = await addAdditional(data);
      success = !!additionalId;
    }

    if (success) {
      setShowAdditionalForm(false);
      setSelectedAdditional(null);
      // Don't call onSuccess here - keep modal open
    }
  };

  const handlePaymentCancel = () => {
    console.log('Cancelling payment form');
    setShowPaymentForm(false);
    setSelectedPayment(null);
  };

  const handleAdditionalCancel = () => {
    console.log('Cancelling additional form');
    setShowAdditionalForm(false);
    setSelectedAdditional(null);
  };

  const handlePaymentDelete = async (paymentId: number) => {
    console.log('Deleting payment:', paymentId);
    const success = await removePayment(paymentId);
    // Don't call onSuccess here - keep modal open
  };

  const handleAdditionalDelete = async (additionalId: number) => {
    console.log('Deleting additional:', additionalId);
    const success = await removeAdditional(additionalId);
    // Don't call onSuccess here - keep modal open
  };

  const handleUpdateReservation = async (data: {
    expirationDate?: Date | string;
    notes?: string | null;
    status?: string | null;
  }) => {
    console.log('Updating reservation with data:', data);
    const success = await updateReservationDetails(data);
    // Don't call onSuccess here - keep modal open
  };

  // Determine the dialog title based on the current step
  const getDialogTitle = (vehicle: any) => {
    switch (step) {
      case 'customer':
        return t('dialog.titles.customer');
      case 'details':
        return t('dialog.titles.details');

      case 'payments':
        return t('dialog.titles.paymentsFor', {
          brand: vehicle?.brand?.name,
          model: vehicle?.model?.name,
        });
      default:
        // Fallback title, though all known steps are handled
        return t('dialog.titles.paymentsFor', {
          brand: vehicle?.brand?.name,
          model: vehicle?.model?.name,
        });
    }
  };

  return {
    step,
    isLoading,
    reservation,
    payments,
    additionals,
    saving,
    totalAmount,
    totalPayments,
    totalAdditionals,
    agreedPrice,
    remainingAmount,
    showPaymentForm,
    showAdditionalForm,
    selectedPayment,
    selectedAdditional,
    selectedCustomerId,
    getDialogTitle,
    handleCustomerSelected,
    handleReservationCreated,
    handleSkipFirstPayment,
    handleAddPayment,
    handleEditPayment,
    handleAddAdditional,
    handleEditAdditional,
    handlePaymentSubmit,
    handleAdditionalSubmit,
    handlePaymentCancel,
    handleAdditionalCancel,
    handlePaymentDelete,
    handleAdditionalDelete,
    handleUpdateReservation,
  };
};
