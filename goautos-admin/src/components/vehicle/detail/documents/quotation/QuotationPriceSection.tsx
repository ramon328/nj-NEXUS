import React from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '../saleNote/utils';

type QuotationPriceSectionProps = {
  price: number | string | null;
};

const QuotationPriceSection: React.FC<QuotationPriceSectionProps> = ({
  price,
}) => {
  return (
    <Card className='my-6 p-6'>
      <h3 className='text-lg font-semibold uppercase mb-4'>PRECIO DE VENTA</h3>
      <div className='flex justify-end'>
        <p className='text-3xl font-semibold'>
          {formatCurrency(price ? Number(price) : 0)}
        </p>
      </div>
    </Card>
  );
};

export default QuotationPriceSection;
