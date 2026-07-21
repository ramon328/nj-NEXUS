import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  useCloseBusinessDealStore,
  CloseBusinessDealStep,
} from '@/stores/closeBusinessDealStore';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  FileText,
  ClipboardCheck,
  Car,
  AlertTriangle,
} from 'lucide-react';
import { StepIndicator, StepDef } from '@/components/ui/step-indicator';
import VehicleSelectionStep from '@/components/ui/vehicle-selection-step';
import CustomerSelectionStep from './steps/CustomerSelectionStep';
import DealDetailsStep from './steps/DealDetailsStep';
import SummaryStep from './steps/SummaryStep';
import { toast } from 'sonner';
import {
  createCloseBusinessDeal,
  updateCloseBusinessDeal,
} from '@/services/closeBusinessDealService';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/functions';
import posthog from '@/utils/posthog';

interface CloseBusinessDealDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: any | null;
  onSuccess?: () => void;
  documentId?: number | null;
  isEditMode?: boolean;
}

const STEP_KEYS: CloseBusinessDealStep[] = [
  'customer-selection',
  'deal-details',
  'summary',
];

const BASE_STEP_DEFS: StepDef[] = [
  { id: 1, title: 'Cliente', shortTitle: 'Cliente', icon: UserCheck },
  { id: 2, title: 'Detalles', shortTitle: 'Detalles', icon: FileText },
  { id: 3, title: 'Resumen', shortTitle: 'Resumen', icon: ClipboardCheck },
];

const withVehicleStep = (defs: StepDef[]): StepDef[] => [
  { id: 1, title: 'Vehículo', shortTitle: 'Vehículo', icon: Car },
  ...defs.map(s => ({ ...s, id: s.id + 1 })),
];

