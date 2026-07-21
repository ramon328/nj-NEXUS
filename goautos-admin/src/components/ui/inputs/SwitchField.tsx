import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Control } from 'react-hook-form';

interface SwitchFieldProps {
  name: string;
  control: Control<any>;
  label: string;
  description?: string;
}

const SwitchField: React.FC<SwitchFieldProps> = ({
  name,
  control,
  label,
  description,
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className='flex flex-row items-center justify-between rounded-lg bg-white border p-4'>
          <div className='space-y-0.5'>
            <FormLabel className='text-base'>{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch
              checked={field.value || false}
              onCheckedChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};

export default SwitchField;
