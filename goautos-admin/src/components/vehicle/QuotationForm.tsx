import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';

// Import refactored components
import CustomerSelection from './quotation/CustomerSelection';
import PriceAndValidity from './quotation/PriceAndValidity';
import NotesField from './quotation/NotesField';
import { useQuotationSubmit } from './quotation/useQuotationSubmit';
import { QuotationFormData } from './quotation/QuotationFormSchema';
import { useTranslation } from 'react-i18next';

type QuotationFormProps = {
  vehicleId: number;
  onSuccess?: () => void;
  formRef?: React.RefObject<HTMLFormElement>;
  hideSubmitButton?: boolean;
};

const QuotationForm = ({ vehicleId, onSuccess, formRef, hideSubmitButton }: QuotationFormProps) => {
  const { clientId } = useAuth();
  const { t } = useTranslation('vehicleQuotations');

  const quotationSchema = useMemo(() => z.object({
    customer_id: z.string().optional(),
    estimated_price: z
      .string()
      .min(1, { message: t('form.validation.priceRequired') }),
    validity_period: z
      .string()
      .min(1, { message: t('form.validation.validityRequired') }),
    notes: z.string().optional(),
  }), [t]);

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      customer_id: '',
      estimated_price: '',
      validity_period: '30', // Default validity period of 30 days
      notes: '',
    },
  });

  const { submitQuotation, isSubmitting } = useQuotationSubmit({
    vehicleId,
    onSuccess: () => {
      form.reset();
      if (onSuccess) {
        onSuccess();
      }
    },
  });

  const onSubmit = async (values: QuotationFormData) => {
    await submitQuotation(values);
  };

  return (
    <Form {...form}>
      <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <CustomerSelection control={form.control} clientId={clientId} />
        <PriceAndValidity control={form.control} />
        <NotesField control={form.control} />

        {!hideSubmitButton && (
          <Button type='submit' className='w-full' disabled={isSubmitting}>
            {isSubmitting ? t('form.generating') : t('form.generateButton')}
          </Button>
        )}
      </form>
    </Form>
  );
};

export default QuotationForm;
