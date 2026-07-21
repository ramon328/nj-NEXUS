import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  showSymbol?: boolean;
  symbolPosition?: 'left' | 'right';
  symbol?: string;
  textAlign?: 'left' | 'right';
  renderInput?: (props: any) => React.ReactNode;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  id?: string;
  name?: string;
}

const PriceInput: React.FC<PriceInputProps> = ({
  value,
  onChange,
  placeholder = '0',
  className = '',
  showSymbol = true,
  symbolPosition = 'left',
  symbol = '$',
  textAlign = 'left',
  renderInput,
  ...props
}) => {
  const [formattedValue, setFormattedValue] = useState<string>(
    formatNumberWithSeparators(value)
  );

  // Actualizar el valor formateado cuando cambia el valor numérico desde fuera
  useEffect(() => {
    setFormattedValue(
      value === 0 && document.activeElement !== inputRef.current
        ? ''
        : formatNumberWithSeparators(value)
    );
  }, [value]);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Función para formatear números con separadores de miles
  function formatNumberWithSeparators(num: number): string {
    return new Intl.NumberFormat('es-CL', {
      maximumFractionDigits: 0,
    }).format(num);
  }

  // Función para extraer sólo los dígitos numéricos
  function extractNumber(str: string): number {
    const digitsOnly = str.replace(/\D/g, '');
    return digitsOnly ? parseInt(digitsOnly, 10) : 0;
  }

  // Función para manejar cambios en el input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericValue = extractNumber(e.target.value);
    const formatted = formatNumberWithSeparators(numericValue);

    setFormattedValue(e.target.value === '' ? '' : formatted);
    onChange(numericValue);
  };

  // Función para manejar el enfoque
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    props.onFocus?.(e);
    if (value === 0) {
      setFormattedValue('');
    }
  };

  // Función para manejar la pérdida de enfoque
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    props.onBlur?.(e);
    if (e.target.value === '') {
      setFormattedValue('0');
      onChange(0);
    } else {
      const numericValue = extractNumber(e.target.value);
      setFormattedValue(formatNumberWithSeparators(numericValue));
    }
  };

  // Estilo para alineación de texto
  const textAlignStyle = textAlign === 'right' ? 'text-right' : 'text-left';

  // Determinar el padding izquierdo o derecho según la posición del símbolo
  const symbolPaddingClass = showSymbol
    ? symbolPosition === 'left'
      ? 'pl-7'
      : 'pr-7'
    : '';

  // Renderizar el input de precio
  const renderPriceInput = () => {
    if (renderInput) {
      return renderInput({
        ref: inputRef,
        value: formattedValue,
        onChange: handleChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
        placeholder,
        className: `${symbolPaddingClass} ${textAlignStyle} ${className}`,
        ...props,
      });
    }

    return (
      <Input
        ref={inputRef}
        value={formattedValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${symbolPaddingClass} ${textAlignStyle} ${className}`}
        disabled={props.disabled}
        required={props.required}
        readOnly={props.readOnly}
        id={props.id}
        name={props.name}
      />
    );
  };

  return (
    <div className='relative'>
      {showSymbol && symbolPosition === 'left' && (
        <span className='absolute inset-y-0 left-3 flex items-center text-gray-500'>
          {symbol}
        </span>
      )}

      {renderPriceInput()}

      {showSymbol && symbolPosition === 'right' && (
        <span className='absolute inset-y-0 right-3 flex items-center text-gray-500'>
          {symbol}
        </span>
      )}
    </div>
  );
};

export default PriceInput;
