import React from 'react';

interface ConsignmentHeaderProps {
  document: any;
}

const ConsignmentHeader = ({ document }: ConsignmentHeaderProps) => {
  return (
    <div className='text-center mb-6'>
      <h1 className='text-2xl font-semibold uppercase'>ACTA DE CONSIGNACIÓN</h1>
      <p className='text-gray-600'>N° {document?.id || '-'}</p>
      <p className='text-gray-600'>
        Fecha:{' '}
        {document?.created_at
          ? new Date(document.created_at).toLocaleDateString()
          : '-'}
      </p>
    </div>
  );
};

export default ConsignmentHeader;
