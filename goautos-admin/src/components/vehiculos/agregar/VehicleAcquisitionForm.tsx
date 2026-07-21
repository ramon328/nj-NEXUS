// src/components/vehiculos/agregar/VehicleAcquisitionForm.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { useCustomers } from '@/hooks/useCustomers';
import { useAuth } from '@/contexts/AuthContext';

import { VehicleAcquisition, VehicleDocumentType } from '@/types/vehicleCreation';

import AcquisitionTypeSelector from './acquisition/AcquisitionTypeSelector';
import PurchaseForm from './acquisition/PurchaseForm';
import ConsignmentForm from './acquisition/ConsignmentForm';
import {
  acquisitionFormSchema as baseAcquisitionFormSchema,
  type AcquisitionFormValues,
} from './acquisition/AcquisitionFormSchema';

import { useTranslation } from 'react-i18next';

// ====== Esquema de adquisición con validación condicional ======
// Reusa el schema compartido (AcquisitionFormSchema) para que el tipo de los
// campos sea idéntico al que esperan PurchaseForm/ConsignmentForm; le agrega la
// validación condicional por superRefine.
const acquisitionFormSchema = baseAcquisitionFormSchema.superRefine((data, ctx) => {
  // Validación condicional según tipo de adquisición (solo precios requeridos, vendedor opcional)
  if (data.acquisitionType === 'purchase') {
    const price = data.purchasePrice;
    const priceNum = typeof price === 'number' ? price : parseFloat(String(price || '0').replace(/\./g, ''));
    if (!price || priceNum <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El precio de compra es requerido',
        path: ['purchasePrice'],
      });
    }
    if (!data.purchaseCustomerId || data.purchaseCustomerId === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes indicar a quién le compraste el auto',
        path: ['purchaseCustomerId'],
      });
    }
  } else if (data.acquisitionType === 'consignment' || data.acquisitionType === 'online_consignment') {
    // Exigir elección explícita del método (no asumir garantizado).
    if (!data.consignmentMetodo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Elige el método de consignación',
        path: ['consignmentMetodo'],
      });
    }
    const metodo = data.consignmentMetodo ?? 'precio_garantizado';
    const price = data.consignmentAgreedPrice;
    const priceNum = typeof price === 'number' ? price : parseFloat(String(price || '0').replace(/\./g, ''));

    // Precio acordado: requerido si es precio garantizado, opcional si comisión
    if (metodo === 'precio_garantizado' && (!price || priceNum <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El precio acordado es requerido',
        path: ['consignmentAgreedPrice'],
      });
    }

    // Si es comisión, exigir al menos % o monto fijo > 0
    if (metodo === 'comision') {
      const pct = typeof data.consignmentComisionPercentage === 'number'
        ? data.consignmentComisionPercentage
        : parseFloat(String(data.consignmentComisionPercentage || '0').replace(/\./g, ''));
      const fixed = typeof data.consignmentComisionFixed === 'number'
        ? data.consignmentComisionFixed
        : parseFloat(String(data.consignmentComisionFixed || '0').replace(/\./g, ''));
      if ((!pct || pct <= 0) && (!fixed || fixed <= 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Indicá un porcentaje o un monto fijo de comisión',
          path: ['consignmentComisionPercentage'],
        });
      }
    }

    if (!data.consignmentCustomerId || data.consignmentCustomerId === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El consignatario es requerido',
        path: ['consignmentCustomerId'],
      });
    }
  }
});
interface VehicleAcquisitionFormProps {
  initialData: any;
  onSave: (data: VehicleAcquisition) => boolean | Promise<boolean>;
  onNext: () => void;
  onPrevious: () => void;
  isEditMode?: boolean;
}

