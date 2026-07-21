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

interface ReservationAdditionalFormProps {
  saving: boolean;
  selectedAdditional?: any;
  onSubmit: (data: {
    amount: number;
    title: string;
    description: string | null;
  }) => void;
}

const ReservationAdditionalForm: React.FC<ReservationAdditionalFormProps> = ({
  saving,
  selectedAdditional,
  onSubmit,
}) => {
  const { t } = useTranslation('vehicleReservations');
  const formSchema = useMemo(() => z.object({
    title: z.string().min(1, t('additionals.form.validation.titleRequired')),
    amount: z.coerce.number().min(1, t('additionals.form.validation.amountMin')),
    description: z.string().optional().nullable(),
  }), [t]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: selectedAdditional?.title || '',
      amount: selectedAdditional?.amount || 0,
      description: selectedAdditional?.description || null,
    },
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      amount: values.amount,
      title: values.title,
      description: values.description,
    });
  };

  const isEditing = !!selectedAdditional;

  return (
    <div className='p-2 rounded-lg border'>
      <p className='text-xs font-semibold text-slate-700 mb-1.5'>
        {isEditing ? t('additionals.form.editTitle') : t('additionals.form.createTitle')}
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className='space-y-2'
        >
          <FormField
            control={form.control}
            name='title'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs'>
                  {t('additionals.form.titleLabel')}
                  <span className='text-destructive'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t('additionals.form.titlePlaceholder')}
                    className='h-7 text-xs'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <NumberInputField
            control={form.control}
            name='amount'
            label={t('additionals.form.amountLabel')}
            formatWithSeparator={true}
            prefix='$'
          />

          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs'>{t('additionals.form.descriptionLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    placeholder={t('additionals.form.descriptionPlaceholder')}
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
              {isEditing ? t('additionals.form.updateButton') : t('additionals.form.createButton')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ReservationAdditionalForm;
