import React from 'react';
import ReservationForm from '@/components/vehicle/detail/reservations/ReservationForm';

interface ReservationStepDetailsProps {
  vehicle: any;
  saving: boolean;
  selectedCustomerId: number | null;
  onSubmit: (data: {
    validityDays: number;
    notes: string | null;
    customerId: number | null;
    reservationAgreedPrice: number;
  }) => void;
}

const ReservationStepDetails: React.FC<ReservationStepDetailsProps> = ({
  vehicle,
  saving,
  selectedCustomerId,
  onSubmit,
}) => {
  return (
    <ReservationForm
      vehicle={vehicle}
      saving={saving}
      onSubmit={onSubmit}
      selectedCustomerId={selectedCustomerId}
    />
  );
};

export default ReservationStepDetails;
