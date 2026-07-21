import React from 'react';

interface AdditionalsSectionProps {
  extras: any[];
  formatCurrency: (value: number) => string;
}

const AdditionalsSection = ({
  extras,
  formatCurrency,
}: AdditionalsSectionProps) => {
  if (extras.length === 0) return null;

  return (
    <div className='border border-gray-200 rounded-lg p-4 mb-6'>
      <h2 className='font-semibold text-lg mb-2'>ADICIONALES</h2>
      {extras.map((extra, index) => (
        <div key={index} className='flex justify-between mb-1'>
          <p>
            {extra.title || (extra.type === 'income' ? 'Ingreso' : 'Gasto')}
          </p>
          <p className={extra.type === 'expense' ? 'text-red-600' : ''}>
            {extra.type === 'expense' ? '-' : ''}
            {formatCurrency(extra.amount)}
          </p>
        </div>
      ))}
    </div>
  );
};

export default AdditionalsSection;
