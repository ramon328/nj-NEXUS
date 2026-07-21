import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ChevronsUpDown, Check, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCustomers } from '@/hooks/useCustomers';
import { useAuth } from '@/contexts/AuthContext';
import CustomerModal from '@/components/customer/CustomerModal';
import { getCustomerDisplayNameWithRut, getCustomerSearchText } from '@/utils/customerName';

type Customer = {
  id: number;
  customer_type?: 'person' | 'company';
  first_name: string;
  last_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  rut: string;
  address?: string;
  created_at: string;
};

interface CustomerSelectPickerProps {
  value?: number | null;
  onSelect: (customer: Customer | null) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

const CustomerSelectPicker: React.FC<CustomerSelectPickerProps> = ({
  value,
  onSelect,
  placeholder = 'Seleccione un cliente',
  label = 'Cliente',
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const { clientId } = useAuth();
  const { customers, isLoading, refetchCustomers } = useCustomers(clientId);

  // Format customer name for display (persona o empresa)
  const formatCustomerName = (customer: any) => getCustomerDisplayNameWithRut(customer);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm.trim()) return true;
    return getCustomerSearchText(customer).includes(searchTerm.toLowerCase());
  });

  // Get selected customer
  const selectedCustomer = customers.find((c) => c.id === value);

  const handleSelectCustomer = (customerId: number) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      onSelect(customer);
    }
    setSearchTerm('');
    setOpen(false);
  };

  const handleNewCustomer = () => {
    setShowCustomerModal(true);
  };

  const handleCustomerCreated = (customerId: number) => {
    refetchCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      onSelect(customer);
    }
    setShowCustomerModal(false);
  };

  return (
    <>
      <div className={cn('space-y-1', className)}>
        <Label className='text-xs'>{label}</Label>
        <div className='flex gap-1.5'>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                role='combobox'
                aria-expanded={open}
                className={cn(
                  'flex-1 justify-between font-normal h-7 text-xs',
                  !value && 'text-muted-foreground'
                )}
                disabled={isLoading}
              >
                <span className='truncate'>
                  {selectedCustomer
                    ? formatCustomerName(selectedCustomer)
                    : placeholder}
                </span>
                <ChevronsUpDown className='ml-2 h-3.5 w-3.5 shrink-0 opacity-50' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-[var(--radix-popover-trigger-width)] p-0' align='start'>
              <div className='flex flex-col'>
                <div className='p-2 border-b'>
                  <Input
                    placeholder='Buscar cliente...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className='h-7 text-xs'
                  />
                </div>

                <ScrollArea className='h-44'>
                  <div className='p-1'>
                    {isLoading ? (
                      <div className='px-2 py-6 text-center text-sm text-muted-foreground'>
                        Cargando clientes...
                      </div>
                    ) : filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className={cn(
                            'flex items-center rounded-md px-2 py-1 cursor-pointer hover:bg-accent transition-colors text-xs',
                            customer.id === value && 'bg-accent'
                          )}
                          onClick={() => handleSelectCustomer(customer.id)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4 flex-shrink-0',
                              customer.id === value
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <div className='flex-1 min-w-0'>
                            <div className='font-medium truncate'>
                              {customer.first_name} {customer.last_name}
                            </div>
                            <div className='text-[11px] text-muted-foreground truncate'>
                              {customer.email || 'Sin correo'}
                              {customer.rut && ` • ${customer.rut}`}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className='px-2 py-6 text-center text-sm text-muted-foreground'>
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleNewCustomer}
            className='shrink-0 h-7 w-7 p-0'
          >
            <Plus className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSuccess={handleCustomerCreated}
      />
    </>
  );
};

export default CustomerSelectPicker;
