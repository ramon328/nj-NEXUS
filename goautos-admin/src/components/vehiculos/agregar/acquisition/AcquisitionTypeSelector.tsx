import React from 'react';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Control } from 'react-hook-form';
import { AcquisitionFormValues } from './AcquisitionFormSchema';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Handshake, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AcquisitionTypeSelectorProps {
  control: Control<AcquisitionFormValues>;
}

const AcquisitionTypeSelector: React.FC<AcquisitionTypeSelectorProps> = ({
  control,
}) => {
  const { t } = useTranslation('common');

  const options = [
    {
      value: 'purchase' as const,
      icon: ShoppingCart,
      label: t('addVehicle.acquisition.form.options.purchase', 'Compra'),
    },
    {
      value: 'consignment' as const,
      icon: Handshake,
      label: t('addVehicle.acquisition.form.options.consignment', 'Consignación'),
    },
    {
      value: 'online_consignment' as const,
      icon: Globe,
      label: t('addVehicle.acquisition.form.options.onlineConsignment', 'Cons. Online'),
    },
  ];

  return (
    <FormField
      control={control}
      name='acquisitionType'
      render={({ field }) => (
        <FormItem>
          <div className='grid grid-cols-3 gap-2'>
            {options.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                type='button'
                onClick={() => field.onChange(value)}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-150',
                  field.value === value
                    ? 'border-sky-500 bg-sky-500 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <Icon className='w-4 h-4' />
                {label}
              </button>
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default AcquisitionTypeSelector;
