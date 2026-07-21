import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface PriceSectionProps {
  consignment: any;
}

const PriceSection = ({ consignment }: PriceSectionProps) => {
  return (
    <div className='border border-gray-200 rounded-lg p-4 my-6'>
      <h2 className='font-semibold text-lg mb-2'>PRECIO DE VENTA ACORDADO</h2>
      <p className='text-3xl font-semibold text-center my-4'>
        {formatCurrency(consignment?.agreed_price || 0)}
      </p>
    </div>
  );
};

export default PriceSection;
