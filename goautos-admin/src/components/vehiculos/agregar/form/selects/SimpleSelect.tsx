import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Control } from 'react-hook-form';

interface SimpleSelectProps {
  name: string;
  control: Control<any>;
  label: string;
  placeholder?: string;
  options: { id: string | number; name: string | null }[];
  disabled?: boolean;
  description?: string;
  onChange?: (value: string) => void;
  className?: string;
}

const SimpleSelect = ({
  name,
  control,
  label,
  placeholder = 'Seleccionar',
  options = [],
  disabled = false,
  description,
  onChange,
  className,
}: SimpleSelectProps) => {
  const safeOptions = Array.isArray(options)
    ? options.filter((opt) => opt && typeof opt === 'object' && opt.id != null)
    : [];

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <select
              className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                className || 'border-input focus-visible:ring-ring'
              }`}
              disabled={disabled}
              {...field}
              onChange={(e) => {
                field.onChange(e);
                onChange && onChange(e.target.value);
              }}
            >
              <option value=''>{placeholder}</option>
              {safeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name || ''}
                </option>
              ))}
            </select>
          </FormControl>
          {description && (
            <FormDescription className='text-xs'>{description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default SimpleSelect;
