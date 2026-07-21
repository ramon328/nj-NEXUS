import React from 'react';

interface ObservationsSectionProps {
  notes: string | null;
}

const ObservationsSection = ({ notes }: ObservationsSectionProps) => {
  return (
    <div className='border border-gray-200 rounded-lg p-4 my-6'>
      <h2 className='font-semibold text-lg mb-2'>OBSERVACIONES</h2>
      <p>{notes || 'No se registran observaciones.'}</p>
    </div>
  );
};

export default ObservationsSection;
