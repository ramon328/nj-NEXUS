import React from 'react';
import { Control, UseFormReturn } from 'react-hook-form';
import SimpleSelect from './selects/SimpleSelect';
import AutocompleteSelect from './selects/AutocompleteSelect';

interface SelectFieldProps {
  name: string;
  control: Control<any>;
  label: string;
  placeholder?: string;
  options: { id: string | number; name: string | null }[];
  disabled?: boolean;
  description?: string;
  onChange?: (value: string) => void;
  useAutocomplete?: boolean;
  allowCreate?: boolean;
  brandId?: string | null;
  isModelSelect?: boolean;
  showCreateOption?: boolean;
  form?: UseFormReturn<any>;
  className?: string;
}

const SelectField = ({
  name,
  control,
  label,
  placeholder = 'Seleccionar',
  options = [],
  disabled = false,
  description,
  onChange,
  useAutocomplete = false,
  allowCreate = false,
  brandId = null,
  isModelSelect = false,
  showCreateOption = false,
  form,
  className,
}: SelectFieldProps) => {
  if (!useAutocomplete) {
    return (
      <SimpleSelect
        name={name}
        control={control}
        label={label}
        placeholder={placeholder}
        options={options}
        disabled={disabled}
        description={description}
        onChange={onChange}
        className={className}
      />
    );
  }

  return (
    <AutocompleteSelect
      name={name}
      control={control}
      label={label}
      placeholder={placeholder}
      options={options}
      disabled={disabled}
      description={description}
      onChange={onChange}
      allowCreate={allowCreate}
      brandId={brandId}
      isModelSelect={isModelSelect}
      showCreateOption={showCreateOption}
      form={form}
      className={className}
    />
  );
};

export default SelectField;
