import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReservationDetails from '@/components/vehicle/detail/reservations/ReservationDetails';
import ReservationPaymentsList from '@/components/vehicle/detail/reservations/ReservationPaymentsList';
import ReservationPaymentForm from '@/components/vehicle/detail/reservations/ReservationPaymentForm';
import ReservationAdditionalsList from '@/components/vehicle/detail/reservations/ReservationAdditionalsList';
import ReservationAdditionalForm from '@/components/vehicle/detail/reservations/ReservationAdditionalForm';
import ReservationSummary from '@/components/vehicle/detail/reservations/ReservationSummary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ReservationStepPaymentsProps {
  reservation: any;
  vehicle: any;
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

const ReservationStepPayments: React.FC<ReservationStepPaymentsProps> = ({
  reservation,
  vehicle,
  payments,
  additionals,
  totalPayments,
  totalAdditionals,
  remainingAmount,
  saving,
  selectedPayment,
  selectedAdditional,
  onEditPayment,
  onDeletePayment,
  onAddAdditional,
  onEditAdditional,
  onDeleteAdditional,
  onUpdateReservation,
  onSubmitPayment,
  onSubmitAdditional,
}) => {
  const [activeTab, setActiveTab] = useState('payments');
  const { t } = useTranslation('vehicleReservations');

  return (
    <div className='space-y-2'>
      <ReservationDetails
        reservation={reservation}
        vehicle={vehicle}
        onUpdate={onUpdateReservation}
      />

      <ReservationSummary
        agreedPrice={reservation.reservation_agreed_price}
        totalPayments={totalPayments}
        totalAdditionals={totalAdditionals}
        remainingAmount={remainingAmount}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid w-full grid-cols-2 h-8'>
          <TabsTrigger value='payments' className='text-xs'>{t('payments.tabs.payments')}</TabsTrigger>
          <TabsTrigger value='additionals' className='text-xs'>{t('payments.tabs.additionals')}</TabsTrigger>
        </TabsList>

        <TabsContent value='payments' className='space-y-2 mt-2'>
          {payments.length > 0 && (
            <div className='p-2 rounded-lg border'>
              <p className='text-xs font-semibold text-slate-700 mb-1.5'>{t('payments.list.paymentsTitle')}</p>
              <ReservationPaymentsList
                payments={payments}
                totalAmount={totalPayments}
                onEdit={onEditPayment}
                onDelete={onDeletePayment}
              />
            </div>
          )}

          <ReservationPaymentForm
            saving={saving}
            payment={selectedPayment}
            onSubmit={onSubmitPayment}
          />
        </TabsContent>

        <TabsContent value='additionals' className='space-y-2 mt-2'>
          {additionals.length > 0 && (
            <div className='p-2 rounded-lg border'>
              <p className='text-xs font-semibold text-slate-700 mb-1.5'>{t('payments.list.additionalsTitle')}</p>
              <ReservationAdditionalsList
                additionals={additionals}
                totalAdditionals={totalAdditionals}
                onAddAdditional={onAddAdditional}
                onEditAdditional={onEditAdditional}
                onDeleteAdditional={onDeleteAdditional}
              />
            </div>
          )}

          <ReservationAdditionalForm
            saving={saving}
            selectedAdditional={selectedAdditional}
            onSubmit={onSubmitAdditional}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReservationStepPayments;
