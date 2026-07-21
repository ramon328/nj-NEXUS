import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import NumberInputField from './NumberInputField';
import { formatDisplayNumber } from './formatter';
import { useVehicleForm } from './context/VehicleFormContext';
import { useTranslation } from 'react-i18next';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const PriceSection = () => {
  const { form, calculateFinalPrice, errorFields, clearFieldError } =
    useVehicleForm();
  const { t } = useTranslation('common');

  const hasError = (fieldName: string) => errorFields.includes(fieldName);
  const [finalPrice, setFinalPrice] = useState<string>('0');

  useEffect(() => {
    const subscription = form.watch(() => {
      const calculatedPrice = calculateFinalPrice();
      setFinalPrice(calculatedPrice !== null ? String(calculatedPrice) : '0');
    });

    const initialPrice = calculateFinalPrice();
    setFinalPrice(initialPrice !== null ? String(initialPrice) : '0');

    return () => subscription.unsubscribe();
  }, [form, calculateFinalPrice]);

  const priceValue = parseInt(
    String(form.watch('price') || '0').replace(/\./g, ''),
    10
  );
  const currentDiscount = parseFloat(
    String(form.watch('discount_percentage') || '0')
  );
  const discountedPrice =
    priceValue && currentDiscount
      ? Math.round(priceValue * (1 - currentDiscount / 100))
      : priceValue || 0;

  return (
    <Card>
      <CardContent className='pt-6'>
        <div className='space-y-4'>
          <NumberInputField
            control={form.control}
            name='price'
            label={t('addVehicle.price.displayPriceLabel')}
            prefix='$'
            formatWithSeparator={true}
            onChange={() => {
              const price = calculateFinalPrice();
              setFinalPrice(price !== null ? String(price) : '0');
              clearFieldError('price');
            }}
            className={
              hasError('price')
                ? 'border-red-500 focus-visible:ring-red-500'
                : ''
            }
          />

          <FormField
            control={form.control}
            name='discount_percentage'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descuento (%)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    min='0'
                    max='100'
                    value={field.value || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || (parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                        field.onChange(val);
                        const price = calculateFinalPrice();
                        setFinalPrice(price !== null ? String(price) : '0');
                      }
                    }}
                    placeholder='0'
                  />
                </FormControl>
                {discountedPrice > 0 && currentDiscount > 0 && (
                  <p className='text-xs text-muted-foreground'>
                    Precio con descuento: ${new Intl.NumberFormat('es-CL').format(discountedPrice)}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='bg-gray-50 p-4 rounded-md'>
            <div className='text-sm text-gray-500 mb-1'>
              {t('addVehicle.price.finalDisplayPrice')}
            </div>
            <div className='text-lg font-semibold'>
              $ {formatDisplayNumber(finalPrice)}
            </div>
          </div>
          <NumberInputField
            control={form.control}
            name='transfer_value'
            label={t('vehicles.detail.financial.transferValue')}
            prefix='$'
            formatWithSeparator={true}
            onChange={() => {
              clearFieldError('transfer_value');
            }}
            className={
              hasError('transfer_value')
                ? 'border-red-500 focus-visible:ring-red-500'
                : ''
            }
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceSection;
