import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import posthog from '@/utils/posthog';
import {
  useVehicleSaleStore,
  SaleStep,
  VehicleExtra,
} from '@/stores/vehicleSaleStore';
import { Check, ChevronLeft, ChevronRight, Loader2, AlertTriangle, UserCheck, DollarSign, Car, ClipboardCheck, X, FileClock } from 'lucide-react';
import {
  saveSaleDraft,
  loadSaleDraft,
  clearSaleDraft,
  formatDraftDate,
} from '@/lib/vehicleSaleDrafts';
import { StepIndicator, StepDef } from '@/components/ui/step-indicator';
import VehicleSelectionStep from '@/components/ui/vehicle-selection-step';
import CustomerSelectionStep from './steps/CustomerSelectionStep';
import SaleInfoStep from './steps/SaleInfoStep';
import TradeInStep from './steps/TradeInStep';
import SummaryStep from './steps/SummaryStep';
import {
  registerVehicleSale,
  updateVehicleSale,
  PaymentItem,
} from '@/services/vehicleSaleService';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateSalesQueries } from '@/lib/invalidateSalesQueries';
import { useMeliCloseStore } from '@/stores/meliCloseStore';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/functions';

interface VehicleSaleCreateEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: any | null;
  onSuccess: () => void;
  initialData?: any;
  saleId?: number;
}

const STEP_KEYS: SaleStep[] = [
  'customer-selection',
  'sale-info',
  'trade-in',
  'summary',
];

const BASE_STEP_DEFS: StepDef[] = [
  { id: 1, title: 'Cliente', shortTitle: 'Cliente', icon: UserCheck },
  { id: 2, title: 'Venta', shortTitle: 'Venta', icon: DollarSign },
  // Los adicionales ahora también viven en el paso 2 (Venta), antes del
  // desglose de pagos — este paso queda enfocado en la permuta.
  { id: 3, title: 'Permuta', shortTitle: 'Permuta', icon: Car },
  { id: 4, title: 'Resumen', shortTitle: 'Resumen', icon: ClipboardCheck },
];

const withVehicleStep = (defs: StepDef[]): StepDef[] => [
  { id: 1, title: 'Vehículo', shortTitle: 'Vehículo', icon: Car },
  ...defs.map(s => ({ ...s, id: s.id + 1 })),
];

