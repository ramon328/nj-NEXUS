import React from 'react';
import { Control, UseFormReturn } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { useBrands } from '@/hooks/useBrands';
import { useModels } from '@/hooks/useModels';

interface VehicleFormBrandModelProps {
  control: Control<any>;
  selectedBrand: string;
  setSelectedBrand: (brand: string) => void;
  form: UseFormReturn<any>;
}

const VehicleFormBrandModel: React.FC<VehicleFormBrandModelProps> = ({
  control,
  selectedBrand,
  setSelectedBrand,
  form,
}) => {
  const { brands } = useBrands();
  const { models } = useModels(selectedBrand);

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      <FormField
        control={control}
        name='brand_id'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Marca</FormLabel>
            <FormControl>
              <select
                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  setSelectedBrand(e.target.value);
                  form.setValue('model_id', ''); // Reset model when brand changes
                }}
              >
                <option value=''>Seleccionar marca</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name='model_id'
        render={({ field }) => (
          <FormItem>
            <FormLabel>Modelo</FormLabel>
            <FormControl>
              <select
                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                disabled={!selectedBrand}
                {...field}
              >
                <option value=''>Seleccionar modelo</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default VehicleFormBrandModel;
