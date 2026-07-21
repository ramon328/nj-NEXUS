import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { useReservationDialog } from './hooks/useReservationDialog';
import ReservationDialogContent from './ReservationDialogContent';
import { Calendar, FileText, Wallet, Car, X } from 'lucide-react';
import { StepIndicator, StepDef } from '@/components/ui/step-indicator';
import VehicleSelectionStep from '@/components/ui/vehicle-selection-step';

interface VehicleReservationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: any | null;
  onSuccess?: () => void;
}

const STEP_KEYS = ['customer', 'details', 'payments'] as const;

const BASE_STEP_DEFS: StepDef[] = [
  { id: 1, title: 'Cliente', shortTitle: 'Cliente', icon: Calendar },
  { id: 2, title: 'Detalles', shortTitle: 'Detalles', icon: FileText },
  { id: 3, title: 'Pagos', shortTitle: 'Pagos', icon: Wallet },
];

const withVehicleStep = (defs: StepDef[]): StepDef[] => [
  { id: 1, title: 'Vehículo', shortTitle: 'Vehículo', icon: Car },
  ...defs.map(s => ({ ...s, id: s.id + 1 })),
];

const VehicleReservationDialog: React.FC<VehicleReservationDialogProps> = ({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
}) => {
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [isOnVehicleStep, setIsOnVehicleStep] = useState(false);

  const showVehicleStep = !vehicle;
  const effectiveVehicle = vehicle ?? selectedVehicle;

  const stepDefs = showVehicleStep ? withVehicleStep(BASE_STEP_DEFS) : BASE_STEP_DEFS;
  const stepOffset = showVehicleStep ? 1 : 0;

  const {
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
    getDialogTitle,
    handleCustomerSelected,
    handleReservationCreated,
    handleSkipFirstPayment,
    handleAddPayment,
    handleEditPayment,
    handlePaymentSubmit,
    handlePaymentCancel,
    handlePaymentDelete,
    handleAddAdditional,
    handleEditAdditional,
    handleAdditionalDelete,
    handleUpdateReservation,
    handleAdditionalSubmit,
    handleAdditionalCancel,
  } = useReservationDialog(effectiveVehicle?.id, isOpen && !isOnVehicleStep, onSuccess);

  useEffect(() => {
    if (isOpen && showVehicleStep) {
      setIsOnVehicleStep(true);
      setSelectedVehicle(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setSelectedVehicle(null);
    setIsOnVehicleStep(false);
    onClose();
  };

  const handleVehicleSelected = (v: any) => {
    setSelectedVehicle(v);
    setIsOnVehicleStep(false);
  };

  const isNew = !reservation;
  const currentStepIndex = isOnVehicleStep ? 1 : STEP_KEYS.indexOf(step) + 1 + stepOffset;

  const dialogContent = (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 py-5 border-b border-slate-100 shrink-0 flex items-center justify-between gap-3">
        <h2 className="text-sm md:text-base font-semibold text-slate-900 leading-tight">
          {isOnVehicleStep ? 'Nueva Reserva' : getDialogTitle(effectiveVehicle)}
        </h2>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar"
          className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step Indicator - only show when creating new reservation */}
      {isNew && !isLoading && (
        <StepIndicator
          steps={stepDefs}
          currentStep={currentStepIndex}
        />
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-3">
        {isOnVehicleStep ? (
          <VehicleSelectionStep onSelect={handleVehicleSelected} excludeWithDocumentType="reservation" />
        ) : (
          <ReservationDialogContent
            vehicle={effectiveVehicle}
            step={step}
            isLoading={isLoading}
            reservation={reservation}
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
            selectedCustomerId={selectedCustomerId}
            onCustomerSelected={handleCustomerSelected}
            onReservationCreated={handleReservationCreated}
            onSkipFirstPayment={handleSkipFirstPayment}
            onAddPayment={handleAddPayment}
            onEditPayment={handleEditPayment}
            onDeletePayment={handlePaymentDelete}
            onAddAdditional={handleAddAdditional}
            onEditAdditional={handleEditAdditional}
            onDeleteAdditional={handleAdditionalDelete}
            onUpdateReservation={handleUpdateReservation}
            onSubmitPayment={handlePaymentSubmit}
            onSubmitAdditional={handleAdditionalSubmit}
            onCancelPayment={handlePaymentCancel}
            onCancelAdditional={handleAdditionalCancel}
          />
        )}
      </div>
    </div>
  );

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(o) => !o && handleClose()}
      direction="right"
      dismissible={false}
    >
      <DrawerContentRight className="md:min-w-[480px] md:max-w-[600px]">
        <div className="flex flex-col h-full">
          {dialogContent}
        </div>
      </DrawerContentRight>
    </Drawer>
  );
};

export default VehicleReservationDialog;
