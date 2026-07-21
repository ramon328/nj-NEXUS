import React from 'react';

interface CustomerSectionProps {
  customer: any;
}

const CustomerSection = ({ customer }: CustomerSectionProps) => {
  if (!customer) {
    return (
      <div className='border border-gray-200 rounded-lg p-4 my-6'>
        <h2 className='font-semibold text-lg mb-2'>DETALLES DEL CLIENTE</h2>
        <p>No hay información del cliente disponible.</p>
      </div>
    );
  }

  const fullName = `${customer.first_name || ''} ${
    customer.last_name || ''
  }`.trim();
  const phoneFormatted = customer.phone ? `+${customer.phone}` : '-';

  return (
    <div className='border border-gray-200 rounded-lg p-4 my-6'>
      <h2 className='font-semibold text-lg mb-2'>DETALLES DEL CLIENTE</h2>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <p>
            <strong>Nombre</strong> {fullName || '-'}
          </p>
          <p>
            <strong>RUT</strong> {customer.rut || '-'}
          </p>
          <p>
            <strong>Dirección</strong> {customer.address || '-'}
          </p>
        </div>
        <div>
          <p>
            <strong>Teléfono</strong> {phoneFormatted}
          </p>
          <p>
            <strong>Email</strong> {customer.email || '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerSection;
