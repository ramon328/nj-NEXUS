import React from 'react';
import { Loader2 } from 'lucide-react';
import ReservationStepCustomer from './steps/ReservationStepCustomer';
import ReservationStepDetails from './steps/ReservationStepDetails';
import ReservationStepFirstPayment from './steps/ReservationStepFirstPayment';
import ReservationStepPayments from './steps/ReservationStepPayments';

interface ReservationDialogContentProps {
  vehicle: any;
  step: 'customer' | 'details' | 'firstPayment' | 'payments';
  isLoading: boolean;
  reservation: any;
  payments: any[];
  additionals: any[];
  totalAmount: number;
  totalPayments: number;
  totalAdditionals: number;
  agreedPrice: number;
  remainingAmount: number;
  saving: boolean;
  showPaymentForm: boolean;
  showAdditionalForm: boolean;
  selectedPayment: any;
  selectedAdditional: any;
  selectedCustomerId: number | null;
  onCustomerSelected: (customerId: number | null) => void;
  onReservationCreated: (data: {
    validityDays: number;
    notes: string | null;
    customerId: number | null;
    reservationAgreedPrice: number;
  }) => void;
  onSkipFirstPayment: () => void;
  onAddPayment: () => void;
  onEditPayment: (payment: any) => void;
  onDeletePayment: (paymentId: number) => void;
  onAddAdditional: () => void;
  onEditAdditional: (additional: any) => void;
  onDeleteAdditional: (additionalId: number) => void;
  onUpdateReservation: (data: {
    expirationDate?: Date | string;
    notes?: string | null;
    status?: string | null;
  }) => void;
  onSubmitPayment: (data: {
    amount: number;
    title: string;
    description: string | null;
  }) => void;
  onSubmitAdditional: (data: {
    amount: number;
    title: string;
    description: string | null;
  }) => void;
  onCancelPayment: () => void;
  onCancelAdditional: () => void;
}

const ReservationDialogContent: React.FC<ReservationDialogContentProps> = ({
  vehicle,
  step,
  isLoading,
  reservation,
  payments,
  additionals,
  totalAmount,
  totalPayments,
  totalAdditionals,
  agreedPrice,
  remainingAmount,
  saving,
  showPaymentForm,
  showAdditionalForm,
  selectedPayment,
  selectedAdditional,
  selectedCustomerId,
  onCustomerSelected,
  onReservationCreated,
  onSkipFirstPayment,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  onAddAdditional,
  onEditAdditional,
  onDeleteAdditional,
  onUpdateReservation,
  onSubmitPayment,
  onSubmitAdditional,
  onCancelPayment,
  onCancelAdditional,
}) => {
  if (isLoading) {
    return (
      <div className='flex justify-center items-center py-8'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-2'>Cargando datos de la reserva...</span>
      </div>
    );
  }

  switch (step) {
    case 'customer':
      return (
        <ReservationStepCustomer
          vehicle={vehicle}
          onCustomerSelected={onCustomerSelected}
        />
      );

    case 'details':
      return (
        <ReservationStepDetails
          vehicle={vehicle}
          saving={saving}
          onSubmit={onReservationCreated}
          selectedCustomerId={selectedCustomerId}
        />
      );

    case 'firstPayment':
      return (
        <ReservationStepFirstPayment
          saving={saving}
          onSubmit={onSubmitPayment}
          onCancel={onCancelPayment}
          onSkip={onSkipFirstPayment}
        />
      );

    case 'payments':
      return (
        <ReservationStepPayments
          reservation={reservation}
          vehicle={vehicle}
          payments={payments}
          additionals={additionals}
          totalAmount={totalAmount}
          totalPayments={totalPayments}
          totalAdditionals={totalAdditionals}
          agreedPrice={agreedPrice}
          remainingAmount={remainingAmount}
          saving={saving}
          showPaymentForm={showPaymentForm}
          showAdditionalForm={showAdditionalForm}
          selectedPayment={selectedPayment}
          selectedAdditional={selectedAdditional}
          onAddPayment={onAddPayment}
          onEditPayment={onEditPayment}
          onDeletePayment={onDeletePayment}
          onAddAdditional={onAddAdditional}
          onEditAdditional={onEditAdditional}
          onDeleteAdditional={onDeleteAdditional}
          onUpdateReservation={onUpdateReservation}
          onSubmitPayment={onSubmitPayment}
          onSubmitAdditional={onSubmitAdditional}
          onCancelPayment={onCancelPayment}
          onCancelAdditional={onCancelAdditional}
        />
      );

    default:
      return null;
  }
};

export default ReservationDialogContent;
