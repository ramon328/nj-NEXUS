
import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';

interface VehicleFormConsignedProps {
  control: Control<any>;
}

const VehicleFormConsigned: React.FC<VehicleFormConsignedProps> = ({ control }) => {
  return (
    <FormField
      control={control}
      name="is_consigned"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <FormLabel className="text-base">Vehículo consignado</FormLabel>
            <FormDescription>
              Marque si el vehículo está consignado
            </FormDescription>
          </div>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export default VehicleFormConsigned;