const CloseBusinessDealDrawer: React.FC<CloseBusinessDealDrawerProps> = ({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
  documentId = null,
  isEditMode = false,
}) => {
  const { client } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [isOnVehicleStep, setIsOnVehicleStep] = useState(false);
  const [showMinPriceWarning, setShowMinPriceWarning] = useState(false);
  const [belowMinReason, setBelowMinReason] = useState('');

  const showVehicleStep = !vehicle;
  const effectiveVehicle = vehicle ?? selectedVehicle;

  const stepDefs = showVehicleStep ? withVehicleStep(BASE_STEP_DEFS) : BASE_STEP_DEFS;
  const stepOffset = showVehicleStep ? 1 : 0;

  const {
    currentStep,
    isSubmitting,
    setVehicle,
    resetStore,
    goToNextStep,
    goToPreviousStep,
    canProceedToNextStep,
    canNavigateToStep,
    setCurrentStep,
    setIsSubmitting,
    customerId,
    customer,
    dealDetails,
    setCustomer,
    updateDealDetails,
    setEditMode,
    sellerCommissions,
  } = useCloseBusinessDealStore();

  const currentStepIndex = isOnVehicleStep ? 1 : STEP_KEYS.indexOf(currentStep) + 1 + stepOffset;
  const isFirstStep = isOnVehicleStep || (!showVehicleStep && currentStep === 'customer-selection');
  const isLastStep = currentStepIndex === stepDefs.length;

  // Initialize store when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (showVehicleStep) {
        setIsOnVehicleStep(true);
        setSelectedVehicle(null);
      }

      if (effectiveVehicle) {
        if (isEditMode && documentId) {
          resetStore();
          setVehicle(effectiveVehicle);
          setEditMode(true, null, documentId);
          setTimeout(() => {
            loadExistingData();
          }, 100);
        } else {
          setVehicle(effectiveVehicle);
        }
      }
    } else {
      resetStore();
    }
  }, [isOpen, vehicle, isEditMode, documentId]);

  // Force reload data when documentId changes in edit mode
  useEffect(() => {
    if (isOpen && documentId && isEditMode) {
      loadExistingData();
    }
  }, [documentId]);

  const loadExistingData = async () => {
    if (!documentId || !effectiveVehicle) return;

    setIsLoading(true);
    try {
      const { data: documentData, error: documentError } = await supabase
        .from('vehicles_documents')
        .select('*')
        .eq('id', documentId)
        .eq('type', 'close_deal')
        .single();

      if (documentError) {
        console.error('Error fetching document:', documentError);
        toast.error('Error al cargar los datos del documento');
        return;
      }

      let finalSalePrice = 0;
      if (documentId) {
        const { data: closeDealPriceData, error: closeDealPriceError } =
          await supabase
            .from('vehicles_close_deal')
            .select('finalSalePrice')
            .eq('document_id', documentId)
            .single();

        if (!closeDealPriceError && closeDealPriceData) {
          finalSalePrice = closeDealPriceData.finalSalePrice || 0;
        }
      }

      const { data: closeDealData, error: closeDealError } = await supabase
        .from('vehicles_close_deal')
        .select('*')
        .eq('document_id', documentId)
        .single();

      if (closeDealError) {
        console.error('Error fetching close deal data:', closeDealError);
        toast.error('Error al cargar los datos del cierre de negocio');
        return;
      }

      if (documentData.customer_id) {
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', documentData.customer_id)
          .single();

        if (!customerError && customerData) {
          setCustomer(customerData);
        }
      }

      updateDealDetails({
        finalSalePrice: finalSalePrice,
        discount: closeDealData.discount || 0,
        dealershipCommission: closeDealData.dealershipCommission,
        dealershipCommissionPercentage:
          closeDealData.dealershipCommissionPercentage,
        paymentMethod: closeDealData.paymentMethod,
        notes: documentData.notes || '',
      });
    } catch (error) {
      console.error('Error loading existing data:', error);
      toast.error('Error al cargar los datos existentes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting || !canProceedToNextStep()) return;

    if (!customerId || !customer) {
      toast.error('Debe seleccionar un cliente');
      return;
    }
    if (dealDetails.finalSalePrice <= 0) {
      toast.error('Debe especificar un precio final válido');
      return;
    }
    if (dealDetails.dealershipCommission < 0) {
      toast.error('La comisión no puede ser negativa');
      return;
    }
    if (!dealDetails.paymentMethod) {
      toast.error('Debe seleccionar un método de pago');
      return;
    }

    const minPrice = effectiveVehicle?.min_price;
    if (minPrice && dealDetails.finalSalePrice < minPrice) {
      setBelowMinReason('');
      setShowMinPriceWarning(true);
      return;
    }

    await executeSubmit();
  };

  const handleConfirmBelowMinPrice = async () => {
    const reason = belowMinReason.trim();
    if (!reason) return;

    posthog.capture({
      distinctId: client?.id?.toString(),
      event: 'close_deal_below_min_price_override',
      properties: {
        vehicle_id: effectiveVehicle?.id,
        final_sale_price: dealDetails.finalSalePrice,
        min_price: effectiveVehicle?.min_price,
        diff: (effectiveVehicle?.min_price || 0) - dealDetails.finalSalePrice,
        reason,
      },
    });

    setShowMinPriceWarning(false);
    await executeSubmit();
  };

  const executeSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (isEditMode && documentId) {
        // Update existing
        const result = await updateCloseBusinessDeal({
          documentId,
          customerId,
          finalSalePrice: dealDetails.finalSalePrice,
          discount: dealDetails.discount,
          dealershipCommission: dealDetails.dealershipCommission,
          dealershipCommissionPercentage:
            dealDetails.dealershipCommissionPercentage,
          paymentMethod: dealDetails.paymentMethod,
          notes: dealDetails.notes,
          sellerCommissions,
          vehicleId: effectiveVehicle?.id,
        });

        if (!result.success) {
          toast.error(
            result.error || 'Error al actualizar el cierre de negocio'
          );
          return;
        }

        toast.success('Cierre de negocio actualizado exitosamente');
      } else {
        // Create new
        const result = await createCloseBusinessDeal({
          vehicleId: effectiveVehicle.id,
          customerId,
          clientId: client?.id || 0,
          finalSalePrice: dealDetails.finalSalePrice,
          discount: dealDetails.discount,
          dealershipCommission: dealDetails.dealershipCommission,
          dealershipCommissionPercentage:
            dealDetails.dealershipCommissionPercentage,
          paymentMethod: dealDetails.paymentMethod,
          notes: dealDetails.notes,
          sellerCommissions,
        });

        if (!result.success) {
          toast.error(result.error || 'Error al crear el cierre de negocio');
          return;
        }

        toast.success('Cierre de negocio generado exitosamente');
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error submitting close business deal:', error);
      toast.error(
        isEditMode
          ? 'Error al actualizar el cierre de negocio'
          : 'Error al generar el cierre de negocio'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedVehicle(null);
      setIsOnVehicleStep(false);
      onClose();
    }
  };

  const handleVehicleSelected = (v: any) => {
    setSelectedVehicle(v);
    setIsOnVehicleStep(false);
    setVehicle(v);
  };

  const handleStepClick = (stepId: number) => {
    if (showVehicleStep && stepId === 1) {
      setIsOnVehicleStep(true);
      return;
    }
    const key = STEP_KEYS[stepId - 1 - stepOffset];
    if (key && canNavigateToStep(key)) {
      setIsOnVehicleStep(false);
      setCurrentStep(key);
    }
  };

  const canNavigateToStepById = (stepId: number) => {
    if (showVehicleStep && stepId === 1) return true;
    const key = STEP_KEYS[stepId - 1 - stepOffset];
    return key ? canNavigateToStep(key) : false;
  };

  const renderStepContent = () => {
    if (isOnVehicleStep) {
      return <VehicleSelectionStep onSelect={handleVehicleSelected} filterConsignedOnly excludeWithDocumentType="close_deal" />;
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando datos...
        </div>
      );
    }

    switch (currentStep) {
      case 'customer-selection':
        return <CustomerSelectionStep />;
      case 'deal-details':
        return <DealDetailsStep />;
      case 'summary':
        return <SummaryStep />;
      default:
        return null;
    }
  };

  const dialogContent = (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 py-5 border-b border-slate-100 shrink-0">
        <h2 className="text-sm md:text-base font-semibold text-slate-900 leading-tight">
          {isEditMode ? 'Editar Cierre de Negocio' : 'Cierre de Negocio'}
        </h2>
        {effectiveVehicle && (
          <p className="text-xs text-slate-500 mt-0.5">
            {effectiveVehicle.brand?.name} {effectiveVehicle.model?.name} {effectiveVehicle.year} -{' '}
            {effectiveVehicle.license_plate}
          </p>
        )}
      </div>

      {/* Step Indicator */}
      <StepIndicator
        steps={stepDefs}
        currentStep={currentStepIndex}
        onStepClick={handleStepClick}
        canNavigateToStep={canNavigateToStepById}
      />

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-3">
        {renderStepContent()}
      </div>

      {/* Footer */}
      {!isOnVehicleStep && (
        <div className="px-3 py-2 pb-3 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={isFirstStep ? handleClose : (showVehicleStep && currentStep === 'customer-selection' ? () => setIsOnVehicleStep(true) : goToPreviousStep)}
              disabled={isSubmitting || isLoading}
              className="gap-2 rounded-xl"
            >
              {isFirstStep ? (
                'Cancelar'
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={goToNextStep}
                  disabled={
                    !canProceedToNextStep() || isSubmitting || isLoading
                  }
                  className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    !canProceedToNextStep() || isSubmitting || isLoading
                  }
                  className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>
                        {isEditMode ? 'Actualizando...' : 'Generando...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>
                        {isEditMode
                          ? 'Actualizar Cierre'
                          : 'Generar Cierre'}
                      </span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Drawer open={isOpen} onOpenChange={(o) => !o && handleClose()} direction="right" dismissible={false}>
        <DrawerContentRight className="md:min-w-[520px] md:max-w-[640px]">
          <div className="flex flex-col h-full">{dialogContent}</div>
        </DrawerContentRight>
      </Drawer>

      <AlertDialog open={showMinPriceWarning} onOpenChange={setShowMinPriceWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-red-600'>
              <AlertTriangle className='h-5 w-5' />
              Estás cerrando bajo el precio mínimo
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-2'>
                <p>
                  Precio final: <strong>{formatCurrency(dealDetails.finalSalePrice)}</strong> ·
                  Precio mínimo: <strong>{formatCurrency(effectiveVehicle?.min_price || 0)}</strong>
                </p>
                <p className='text-red-600 font-medium'>
                  Diferencia: {formatCurrency((effectiveVehicle?.min_price || 0) - dealDetails.finalSalePrice)} bajo el mínimo.
                </p>
                <p className='text-slate-600'>
                  Para continuar tienes que dejar registrado por qué se está cerrando
                  bajo el piso (autorización del jefe, descuento estratégico, etc.).
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='py-2'>
            <label className='text-[11px] uppercase tracking-wider text-slate-500 font-medium'>
              Motivo <span className='text-red-500'>*</span>
            </label>
            <Textarea
              placeholder='Ej: descuento autorizado por jefe / rotación del auto'
              value={belowMinReason}
              onChange={(e) => setBelowMinReason(e.target.value)}
              rows={3}
              maxLength={500}
              className='mt-1.5 text-[13px] rounded-xl border-slate-200/60'
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmBelowMinPrice();
              }}
              disabled={!belowMinReason.trim()}
              className='bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:pointer-events-none'
            >
              Cerrar igual
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CloseBusinessDealDrawer;
