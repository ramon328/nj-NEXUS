import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import NumberInputField from '@/components/vehiculos/agregar/form/NumberInputField';
import { useTranslation } from 'react-i18next';


type FormValues = z.infer<typeof formSchema>;

interface ReservationPaymentFormProps {
  payment: any | null;
  onSubmit: (data: {
    amount: number;
    title: string;
    description: string | null;
  }) => void;
  saving: boolean;
}

const ReservationPaymentForm: React.FC<ReservationPaymentFormProps> = ({
  payment,
  onSubmit,
  saving,
}) => {
  const { t } = useTranslation('vehicleReservations');
  const formSchema = useMemo(() => z.object({
    amount: z.coerce.number().min(1, t('payments.form.validation.amountMin')),
    title: z.string().min(1, t('payments.form.validation.titleRequired')),
    description: z.string().optional().nullable(),
  }), [t]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: payment?.amount || 0,
      title: payment?.title || t('payments.form.defaultTitle'),
      description: payment?.description || null,
    },
  });

  return (
    <div className='p-2 rounded-lg border'>
      <p className='text-xs font-semibold text-slate-700 mb-1.5'>
        {payment ? t('payments.form.editTitle') : t('payments.form.createTitle')}
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-2'>
          <NumberInputField
            control={form.control}
            name='amount'
            label={t('payments.form.amountLabel')}
            formatWithSeparator={true}
            prefix='$'
          />

          <FormField
            control={form.control}
            name='title'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs'>
                  {t('payments.form.titleLabel')}
                  <span className='text-destructive'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('payments.form.titlePlaceholder')}
                    className='h-7 text-xs'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs'>{t('payments.form.descriptionLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    placeholder={t('payments.form.descriptionPlaceholder')}
                    rows={2}
                    className='text-sm resize-none'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='flex justify-end pt-1'>
            <Button type='submit' size='sm' disabled={saving}>
              {saving && <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />}
              {payment ? t('payments.form.updateButton') : t('payments.form.saveButton')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ReservationPaymentForm;
