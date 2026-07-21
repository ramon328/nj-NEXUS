import React from 'react';

interface CustomerSectionProps {
  customer: any;
}

const CustomerSection = ({ customer }: CustomerSectionProps) => {
  return (
    <div className='border border-gray-200 rounded-lg p-4 mb-6'>
      <h2 className='font-semibold text-lg mb-2'>DATOS DE CLIENTE</h2>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <p>
            <strong>Nombre:</strong>{' '}
            {customer
              ? `${customer.first_name || ''} ${customer.last_name || ''}`
              : '-'}
          </p>
          <p>
            <strong>Teléfono:</strong> {customer?.phone || '-'}
          </p>
        </div>
        <div>
          <p>
            <strong>RUT:</strong> {customer?.rut || '-'}
          </p>
          <p>
            <strong>Email:</strong> {customer?.email || '-'}
          </p>
          <p>
            <strong>Dirección:</strong> {customer?.address || '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerSection;
