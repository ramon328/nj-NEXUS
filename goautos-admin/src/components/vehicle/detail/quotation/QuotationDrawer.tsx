import React, { useRef, useState, useEffect } from 'react';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Check, Car } from 'lucide-react';
import { StepIndicator, StepDef } from '@/components/ui/step-indicator';
import VehicleSelectionStep from '@/components/ui/vehicle-selection-step';
import QuotationForm from '@/components/vehicle/QuotationForm';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/hooks/useI18n';
import { LuFileText } from 'react-icons/lu';

interface QuotationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId?: number | null;
  onSuccess?: () => void;
}

const QUOTATION_STEP_DEFS: StepDef[] = [
  { id: 1, title: 'Vehículo', shortTitle: 'Vehículo', icon: Car },
  { id: 2, title: 'Cotización', shortTitle: 'Cotización', icon: LuFileText },
];

const QuotationDrawer: React.FC<QuotationDrawerProps> = ({
  open,
  onOpenChange,
  vehicleId,
  onSuccess,
}) => {
  const { t } = useTranslation('vehicleQuotations');
  const { tCommon } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [isOnVehicleStep, setIsOnVehicleStep] = useState(false);

  const showVehicleStep = !vehicleId;
  const effectiveVehicleId = vehicleId ?? selectedVehicleId;

  useEffect(() => {
    if (open && showVehicleStep) {
      setIsOnVehicleStep(true);
      setSelectedVehicleId(null);
    }
  }, [open]);

  const handleClose = () => {
    setSelectedVehicleId(null);
    setIsOnVehicleStep(false);
    onOpenChange(false);
    onSuccess?.();
  };

  const handleCancel = () => {
    setSelectedVehicleId(null);
    setIsOnVehicleStep(false);
    onOpenChange(false);
  };

  const handleVehicleSelected = (v: any) => {
    setSelectedVehicleId(v.id);
    setIsOnVehicleStep(false);
  };

  const handleFormSubmit = () => {
    if (formRef.current) {
      formRef.current.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    }
  };

  const currentStepIndex = isOnVehicleStep ? 1 : 2;

  const dialogContent = (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 py-5 sm:px-5 sm:py-5 border-b border-slate-100 shrink-0">
        <h2 className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
          {tCommon('vehicles.detail.generateQuotation')}
        </h2>
      </div>

      {/* Step Indicator - only show when vehicle selection step exists */}
      {showVehicleStep && (
        <StepIndicator
          steps={QUOTATION_STEP_DEFS}
          currentStep={currentStepIndex}
        />
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
        {isOnVehicleStep ? (
          <VehicleSelectionStep onSelect={handleVehicleSelected} />
        ) : effectiveVehicleId ? (
          <QuotationForm
            vehicleId={effectiveVehicleId}
            onSuccess={handleClose}
            formRef={formRef}
            hideSubmitButton
          />
        ) : null}
      </div>

      {/* Footer */}
      {!isOnVehicleStep && (
        <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="gap-2 rounded-xl"
            >
              {tCommon('buttons.cancel')}
            </Button>

            <Button
              type="button"
              onClick={handleFormSubmit}
              disabled={isSubmitting}
              className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('form.generating')}</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{t('form.generateButton')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Drawer open={open} onOpenChange={(o) => !o && handleCancel()} direction="right" dismissible={false}>
      <DrawerContentRight className="md:min-w-[440px] md:max-w-[520px]">
        <div className="flex flex-col h-full">
          {dialogContent}
        </div>
      </DrawerContentRight>
    </Drawer>
  );
};

export default QuotationDrawer;
