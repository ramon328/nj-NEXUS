
import React from 'react';
import { Button } from '@/components/ui/button';
import ReservationPaymentForm from '@/components/vehicle/detail/reservations/ReservationPaymentForm';

interface ReservationStepFirstPaymentProps {
  saving: boolean;
  onSubmit: (data: {
    amount: number;
    title: string;
    description: string | null;
  }) => void;
  onCancel: () => void;
  onSkip: () => void;
}

const ReservationStepFirstPayment: React.FC<ReservationStepFirstPaymentProps> = ({
  saving,
  onSubmit,
  onCancel,
  onSkip
}) => {
  return (
    <div className="space-y-2">
      <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-xs font-medium text-green-800">Reserva creada exitosamente</p>
        <p className="text-[11px] text-green-700 mt-0.5">
          Ahora puede registrar un abono para esta reserva.
        </p>
      </div>

      <ReservationPaymentForm
        payment={null}
        onSubmit={onSubmit}
        onCancel={onCancel}
        saving={saving}
      />

      <div className="flex justify-center">
        <Button
          variant="link"
          type="button"
          onClick={onSkip}
          className="text-xs h-auto py-1"
        >
          Omitir y continuar sin abono
        </Button>
      </div>
    </div>
  );
};

export default ReservationStepFirstPayment;
