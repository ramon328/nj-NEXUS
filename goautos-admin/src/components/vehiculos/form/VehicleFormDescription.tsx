import React from 'react';
import { Control } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

interface VehicleFormDescriptionProps {
  control: Control<any>;
}

const VehicleFormDescription: React.FC<VehicleFormDescriptionProps> = ({
  control,
}) => {
  return (
    <FormField
      control={control}
      name='description'
      render={({ field }) => (
        <FormItem>
          <FormLabel>Descripción</FormLabel>
          <FormControl>
            <Textarea rows={10} className='whitespace-pre-wrap' {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default VehicleFormDescription;