const VehicleSaleCreateEditDialog = ({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
  initialData,
  saleId,
}: VehicleSaleCreateEditDialogProps) => {
  const { t } = useTranslation('vehicleSales');
  const { clientId } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [showMinPriceWarning, setShowMinPriceWarning] = useState(false);
  const [belowMinReason, setBelowMinReason] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [isOnVehicleStep, setIsOnVehicleStep] = useState(false);
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);

  const showVehicleStep = !vehicle;
  const effectiveVehicle = vehicle ?? selectedVehicle;

  const stepDefs = showVehicleStep ? withVehicleStep(BASE_STEP_DEFS) : BASE_STEP_DEFS;

  const {
    currentStep,
    vehicle: storeVehicle,
    isEditMode,
    isSubmitting,
    vehicleSaleId,
    documentId,
    saleInfo,
    tradeInInfo,
    additionals,
    resetStore,
    setIsDialogOpen,
    setVehicle,
    setVehicleForEdit,
    setEditMode,
    setDocumentId,
    setVehicleSaleId,
    goToNextStep,
    goToPreviousStep,
    canProceedToNextStep,
    canNavigateToStep,
    setIsSubmitting,
    updateSaleInfo,
    updateTradeInInfo,
    setTradeInVehicles,
    setAdditionals,
    setCurrentStep,
    setCustomer,
    setReservationExtras,
  } = useVehicleSaleStore();

  // Map current step key to numeric index (1-based for StepIndicator)
  const stepOffset = showVehicleStep ? 1 : 0;
  const currentStepIndex = isOnVehicleStep ? 1 : STEP_KEYS.indexOf(currentStep) + 1 + stepOffset;
  const isFirstStep = isOnVehicleStep || (!showVehicleStep && currentStepIndex === 1);
  const isLastStep = currentStepIndex === stepDefs.length;

  // Initialize the store when dialog opens
  useEffect(() => {
    if (isOpen) {
      setIsDialogOpen(true);
      setDraftSavedAt(null);
      setRestoredFromDraft(false);

      if (showVehicleStep) {
        setIsOnVehicleStep(true);
        setSelectedVehicle(null);
      }

      if (initialData && saleId && effectiveVehicle) {
        setEditMode(true, saleId);
        setVehicleForEdit(effectiveVehicle);
        loadSaleDataToStore(saleId);
      } else if (effectiveVehicle) {
        setEditMode(false);
        setVehicle(effectiveVehicle);

        const draft = clientId
          ? loadSaleDraft(clientId, effectiveVehicle.id)
          : null;

        if (draft) {
          updateSaleInfo(draft.saleInfo);
          updateTradeInInfo({ hasTradeIn: draft.tradeInInfo?.hasTradeIn ?? false });
          setTradeInVehicles(draft.tradeInInfo?.vehicles ?? []);
          setAdditionals(draft.additionals ?? []);
          setReservationExtras(draft.reservationExtras ?? []);
          if (draft.saleInfo?.customer) {
            setCustomer(draft.saleInfo.customer);
          }
          // Restaurar furthest primero, luego current (setCurrentStep solo sube furthest)
          setCurrentStep(draft.furthestStepReached);
          setCurrentStep(draft.currentStep);
          setDraftSavedAt(draft.savedAt);
          setRestoredFromDraft(true);
        } else {
          loadReservationExtras(effectiveVehicle.id);
          loadReservationDataForCreation(effectiveVehicle.id);
        }
      }
    }
  }, [isOpen, vehicle, initialData, saleId]);

  const loadSaleDataToStore = async (documentId: number) => {
    try {
      const { data: saleData, error: saleError } = await supabase
        .from('vehicles_sales')
        .select('*, document:document_id(*)')
        .eq('document_id', documentId)
        .single();

      if (saleError) {
        console.error('Error fetching sale data:', saleError);
        return;
      }

      if (saleData.id) {
        setVehicleSaleId(saleData.id);
      }

      let parsedPayments: PaymentItem[] = [];
      if ((saleData as any)?.payment_breakdown) {
        try {
          const rawPayments = JSON.parse((saleData as any).payment_breakdown);
          parsedPayments = rawPayments.map((p: any, index: number) => ({
            id: `${index}-${Date.now()}`,
            title: p.title,
            amount: p.amount,
            dueDate: p.dueDate,
            paid: p.paid,
          }));
        } catch (e) {
          console.error('Error parsing payment breakdown:', e);
        }
      }

      let customerData = null;
      if (saleData.customer_id && clientId) {
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', saleData.customer_id)
          .eq('client_id', clientId)
          .single();

        if (!customerError && customer) {
          customerData = customer;
        }
      }

      updateSaleInfo({
        salePrice: saleData.sale_price || 0,
        paymentMethod: saleData.payment_method || 'cash',
        // Valor de transferencia: priorizamos el del vehículo (lo que muestra el
        // resumen financiero) y caemos al de la venta como respaldo.
        transferValue:
          Number((vehicle as any)?.transfer_value) ||
          Number((saleData as any)?.transfer_value) ||
          0,
        // Flag de cobro del CRT: solo es false si la venta lo tiene explícitamente
        // en false; ventas viejas (columna nueva, default true) quedan en cobrado.
        transferValueCharged:
          (saleData as any)?.transfer_value_charged !== false,
        financiera: (saleData as any)?.financiera || '',
        financingCommission: Number((saleData as any)?.financing_commission) || 0,
        notes: (saleData as any)?.document?.notes || '',
        payments: parsedPayments,
        commissionPercentage:
          saleData.commission_percentage != null
            ? Number(saleData.commission_percentage)
            : null,
        saleDate: saleData.sale_date
          ? new Date(saleData.sale_date).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      });

      if (saleData.document_id) {
        setDocumentId(saleData.document_id);
      }

      if (customerData) {
        setCustomer(customerData);
      }

      // Load trade-in vehicles: try junction table first, then legacy fallback
      if (saleData.has_trade_in) {
        const { data: junctionRows } = await supabase
          .from('vehicles_sales_trade_ins')
          .select('*')
          .eq('vehicle_sale_id', saleId);

        if (junctionRows && junctionRows.length > 0) {
          // New format: multiple trade-ins from junction table
          const vehicles = junctionRows.map((row: any) => ({
            id: `ti_edit_${row.id}`,
            license_plate: row.license_plate || '',
            brand: row.brand_name || '',
            brand_id: '', // brand_id not stored in junction, user can re-select if editing
            model: row.model_name || '',
            model_id: '',
            year: row.year || new Date().getFullYear(),
            trade_in_value: row.trade_in_value || 0,
          }));
          updateTradeInInfo({ hasTradeIn: true });
          setTradeInVehicles(vehicles);
        } else if (saleData.trade_in_vehicle_id) {
          // Legacy fallback: single trade-in from vehicles_sales columns
          const { data: tradeInData, error: tradeInError } = await supabase
            .from('vehicles')
            .select('*, brand:brand_id(name), model:model_id(name)')
            .eq('id', saleData.trade_in_vehicle_id)
            .single();

          if (!tradeInError && tradeInData) {
            updateTradeInInfo({ hasTradeIn: true });
            setTradeInVehicles([{
              id: `ti_legacy_${saleData.trade_in_vehicle_id}`,
              license_plate: tradeInData.license_plate || '',
              brand: tradeInData.brand?.name || '',
              brand_id: tradeInData.brand_id?.toString() || '',
              model: tradeInData.model?.name || '',
              model_id: tradeInData.model_id?.toString() || '',
              year: tradeInData.year || new Date().getFullYear(),
              trade_in_value: saleData.trade_in_value || 0,
            }]);
          }
        }
      }

      const { data: reservationExtrasData, error: reservationExtrasError } =
        await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .in('type', ['reservation_payment', 'reservation_additional'])
          .order('created_at', { ascending: true });

      if (!reservationExtrasError && reservationExtrasData) {
        setReservationExtras(reservationExtrasData as VehicleExtra[]);
      }

      const { data: saleAdditionalsData, error: saleAdditionalsError } =
        await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .eq('type', 'sale_additional')
          .order('created_at', { ascending: true });

      if (!saleAdditionalsError && saleAdditionalsData) {
        const formattedAdditionals = saleAdditionalsData.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.amount,
          description: item.description || '',
          kind:
            (item as any).assumed_by === 'dealership'
              ? ('expense' as const)
              : ('income' as const),
          // Guardamos el assumed_by ORIGINAL para no aplastarlo al guardar. El toggle
          // del wizard sólo sabe income/expense; si el usuario no lo cambia,
          // syncSaleAdditionals reescribe este valor tal cual (clave para 'consignor').
          assumedBy: (item as any).assumed_by ?? undefined,
          // Pass-through: se carga para que el toggle lo muestre y syncSaleAdditionals
          // lo reescriba tal cual → editar la venta NO lo resetea a false.
          isPassthrough: (item as any).is_passthrough ?? false,
        }));
        setAdditionals(formattedAdditionals);
      }
    } catch (error) {
      console.error('Error loading sale data:', error);
      toast({
        title: t('toasts.loadSaleError.title'),
        description: t('toasts.loadSaleError.description'),
        variant: 'destructive',
      });
    }
  };

  const loadReservationExtras = async (vehicleId: number) => {
    try {
      const { data: reservationExtrasData, error: reservationExtrasError } =
        await supabase
          .from('vehicles_extras')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .in('type', ['reservation_payment', 'reservation_additional'])
          .order('created_at', { ascending: true });

      if (!reservationExtrasError && reservationExtrasData) {
        setReservationExtras(reservationExtrasData as VehicleExtra[]);
      }
    } catch (error) {
      console.error('Error loading reservation extras:', error);
    }
  };

  const loadReservationDataForCreation = async (vehicleId: number) => {
    try {
      const { data: reservationData, error: reservationError } = await supabase
        .from('vehicles_reservations')
        .select('*, customer:customer_id(*)')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (reservationError) {
        console.error('Error fetching reservation data:', reservationError);
        return;
      }

      if (reservationData && reservationData.length > 0) {
        const reservation = reservationData[0];

        if (reservation.customer_id && reservation.customer) {
          setCustomer(reservation.customer);
          updateSaleInfo({
            customerId: reservation.customer_id,
          });
        }

        if (
          reservation.reservation_agreed_price &&
          reservation.reservation_agreed_price > 0
        ) {
          updateSaleInfo({
            salePrice: reservation.reservation_agreed_price,
          });
        }

        toast({
          title: t('toasts.reservationPrefill.title'),
          description: t('toasts.reservationPrefill.description'),
        });
      }
    } catch (error) {
      console.error('Error loading reservation data for creation:', error);
    }
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    resetStore();
    setSelectedVehicle(null);
    setIsOnVehicleStep(false);
    setDraftSavedAt(null);
    setRestoredFromDraft(false);
    setShowSaveDraftDialog(false);
    onClose();
  };

  // ¿Tiene el usuario datos llenados que valga la pena ofrecer guardar?
  // Solo aplica en modo creación, fuera del primer paso, con cliente elegido o datos cargados.
  const hasDraftableData = (): boolean => {
    if (isEditMode) return false;
    if (isOnVehicleStep) return false;
    if (currentStep === 'customer-selection') return false;
    return true;
  };

  const handleAttemptClose = () => {
    if (hasDraftableData()) {
      setShowSaveDraftDialog(true);
    } else {
      handleClose();
    }
  };

  const handleSaveDraftAndClose = () => {
    if (!clientId || !storeVehicle?.id) {
      handleClose();
      return;
    }
    saveSaleDraft(clientId, storeVehicle.id, {
      currentStep,
      furthestStepReached: useVehicleSaleStore.getState().furthestStepReached,
      saleInfo,
      tradeInInfo,
      additionals,
      reservationExtras: useVehicleSaleStore.getState().reservationExtras,
    });
    toast({
      title: 'Borrador guardado',
      description: 'Puedes continuar la venta más tarde desde este mismo vehículo.',
    });
    handleClose();
  };

  const handleDiscardAndClose = () => {
    if (clientId && storeVehicle?.id) {
      clearSaleDraft(clientId, storeVehicle.id);
    }
    handleClose();
  };

  const handleDiscardDraftBanner = () => {
    if (!clientId || !storeVehicle?.id) return;
    clearSaleDraft(clientId, storeVehicle.id);
    resetStore();
    setVehicle(storeVehicle);
    loadReservationExtras(storeVehicle.id);
    loadReservationDataForCreation(storeVehicle.id);
    setDraftSavedAt(null);
    setRestoredFromDraft(false);
    toast({
      title: 'Borrador descartado',
      description: 'Empezando desde cero.',
    });
  };

  const handleVehicleSelected = (v: any) => {
    setSelectedVehicle(v);
    setIsOnVehicleStep(false);
    // Initialize the store with the selected vehicle
    setEditMode(false);
    setVehicle(v);
    loadReservationExtras(v.id);
    loadReservationDataForCreation(v.id);
  };

  const handleSuccess = () => {
    if (clientId && storeVehicle?.id) {
      clearSaleDraft(clientId, storeVehicle.id);
    }
    // El auto quedó vendido: ofrecer cerrar sus avisos activos en MercadoLibre.
    if (storeVehicle?.id) {
      void useMeliCloseStore.getState().requestClose(storeVehicle.id);
    }
    // Refrescar dashboards / resumen del mes / valor de inventario tras la venta.
    invalidateSalesQueries(queryClient);
    handleClose();
    onSuccess();
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

  const handleNext = () => {
    if (canProceedToNextStep()) {
      goToNextStep();
    }
  };

  const handlePrevious = () => {
    if (showVehicleStep && currentStep === 'customer-selection') {
      setIsOnVehicleStep(true);
      return;
    }
    goToPreviousStep();
  };

  const handleSubmit = async () => {
    if (!canProceedToNextStep() || isSubmitting) return;

    const minPrice = storeVehicle?.min_price;
    if (minPrice && saleInfo.salePrice < minPrice) {
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
      distinctId: clientId?.toString(),
      event: 'vehicle_sale_below_min_price_override',
      properties: {
        vehicle_id: storeVehicle?.id,
        sale_price: saleInfo.salePrice,
        min_price: storeVehicle?.min_price,
        diff: (storeVehicle?.min_price || 0) - saleInfo.salePrice,
        reason,
      },
    });

    setShowMinPriceWarning(false);
    await executeSubmit();
  };

  const executeSubmit = async () => {
    if (!saleInfo.customerId && !saleInfo.skipCustomer) {
      toast({
        title: t('common:actions.error'),
        description: 'Debes seleccionar un cliente o marcar "Continuar sin cliente" antes de registrar la venta.',
        variant: 'destructive',
      });
      return;
    }

    if (!clientId) {
      toast({
        title: t('common:actions.error'),
        description: 'No se pudo identificar la automotora. Recarga la página e intenta nuevamente.',
        variant: 'destructive',
      });
      return;
    }

    // El valor de la parte de pago es el COSTO con el que el auto recibido entra al
    // inventario. Si queda en $0, el resumen muestra precio de compra 0 y el margen
    // sale inflado (bug reportado por Mallorca). Lo exigimos > 0 antes de guardar.
    if (tradeInInfo.hasTradeIn && tradeInInfo.vehicles.length > 0) {
      const sinValor = tradeInInfo.vehicles.some(
        (v) => !v.trade_in_value || Number(v.trade_in_value) <= 0
      );
      if (sinValor) {
        toast({
          title: t('common:actions.error'),
          description:
            'Cada vehículo en parte de pago necesita un valor mayor a $0 (es el costo con el que entra al inventario). Completa el "valor de la permuta".',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const saleData = {
        vehicleId: storeVehicle.id,
        customerId: saleInfo.customerId,
        salePrice: saleInfo.salePrice,
        paymentMethod: saleInfo.paymentMethod,
        financiera: saleInfo.paymentMethod === 'credit' ? saleInfo.financiera : undefined,
        financingCommission: saleInfo.paymentMethod === 'credit' ? saleInfo.financingCommission : 0,
        notes: saleInfo.notes,
        clientId: clientId,
        sellerId: saleInfo.sellerId,
        tradeInVehicles: tradeInInfo.hasTradeIn && tradeInInfo.vehicles.length > 0
          ? tradeInInfo.vehicles
          : undefined,
        payments: saleInfo.payments,
        additionals: additionals,
        document_id: documentId,
        // Valor de transferencia editable en el paso "Venta". Se persiste en el
        // vehículo (lo que lee el resumen financiero) y en la venta.
        transferValue: saleInfo.transferValue ?? 0,
        // ¿Se le cobra al cliente? Controla si suma al total y aparece en la nota.
        transferValueCharged: saleInfo.transferValueCharged,
        // Comisión del flujo = 0: la comisión real se asigna aparte con splits.
        commissionPercentage: 0,
        registeredByAdmin: hasPermission(PermissionCode.SALES_EDIT),
        saleDate: saleInfo.saleDate,
      };

      let result;
      if (isEditMode && vehicleSaleId) {
        result = await updateVehicleSale({ ...saleData, id: vehicleSaleId });
      } else {
        result = await registerVehicleSale(saleData);

        if (typeof result === 'object' && result.success) {
          result = true;
        }
      }

      if (result) {
        toast({
          title: t('common:actions.success'),
          description: isEditMode
            ? t('toasts.submit.success.edit')
            : t('toasts.submit.success.create'),
        });
        handleSuccess();
      }
    } catch (error) {
      console.error('Error submitting sale:', error);
      toast({
        title: t('common:actions.error'),
        description: isEditMode
          ? t('toasts.submit.error.edit')
          : t('toasts.submit.error.create'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (isOnVehicleStep) {
      return <VehicleSelectionStep onSelect={handleVehicleSelected} excludeWithDocumentType="sale" />;
    }
    switch (currentStep) {
      case 'customer-selection':
        return <CustomerSelectionStep />;
      case 'sale-info':
        return <SaleInfoStep />;
      case 'trade-in':
        return <TradeInStep />;
      case 'summary':
        return <SummaryStep />;
      default:
        return null;
    }
  };

  const dialogContent = (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 py-5 border-b border-slate-100 shrink-0 flex items-center justify-between gap-3">
        <h2 className="text-sm md:text-base font-semibold text-slate-900 leading-tight">
          {isEditMode ? t('header.titleEdit') : t('header.titleCreate')}
        </h2>
        <button
          type="button"
          onClick={handleAttemptClose}
          aria-label="Cerrar"
          className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Banner de borrador restaurado */}
      {restoredFromDraft && draftSavedAt && !isOnVehicleStep && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-[12px] text-amber-800 min-w-0">
            <FileClock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Borrador del {formatDraftDate(draftSavedAt)}
            </span>
          </div>
          <button
            type="button"
            onClick={handleDiscardDraftBanner}
            className="text-[12px] font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 shrink-0"
          >
            Descartar
          </button>
        </div>
      )}

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
              onClick={isFirstStep ? handleAttemptClose : handlePrevious}
              className="gap-2 rounded-xl"
            >
              {isFirstStep ? (
                t('common:buttons.cancel', 'Cancelar')
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
                  onClick={handleNext}
                  disabled={!canProceedToNextStep()}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canProceedToNextStep() || isSubmitting}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>
                        {isEditMode ? t('nav.saveChanges') : t('nav.registerSale')}
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
      <Drawer
        open={isOpen}
        onOpenChange={(o) => !o && handleClose()}
        direction="right"
        dismissible={false}
      >
        <DrawerContentRight className="md:min-w-[560px] md:max-w-[720px]">
          <div className="flex flex-col h-full">
            {dialogContent}
          </div>
        </DrawerContentRight>
      </Drawer>

      {/* Confirm dialog: guardar borrador al cerrar */}
      <AlertDialog open={showSaveDraftDialog} onOpenChange={setShowSaveDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Guardar el borrador?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes datos llenados en esta venta. Si guardas el borrador, puedes
              continuar más tarde desde el mismo paso. Si descartas, pierdes todo
              lo que llenaste.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <AlertDialogCancel className="mt-0">
              Seguir editando
            </AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscardAndClose}
              className="rounded-md"
            >
              Descartar cambios
            </Button>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleSaveDraftAndClose();
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Guardar borrador
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm dialog for price below minimum */}
      <AlertDialog open={showMinPriceWarning} onOpenChange={setShowMinPriceWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-red-600'>
              <AlertTriangle className='h-5 w-5' />
              Estás vendiendo bajo el precio mínimo
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-2'>
                <p>
                  Precio de venta: <strong>{formatCurrency(saleInfo.salePrice)}</strong> ·
                  Precio mínimo: <strong>{formatCurrency(storeVehicle?.min_price || 0)}</strong>
                </p>
                <p className='text-red-600 font-medium'>
                  Diferencia: {formatCurrency((storeVehicle?.min_price || 0) - saleInfo.salePrice)} bajo el mínimo.
                </p>
                <p className='text-slate-600'>
                  Para continuar tienes que dejar registrado por qué se está vendiendo
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
              Vender igual
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default VehicleSaleCreateEditDialog;
