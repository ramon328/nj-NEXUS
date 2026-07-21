
import React, { useState, useEffect } from 'react';
import { Control, useWatch } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/components/dashboard/formatters';
import { Vehicle } from '@/types/vehicle';

interface VehicleFormYearPriceProps {
  control: Control<any>;
  vehicle?: Vehicle;
}

const VehicleFormYearPrice: React.FC<VehicleFormYearPriceProps> = ({
  control,
  vehicle = {} as Vehicle,
}) => {
  const [finalPrice, setFinalPrice] = useState<string>('');

  // Watch price and discount changes to calculate final price
  const price = useWatch({
    control,
    name: 'price',
    defaultValue: '0',
  });

  const discountPercentage = useWatch({
    control,
    name: 'discount_percentage',
    defaultValue: '0',
  });

  // Calculate final price when price or discount changes
  useEffect(() => {
    try {
      const priceValue = parseInt(price || '0', 10);
      const discountValue = parseInt(discountPercentage || '0', 10);

      if (priceValue && !isNaN(priceValue)) {
        const discount = priceValue * (discountValue / 100);
        const calculatedFinalPrice = priceValue - discount;
        setFinalPrice(formatCurrency(calculatedFinalPrice));
      } else {
        setFinalPrice(formatCurrency(0));
      }
    } catch (error) {
      console.error('Error calculating final price:', error);
      setFinalPrice(formatCurrency(0));
    }
  }, [price, discountPercentage]);


  return (
    <Card>
      <CardContent className='pt-6'>
        <div className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <FormField
              control={control}
              name='year'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Año</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name='price'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Publicado</FormLabel>
                  <FormControl>
                    <Input
                      type='text'
                      {...field}
                      value={
                        field.value
                          ? new Intl.NumberFormat('es-CL').format(
                              parseInt(field.value)
                            )
                          : ''
                      }
                      onChange={(e) => {
                        // Remove all non-numeric characters
                        const rawValue = e.target.value.replace(/\D/g, '');
                        field.onChange(rawValue);
                      }}
                      placeholder='0'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name='discount_percentage'
              render={({ field }) => {
                const priceValue = parseInt(price || '0', 10);
                const currentDiscount = parseFloat(field.value || '0');
                const discountedPrice = priceValue && currentDiscount
                  ? Math.round(priceValue * (1 - currentDiscount / 100))
                  : priceValue || 0;
                return (
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
                );
              }}
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormField
              control={control}
              name='purchase_price'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {vehicle.is_consigned
                      ? 'Precio Acordado con el Cliente'
                      : 'Precio de Compra'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='text'
                      {...field}
                      value={
                        field.value
                          ? new Intl.NumberFormat('es-CL').format(
                              parseInt(field.value)
                            )
                          : ''
                      }
                      onChange={(e) => {
                        // Remove all non-numeric characters
                        const rawValue = e.target.value.replace(/\D/g, '');
                        field.onChange(rawValue);
                      }}
                      placeholder='0'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='bg-muted rounded-md p-3 mt-2'>
            <div className='flex justify-between items-center'>
              <span className='text-sm font-medium'>Precio Final:</span>
              <span className='text-lg font-semibold text-primary'>
                {finalPrice}
              </span>
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              Precio después de aplicar el descuento
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleFormYearPrice;
