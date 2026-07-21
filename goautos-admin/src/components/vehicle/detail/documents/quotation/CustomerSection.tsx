import React from 'react';
import { Card } from '@/components/ui/card';

type CustomerSectionProps = {
  customer: any;
};

const CustomerSection: React.FC<CustomerSectionProps> = ({ customer }) => {
  if (!customer) {
    return (
      <Card className='p-6'>
        <h3 className='text-lg font-semibold uppercase mb-4'>
          DATOS DE CLIENTE
        </h3>
        <p className='text-gray-500 italic'>Cliente no asignado</p>
      </Card>
    );
  }

  return (
    <Card className='p-6'>
      <h3 className='text-lg font-semibold uppercase mb-4'>DATOS DE CLIENTE</h3>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <p>
            <span className='font-semibold'>Nombre:</span> {customer.first_name}{' '}
            {customer.last_name}
          </p>
          <p>
            <span className='font-semibold'>Teléfono:</span>{' '}
            {customer.phone || '-'}
          </p>
        </div>
        <div>
          <p>
            <span className='font-semibold'>RUT:</span> {customer.rut || '-'}
          </p>
          <p>
            <span className='font-semibold'>Email:</span>{' '}
            {customer.email || '-'}
          </p>
          <p>
            <span className='font-semibold'>Dirección:</span>{' '}
            {customer.address || '-'}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default CustomerSection;