const VehicleAcquisitionForm: React.FC<VehicleAcquisitionFormProps> = ({
  initialData,
  onSave,
  onNext,
  onPrevious,
  isEditMode = false,
}) => {
  const { t, i18n } = useTranslation('common');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const { clientId } = useAuth();
  const { customers, isLoading, refetchCustomers } = useCustomers(clientId);

  const form = useForm<AcquisitionFormValues>({
    resolver: zodResolver(acquisitionFormSchema),
    defaultValues: {
      acquisitionType: initialData?.acquisition?.acquisitionType || 'purchase',
      acquisitionDate: initialData?.acquisition?.acquisitionDate ?? '',
      purchaseCustomerId: initialData?.acquisition?.purchaseCustomerId ?? '',
      purchasePrice: initialData?.acquisition?.purchasePrice ?? '',
      purchaseIvaMode:
        initialData?.acquisition?.ivaExento === true
          ? 'exento'
          : initialData?.acquisition?.ivaExento === false
          ? 'afecto'
          : 'inherit',
      purchaseGeneraCreditoFiscal:
        initialData?.acquisition?.purchaseGeneraCreditoFiscal ?? false,
      consignmentCustomerId: initialData?.acquisition?.consignmentCustomerId ?? '',
      consignmentAgreedPrice: initialData?.acquisition?.consignmentAgreedPrice ?? '',
      consignmentSuggestedPrice: initialData?.acquisition?.consignmentSuggestedPrice ?? '',
      documentNotes: initialData?.acquisition?.documentNotes ?? '',
      purchaseBankName: initialData?.acquisition?.purchaseBankName ?? '',
      purchaseAccountType: initialData?.acquisition?.purchaseAccountType ?? '',
      purchaseAccountNumber: initialData?.acquisition?.purchaseAccountNumber ?? '',
      purchaseAccountHolderName: initialData?.acquisition?.purchaseAccountHolderName ?? '',
      purchaseAccountHolderRut: initialData?.acquisition?.purchaseAccountHolderRut ?? '',
      consignmentBankName: initialData?.acquisition?.consignmentBankName ?? '',
      consignmentAccountType: initialData?.acquisition?.consignmentAccountType ?? '',
      consignmentAccountNumber: initialData?.acquisition?.consignmentAccountNumber ?? '',
      consignmentAccountHolderName: initialData?.acquisition?.consignmentAccountHolderName ?? '',
      consignmentAccountHolderRut: initialData?.acquisition?.consignmentAccountHolderRut ?? '',
      consignmentSaleType: initialData?.acquisition?.consignmentSaleType ?? undefined,
      consignmentDealershipId: initialData?.acquisition?.consignmentDealershipId ?? undefined,
      consignmentFinanciera: initialData?.acquisition?.consignmentFinanciera ?? undefined,
      consignmentSellerId: initialData?.acquisition?.consignmentSellerId ?? undefined,
      consignmentMetodo: initialData?.acquisition?.consignmentMetodo ?? undefined,
      consignmentComisionPercentage: initialData?.acquisition?.consignmentComisionPercentage ?? undefined,
      consignmentComisionFixed: initialData?.acquisition?.consignmentComisionFixed ?? undefined,
    },
  });

  const acquisitionType = form.watch('acquisitionType');

  // Auto-save: keep vehicleData in sync on every field change
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Auto-save: sync form values to parent state on every change.
  // ONLY for create wizard flow — in edit mode, we save explicitly on submit.
  useEffect(() => {
    if (isEditMode) return;

    const subscription = form.watch((values) => {
      try {
        const v = values as AcquisitionFormValues;
        let acquisitionData: VehicleAcquisition;

        if (v.acquisitionType === 'purchase') {
          acquisitionData = {
            isConsigned: false,
            isOnlineConsignment: false,
            acquisitionDate: v.acquisitionDate || undefined,
            purchaseCustomerId: normalizeNumber(v.purchaseCustomerId),
            purchasePrice: normalizeNumber(v.purchasePrice),
            ivaExento:
              v.purchaseIvaMode === 'exento'
                ? true
                : v.purchaseIvaMode === 'afecto'
                ? false
                : null,
            purchaseGeneraCreditoFiscal: !!v.purchaseGeneraCreditoFiscal,
            documentType: 'purchase' as VehicleDocumentType,
            documentNotes: v.documentNotes || '',
            purchaseBankName: v.purchaseBankName || undefined,
            purchaseAccountType: v.purchaseAccountType || undefined,
            purchaseAccountNumber: v.purchaseAccountNumber || undefined,
            purchaseAccountHolderName: v.purchaseAccountHolderName || undefined,
            purchaseAccountHolderRut: v.purchaseAccountHolderRut || undefined,
          };
        } else {
          acquisitionData = {
            isConsigned: true,
            isOnlineConsignment: v.acquisitionType === 'online_consignment',
            acquisitionDate: v.acquisitionDate || undefined,
            consignmentCustomerId: normalizeNumber(v.consignmentCustomerId),
            consignmentAgreedPrice: normalizeNumber(v.consignmentAgreedPrice),
            consignmentSuggestedPrice: normalizeNumber(v.consignmentSuggestedPrice),
            documentType: 'consignment' as VehicleDocumentType,
            documentNotes: v.documentNotes || '',
            consignmentBankName: v.consignmentBankName || undefined,
            consignmentAccountType: v.consignmentAccountType || undefined,
            consignmentAccountNumber: v.consignmentAccountNumber || undefined,
            consignmentAccountHolderName: v.consignmentAccountHolderName || undefined,
            consignmentAccountHolderRut: v.consignmentAccountHolderRut || undefined,
            consignmentSaleType: v.consignmentSaleType || undefined,
            consignmentDealershipId: v.consignmentDealershipId ? normalizeNumber(v.consignmentDealershipId) : undefined,
            consignmentFinanciera: v.consignmentFinanciera || undefined,
            consignmentSellerId: v.consignmentSellerId ? normalizeNumber(v.consignmentSellerId) : undefined,
            consignmentMetodo: (v.consignmentMetodo ?? 'precio_garantizado') as any,
            consignmentComisionPercentage: normalizeNumber(v.consignmentComisionPercentage) ?? undefined,
            consignmentComisionFixed: normalizeNumber(v.consignmentComisionFixed) ?? undefined,
          };
        }

        onSaveRef.current(acquisitionData);
      } catch {
        // Silently ignore errors on partial data
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, isEditMode]);

  // Scroll to first error field
  const scrollToError = (errors: any) => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      const firstErrorKey = errorKeys[0];
      // Try to find the field by name attribute
      const element = formRef.current?.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => element.focus(), 300);
      }
    }
  };

  const handleSubmit = async (values: AcquisitionFormValues) => {
    setIsSubmitting(true);
    try {
      let acquisitionData: VehicleAcquisition;

      if (values.acquisitionType === 'purchase') {
        acquisitionData = {
          isConsigned: false,
          isOnlineConsignment: false,
          acquisitionDate: values.acquisitionDate || undefined,
          purchaseCustomerId: normalizeNumber(values.purchaseCustomerId),
          purchasePrice: normalizeNumber(values.purchasePrice),
          ivaExento:
            values.purchaseIvaMode === 'exento'
              ? true
              : values.purchaseIvaMode === 'afecto'
              ? false
              : null,
          purchaseGeneraCreditoFiscal: !!values.purchaseGeneraCreditoFiscal,
          documentType: 'purchase' as VehicleDocumentType,
          documentNotes: values.documentNotes || '',
          purchaseBankName: values.purchaseBankName || undefined,
          purchaseAccountType: values.purchaseAccountType || undefined,
          purchaseAccountNumber: values.purchaseAccountNumber || undefined,
          purchaseAccountHolderName: values.purchaseAccountHolderName || undefined,
          purchaseAccountHolderRut: values.purchaseAccountHolderRut || undefined,
        };
      } else {
        acquisitionData = {
          isConsigned: true,
          isOnlineConsignment: values.acquisitionType === 'online_consignment',
          acquisitionDate: values.acquisitionDate || undefined,
          consignmentCustomerId: normalizeNumber(values.consignmentCustomerId),
          consignmentAgreedPrice: normalizeNumber(values.consignmentAgreedPrice),
          consignmentSuggestedPrice: normalizeNumber(values.consignmentSuggestedPrice),
          documentType: 'consignment' as VehicleDocumentType,
          documentNotes: values.documentNotes || '',
          consignmentBankName: values.consignmentBankName || undefined,
          consignmentAccountType: values.consignmentAccountType || undefined,
          consignmentAccountNumber: values.consignmentAccountNumber || undefined,
          consignmentAccountHolderName: values.consignmentAccountHolderName || undefined,
          consignmentAccountHolderRut: values.consignmentAccountHolderRut || undefined,
          consignmentSaleType: values.consignmentSaleType || undefined,
          consignmentDealershipId: values.consignmentDealershipId ? normalizeNumber(values.consignmentDealershipId) : undefined,
          consignmentFinanciera: values.consignmentFinanciera || undefined,
          consignmentSellerId: values.consignmentSellerId ? normalizeNumber(values.consignmentSellerId) : undefined,
          consignmentMetodo: (values.consignmentMetodo ?? 'precio_garantizado') as any,
          consignmentComisionPercentage: normalizeNumber(values.consignmentComisionPercentage) ?? undefined,
          consignmentComisionFixed: normalizeNumber(values.consignmentComisionFixed) ?? undefined,
        };
      }

      const result = await onSave(acquisitionData);
      if (result && !isEditMode) onNext();
      if (result && isEditMode) {
        toast({
          title: 'Adquisición guardada',
          description: 'Los cambios se guardaron correctamente.',
        });
      }
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form errors - show toast and scroll to error
  const handleFormError = (errors: any) => {
    const errorMessages: string[] = [];
    if (errors.purchaseCustomerId) errorMessages.push('Vendedor del vehículo');
    if (errors.consignmentCustomerId) errorMessages.push('Consignatario');
    if (errors.purchasePrice) errorMessages.push('Precio de compra');
    if (errors.consignmentAgreedPrice) errorMessages.push('Precio acordado');

    if (errorMessages.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Campos requeridos',
        description: `Completa: ${errorMessages.join(', ')}`,
      });
    }
    scrollToError(errors);
  };

  const handleNewCustomerSuccess = async () => {
    await refetchCustomers();
  };

  // Helpers
  function normalizeNumber(v: string | number | undefined | null): number | null {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  const tt = (key: string, es: string, en: string) =>
    t(key, { defaultValue: i18n.language?.startsWith('es') ? es : en });

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={form.handleSubmit(handleSubmit, handleFormError)}
        className="space-y-4 max-w-2xl mx-auto"
      >
        {/* Tipo de adquisición */}
        <AcquisitionTypeSelector control={form.control} />

        {/* Form de compra o consignación */}
        {acquisitionType === 'purchase' ? (
          <PurchaseForm control={form.control} customers={customers} isLoading={isLoading} onNewCustomer={handleNewCustomerSuccess} form={form} onRefreshCustomers={refetchCustomers} />
        ) : (
          <ConsignmentForm control={form.control} customers={customers} isLoading={isLoading} onNewCustomer={handleNewCustomerSuccess} form={form} onRefreshCustomers={refetchCustomers} />
        )}
        {acquisitionType === 'online_consignment' && (
          <p className="text-xs text-violet-600 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
            Este vehículo fue ingresado a través del formulario web de consignación online.
          </p>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {isEditMode ? <div /> : (
            <Button type="button" variant="ghost" onClick={onPrevious} className="gap-2 text-slate-600 hover:text-slate-900 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
              {tt('buttons.previous', 'Anterior', 'Previous')}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting} className="gap-2 bg-sky-400 hover:bg-sky-500 text-white shadow-sm rounded-xl">
            {isEditMode
              ? tt('buttons.saveChanges', 'Guardar cambios', 'Save changes')
              : tt('buttons.continue', 'Continuar', 'Continue')}
            {!isEditMode && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default VehicleAcquisitionForm;
