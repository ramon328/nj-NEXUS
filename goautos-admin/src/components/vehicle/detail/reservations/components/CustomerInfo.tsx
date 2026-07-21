import React from 'react';
import { useCustomerData } from '@/hooks/useCustomerData';

interface CustomerInfoProps {
  customerId: number | null;
  customer?: any;
}

const CustomerInfo: React.FC<CustomerInfoProps> = ({
  customerId,
  customer: initialCustomer,
}) => {
  // If we already have a customer object, use it, otherwise fetch it
  const { customer: fetchedCustomer, loading } = useCustomerData(
    initialCustomer ? null : customerId
  );

  const customer = initialCustomer || fetchedCustomer;

  if (loading) {
    return (
      <div>
        <p className='text-xs text-muted-foreground'>Cliente</p>
        <p className='font-medium text-xs'>Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <p className='text-xs text-muted-foreground'>Cliente</p>
      {customer ? (
        <>
          <p className='font-medium'>
            {customer.full_name ||
              `${customer.first_name || ''} ${
                customer.last_name || ''
              }`.trim() ||
              'No asignado'}
          </p>
          {customer.email && <p className='text-[11px] text-muted-foreground'>{customer.email}</p>}
        </>
      ) : (
        <p className='font-medium'>No asignado</p>
      )}
    </div>
  );
};

export default CustomerInfo;
