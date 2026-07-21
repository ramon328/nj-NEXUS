import React, { ReactNode } from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Control } from 'react-hook-form';
import {
  formatNumber,
  formatDisplayNumber,
} from '@/components/vehiculos/agregar/form/formatter';

interface NumberInputFieldProps {
  name: string;
  control: Control<any>;
  label: ReactNode;
  description?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  formatWithSeparator?: boolean;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  className?: string;
}

const NumberInputField = ({
  name,
  control,
  label,
  description,
  prefix,
  suffix,
  min = 0,
  max,
  formatWithSeparator = false,
  onChange,
  onBlur,
  onFocus,
  className,
}: NumberInputFieldProps) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <div className='relative'>
              {prefix && (
                <span className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground'>
                  {prefix}
                </span>
              )}
              <Input
                type='text'
                inputMode='numeric'
                className={`${prefix ? 'pl-7' : ''} ${className || ''}`}
                min={min}
                max={max}
                {...field}
                onChange={(e) => {
                  const value = formatWithSeparator
                    ? formatNumber(e.target.value)
                    : e.target.value;

                  // For percentage, enforce 0-100 range
                  if (suffix === '%') {
                    const numValue = parseInt(value, 10) || 0;
                    const constrainedValue = Math.min(
                      Math.max(numValue, 0),
                      100
                    ).toString();
                    field.onChange(constrainedValue);
                  } else {
                    field.onChange(value);
                  }

                  onChange && onChange(value);
                }}
                value={
                  formatWithSeparator
                    ? formatDisplayNumber(field.value)
                    : field.value
                }
                onBlur={() => {
                  field.onBlur();
                  onBlur && onBlur();
                }}
                onFocus={() => {
                  onFocus && onFocus();
                }}
              />
              {suffix && (
                <span className='absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground'>
                  {suffix}
                </span>
              )}
            </div>
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

export default NumberInputField;
