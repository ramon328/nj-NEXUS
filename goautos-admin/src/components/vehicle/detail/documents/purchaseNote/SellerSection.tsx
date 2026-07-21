import React from 'react';

interface SellerSectionProps {
  customer: any;
}

const SellerSection: React.FC<SellerSectionProps> = ({ customer }) => {
  if (!customer) {
    return (
      <div className='border border-gray-200 rounded-lg p-4 mb-6'>
        <h2 className='font-semibold text-lg mb-2'>DATOS DEL VENDEDOR</h2>
        <p className='text-gray-500 italic'>No hay información del vendedor</p>
      </div>
    );
  }

  return (
    <div className='border border-gray-200 rounded-lg p-4 mb-6'>
      <h2 className='font-semibold text-lg mb-2'>DATOS DEL VENDEDOR</h2>

      <div className='grid md:grid-cols-2 gap-4'>
        <div>
          <p>
            <span className='font-semibold'>Nombre: </span>
            {customer.first_name} {customer.last_name}
          </p>
          <p>
            <span className='font-semibold'>Teléfono: </span>
            {customer.phone || '-'}
          </p>
        </div>
        <div>
          <p>
            <span className='font-semibold'>RUT: </span>
            {customer.rut || '-'}
          </p>
          <p>
            <span className='font-semibold'>Email: </span>
            {customer.email || '-'}
          </p>
          <p>
            <span className='font-semibold'>Dirección: </span>
            {customer.address || '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerSection;
