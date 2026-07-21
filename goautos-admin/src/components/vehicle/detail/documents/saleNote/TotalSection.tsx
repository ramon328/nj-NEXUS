import React from 'react';

interface TotalSectionProps {
  totals: {
    vehiclePrice: number;
    totalAdditional: number;
    grandTotal: number;
  };
  formatCurrency: (value: number) => string;
}

const TotalSection = ({ totals, formatCurrency }: TotalSectionProps) => {
  return (
    <div className='border border-gray-200 rounded-lg p-4 mb-6'>
      <h2 className='font-semibold text-lg mb-2'>TOTAL NOTA DE VENTA</h2>
      <div className='space-y-2'>
        <div className='flex justify-between'>
          <p>
            <strong>Precio Vehículo:</strong>
          </p>
          <p>{formatCurrency(totals.vehiclePrice)}</p>
        </div>
        <div className='flex justify-between'>
          <p>
            <strong>Adicionales:</strong>
          </p>
          <p>{formatCurrency(totals.totalAdditional)}</p>
        </div>
        <hr className='my-2' />
        <div className='flex justify-between font-semibold'>
          <p>TOTAL:</p>
          <p>{formatCurrency(totals.grandTotal)}</p>
        </div>
      </div>
    </div>
  );
};

export default TotalSection;
