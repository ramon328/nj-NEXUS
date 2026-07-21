import React from 'react';

interface TotalSectionProps {
  purchasePrice: number;
  additionals: number;
  grandTotal: number;
  formatCurrency: (value: number) => string;
}

const TotalSection: React.FC<TotalSectionProps> = ({
  purchasePrice,
  additionals,
  grandTotal,
  formatCurrency,
}) => {
  return (
    <div className='border border-gray-200 rounded-lg p-4 mb-6'>
      <h2 className='font-semibold text-lg mb-2'>TOTAL NOTA DE COMPRA</h2>

      <div className='space-y-2'>
        <div className='flex justify-between'>
          <p>Precio Vehículo:</p>
          <p>{formatCurrency(purchasePrice)}</p>
        </div>
        <div className='flex justify-between'>
          <p>Adicionales:</p>
          <p>{formatCurrency(additionals)}</p>
        </div>
        <hr className='my-2' />
        <div className='flex justify-between font-semibold'>
          <p>TOTAL:</p>
          <p>{formatCurrency(grandTotal)}</p>
        </div>
      </div>
    </div>
  );
};

export default TotalSection;
