
import React from 'react';
import { Control } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { QuotationFormData } from './QuotationFormSchema';
import { useTranslation } from 'react-i18next';

interface PriceAndValidityProps {
  control: Control<QuotationFormData>;
}

const PriceAndValidity: React.FC<PriceAndValidityProps> = ({ control }) => {
  const { t } = useTranslation('vehicleQuotations');
  return (
    <>
      <FormField
        control={control}
        name="estimated_price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('priceValidity.estimatedPriceLabel')}</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                placeholder={t('priceValidity.estimatedPricePlaceholder')} 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={control}
        name="validity_period"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('priceValidity.validityLabel')}</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                placeholder={t('priceValidity.validityPlaceholder')} 
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default PriceAndValidity;
