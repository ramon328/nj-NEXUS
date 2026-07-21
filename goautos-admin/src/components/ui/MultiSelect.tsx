import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  itemClassName?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder = 'Seleccionar...',
  className = '',
  triggerClassName = '',
  popoverClassName = '',
  itemClassName = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleOption = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onValueChange(value.filter((v) => v !== optionValue));
    } else {
      onValueChange([...value, optionValue]);
    }
  };

  const toggleAll = () => {
    if (value.length === options.length) {
      onValueChange([]);
    } else {
      onValueChange(options.map((opt) => opt.value));
    }
  };

  const allSelected = options.length > 0 && value.length === options.length;

  const selectedOptions = options.filter((option) =>
    value.includes(option.value)
  );

  const displayText = () => {
    if (selectedOptions.length === 0) return placeholder;
    if (allSelected) return 'Todos';
    if (selectedOptions.length <= 2)
      return selectedOptions.map((o) => o.label).join(', ');
    return `${selectedOptions.length} seleccionados`;
  };

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type='button'
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            triggerClassName,
            className
          )}
        >
          <span className={cn('line-clamp-1 text-left', selectedOptions.length === 0 && 'text-muted-foreground')}>
            {displayText()}
          </span>
          <ChevronDown className='h-4 w-4 opacity-50 ml-2 shrink-0' />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align='start'
          sideOffset={4}
          className={cn(
            'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
            popoverClassName
          )}
          style={{ width: 'var(--radix-popover-trigger-width)' }}
        >
          <div className='p-1 overflow-y-auto max-h-60'>
            {/* "Todos" option */}
            <div
              onClick={toggleAll}
              className={cn(
                'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors',
                itemClassName
              )}
            >
              <span className='absolute left-2 flex h-3.5 w-3.5 items-center justify-center'>
                {allSelected && <Check className='h-4 w-4' />}
              </span>
              <span className='font-medium'>Todos</span>
            </div>

            {/* Individual options */}
            {options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className={cn(
                    'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors',
                    itemClassName
                  )}
                >
                  <span className='absolute left-2 flex h-3.5 w-3.5 items-center justify-center'>
                    {isSelected && <Check className='h-4 w-4' />}
                  </span>
                  {option.label}
                </div>
              );
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
