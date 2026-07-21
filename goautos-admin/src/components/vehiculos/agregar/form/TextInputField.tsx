import React from 'react';
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

interface TextInputFieldProps {
  name: string;
  control: Control<any>;
  label: string;
  description?: string;
  placeholder?: string;
  uppercase?: boolean;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  className?: string;
}

const TextInputField = ({
  name,
  control,
  label,
  description,
  placeholder,
  uppercase = false,
  onChange,
  onBlur,
  onFocus,
  className,
}: TextInputFieldProps) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type='text'
              placeholder={placeholder}
              className={className}
              {...field}
              onChange={(e) => {
                const value = uppercase
                  ? e.target.value.toUpperCase()
                  : e.target.value;
                field.onChange(value);
                onChange && onChange(value);
              }}
              value={field.value}
              onBlur={() => {
                field.onBlur();
                onBlur && onBlur();
              }}
              onFocus={() => {
                onFocus && onFocus();
              }}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default TextInputField;
