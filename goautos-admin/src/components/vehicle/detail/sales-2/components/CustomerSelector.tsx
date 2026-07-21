import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Customer } from '@/types/customer';

interface CustomerSelectorProps {
  customers: Customer[];
  selectedCustomerId: number | null;
  setSelectedCustomerId: (id: number | null) => void;
  onNewCustomerClick: () => void;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  customers,
  selectedCustomerId,
  setSelectedCustomerId,
  onNewCustomerClick,
}) => {
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchText, setSearchText] = useState('');

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const filteredCustomers = customers.filter(
    (customer) =>
      searchText === '' ||
      `${customer.first_name || ''} ${customer.last_name || ''} ${
        customer.email || ''
      }`
        .toLowerCase()
        .includes(searchText.toLowerCase())
  );

  return (
    <div className='space-y-2'>
      <div className='flex justify-between'>
        <Label htmlFor='customer' className='text-base font-medium'>
          Comprador del Vehículo{' '}
          <span className='text-blue-500 ml-2 bg-blue-100 px-2 py-0.5 rounded text-xs'>
            Requerido
          </span>
        </Label>
        <Button
          type='button'
          variant='outline'
          onClick={onNewCustomerClick}
          className='h-8'
        >
          Nuevo cliente
        </Button>
      </div>
      <p className='text-sm text-muted-foreground mb-2'>
        Seleccione el cliente que está comprando el vehículo
      </p>

      <div className='relative w-full'>
        <div
          className='w-full flex items-center justify-between bg-white border rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-slate-50'
          onClick={() => setOpenCombobox(!openCombobox)}
        >
          {selectedCustomer
            ? `${selectedCustomer.first_name || ''} ${
                selectedCustomer.last_name || ''
              }`
            : 'Buscar cliente por nombre o email'}
          <ChevronsUpDown className='h-4 w-4 opacity-50' />
        </div>

        {openCombobox && (
          <div className='absolute z-50 mt-1 w-full bg-white rounded-md border shadow-md'>
            <div className='p-2'>
              <input
                type='text'
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder='Buscar cliente...'
                className='w-full px-3 py-2 text-sm border rounded-md'
                autoComplete='off'
              />
            </div>

            <div className='max-h-60 overflow-auto p-1'>
              {filteredCustomers.length === 0 ? (
                <div className='py-6 text-center text-sm text-gray-500'>
                  No se encontraron clientes.
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`flex items-center px-3 py-2 text-sm rounded-md cursor-pointer ${
                      selectedCustomerId === customer.id
                        ? 'bg-blue-100'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      setOpenCombobox(false);
                    }}
                  >
                    <div className='w-4 mr-2 flex-shrink-0'>
                      {selectedCustomerId === customer.id && (
                        <Check className='h-4 w-4' />
                      )}
                    </div>
                    <div>
                      <p className='font-medium'>
                        {customer.first_name || ''} {customer.last_name || ''}
                      </p>
                      {customer.email && (
                        <p className='text-xs text-gray-500'>
                          {customer.email}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerSelector;
