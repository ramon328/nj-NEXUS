
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FinancingPayment } from '@/types/financing';
import posthog from '@/utils/posthog';

const paymentSchema = z.object({
  amount: z.string().min(1, "El monto es requerido"),
  payment_date: z.string().min(1, "La fecha es requerida"),
  installment_number: z.string().min(1, "El número de cuota es requerido"),
  notes: z.string().optional(),
  interest_amount: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

type PaymentFormProps = {
  selectedPayment: number | null;
  onSuccess: () => void;
  onCancel: () => void;
};

const PaymentForm = ({ selectedPayment, onSuccess, onCancel }: PaymentFormProps) => {
  const { t } = useTranslation('common');
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      payment_date: new Date().toISOString().split('T')[0],
      installment_number: "",
      notes: "",
      interest_amount: "0",
    },
  });

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      if (!selectedPayment) {
        toast({
          title: t('actions.error'),
          description: t('financing.detail.paymentForm.toasts.noPaymentSelected'),
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.from('financing_payment').update({
        amount: Number(values.amount),
        payment_date: values.payment_date,
        installment_number: Number(values.installment_number),
        notes: values.notes,
        is_paid: true,
        payment_status: 'paid',
        interest_amount: Number(values.interest_amount) || 0,
      }).eq('id', selectedPayment);

      if (error) {
        throw error;
      }

      // Track payment recorded
      const authUserId = (await supabase.auth.getUser()).data.user?.id || 'anonymous';
      // Fetch the financing_id from the payment record for tracking
      const { data: paymentData } = await supabase
        .from('financing_payment')
        .select('financing_id')
        .eq('id', selectedPayment)
        .single();

      posthog.capture({
        distinctId: authUserId,
        event: 'financing_payment_recorded',
        properties: {
          financing_id: paymentData?.financing_id,
          amount: Number(values.amount),
        },
      });

      toast({
        title: t('actions.success'),
        description: t('financing.detail.paymentForm.toasts.saved'),
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: t('actions.error'),
        description: t('financing.detail.paymentForm.toasts.saveError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="installment_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('financing.detail.paymentForm.labels.installmentNumber')}</FormLabel>
              <FormControl>
                <Input type="number" placeholder={t('financing.detail.paymentForm.placeholders.installmentNumber')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('financing.detail.paymentForm.labels.amount')}</FormLabel>
              <FormControl>
                <Input type="number" placeholder={t('financing.detail.paymentForm.placeholders.amount')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="interest_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('financing.detail.paymentForm.labels.interest')}</FormLabel>
              <FormControl>
                <Input type="number" placeholder={t('financing.detail.paymentForm.placeholders.interest')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="payment_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('financing.detail.paymentForm.labels.paymentDate')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('financing.detail.paymentForm.labels.notes')}</FormLabel>
              <FormControl>
                <Input placeholder={t('financing.detail.paymentForm.placeholders.notes')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('buttons.cancel')}
          </Button>
          <Button type="submit">{t('buttons.save')}</Button>
        </div>
      </form>
    </Form>
  );
};

export default PaymentForm;
