import React, { useMemo, useState } from 'react';
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
import { format, addDays } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useCustomerSelection } from '@/hooks/useCustomerSelection';
import { Loader2, AlertTriangle } from 'lucide-react';
import NumberInputField from '@/components/vehiculos/agregar/form/NumberInputField';
import { useTranslation } from 'react-i18next';

interface ReservationFormProps {
  vehicle: any;
  saving: boolean;
  selectedCustomerId?: number | null;
  onSubmit: (data: {
    validityDays: number;
    notes: string | null;
    customerId: number | null;
    reservationAgreedPrice: number;
  }) => void;
}

const ReservationForm: React.FC<ReservationFormProps> = ({
  vehicle,
  saving,
  selectedCustomerId,
  onSubmit,
}) => {
  const { t, i18n } = useTranslation('vehicleReservations');
  const { customers } = useCustomerSelection();
  const [showMinPriceWarning, setShowMinPriceWarning] = useState(false);
  const [pendingValues, setPendingValues] = useState<any>(null);

  const formSchema = useMemo(() => z.object({
    validityDays: z.coerce
      .number()
      .min(1, t('form.validation.validityDaysMin')),
    notes: z.string().optional().nullable(),
    reservationAgreedPrice: z.coerce
      .number()
      .min(0, t('form.validation.agreedPriceMin')),
  }), [t]);
  type FormValues = z.infer<typeof formSchema>;

  const selectedCustomer = selectedCustomerId
    ? customers.find((c) => c.id === selectedCustomerId)
    : null;

  const today = new Date();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      validityDays: 3,
      notes: null,
      reservationAgreedPrice: 0,
    },
  });

  const validityDays = +form.watch('validityDays') || 0;
  const expirationDate = addDays(today, validityDays);

  const agreedPrice = form.watch('reservationAgreedPrice');
  const minPrice = vehicle?.min_price;
  const isBelowMinPrice = minPrice && agreedPrice > 0 && agreedPrice < minPrice;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = (values: FormValues) => {
    if (minPrice && values.reservationAgreedPrice < minPrice) {
      setPendingValues(values);
      setShowMinPriceWarning(true);
      return;
    }

    onSubmit({
      validityDays: values.validityDays,
      notes: values.notes,
      customerId: selectedCustomerId || null,
      reservationAgreedPrice: values.reservationAgreedPrice,
    });
  };

  const handleConfirmBelowMinPrice = () => {
    if (pendingValues) {
      onSubmit({
        validityDays: pendingValues.validityDays,
        notes: pendingValues.notes,
        customerId: selectedCustomerId || null,
        reservationAgreedPrice: pendingValues.reservationAgreedPrice,
      });
    }
    setShowMinPriceWarning(false);
    setPendingValues(null);
  };

  return (
    <div className='space-y-2'>
      {/* Summary info */}
      <div className='p-2 rounded-lg border bg-slate-50/60'>
        <div className='grid grid-cols-2 gap-x-3 gap-y-1 text-xs'>
          <div>
            <span className='text-slate-500'>{t('form.selectedCustomerLabel')}</span>
            <p className='font-medium'>
              {selectedCustomer
                ? selectedCustomer.full_name ||
                  `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                : t('form.noCustomerSelected')}
            </p>
          </div>
          <div>
            <span className='text-slate-500'>{t('form.vehicleLabel')}</span>
            <p className='font-medium'>
              {vehicle.brand_id?.name} {vehicle.model_id?.name} ({vehicle.year})
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-2'>
          <div className='space-y-1'>
            <NumberInputField
              control={form.control}
              name='reservationAgreedPrice'
              label={t('form.agreedPriceLabel')}
              formatWithSeparator={true}
              prefix='$'
            />
            {minPrice && (
              <div className={`flex items-center gap-1.5 text-[11px] ${isBelowMinPrice ? 'text-red-600' : 'text-amber-600'}`}>
                <AlertTriangle className={`h-3 w-3 shrink-0 ${isBelowMinPrice ? 'text-red-500' : 'text-amber-500'}`} />
                <span>
                  Mín: <strong>{formatCurrency(minPrice)}</strong>
                  {isBelowMinPrice && (
                    <span className='ml-1 text-red-600 font-medium'>— Bajo mínimo</span>
                  )}
                </span>
              </div>
            )}
          </div>

          <FormField
            control={form.control}
            name='validityDays'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs'>
                  {t('form.validityDaysLabel')}
                  <span className='text-destructive'>*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type='number'
                    min='1'
                    placeholder={t('form.validityDaysPlaceholder')}
                    className='h-7 text-xs'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='p-2 bg-slate-50 rounded border text-xs'>
            <span className='text-slate-500'>{t('form.expirationDateLabel')}</span>
            <p className='font-medium'>
              {format(expirationDate, 'dd-MM-yyyy', {
                locale: i18n.language?.startsWith('en') ? enUS : es,
              })}
            </p>
          </div>

          <FormField
            control={form.control}
            name='notes'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-xs'>{t('form.notesLabel')}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value || ''}
                    placeholder={t('form.notesPlaceholder')}
                    rows={2}
                    className='text-sm resize-none'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='flex justify-end pt-2'>
            <Button type='submit' size='sm' disabled={saving}>
              {saving && <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />}
              {t('form.createButton')}
            </Button>
          </div>
        </form>
      </Form>

      {/* Warning dialog for price below minimum */}
      <AlertDialog open={showMinPriceWarning} onOpenChange={setShowMinPriceWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2 text-amber-600'>
              <AlertTriangle className='h-5 w-5' />
              Precio por debajo del mínimo
            </AlertDialogTitle>
            <AlertDialogDescription className='space-y-2'>
              <p>
                El precio acordado de <strong>{pendingValues ? formatCurrency(pendingValues.reservationAgreedPrice) : ''}</strong> está
                por debajo del precio mínimo establecido de <strong>{formatCurrency(minPrice || 0)}</strong>.
              </p>
              <p className='text-amber-600 font-medium'>
                Diferencia: {pendingValues ? formatCurrency(minPrice - pendingValues.reservationAgreedPrice) : ''} menos del mínimo.
              </p>
              <p>¿Deseas continuar de todas formas?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingValues(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBelowMinPrice}
              className='bg-amber-600 hover:bg-amber-700'
            >
              Continuar de todas formas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ReservationForm;
