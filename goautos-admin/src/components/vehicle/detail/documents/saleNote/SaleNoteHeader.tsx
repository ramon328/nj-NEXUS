
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface SaleNoteHeaderProps {
  saleNoteId: number;
  saleDate: string | null;
  clientName: string | null;
  clientLogo: string | null;
  formatDate: (date: string | null) => string;
}

const SaleNoteHeader = ({
  saleNoteId,
  saleDate,
  clientName,
  clientLogo,
  formatDate,
}: SaleNoteHeaderProps) => {
  return (
    <div className='flex justify-between items-start mb-8'>
      <div className='flex flex-col'>
        <div
          className='logo-container border border-gray-300 rounded-lg p-4 flex items-center justify-center mb-2'
          style={{ width: '200px', height: '80px' }}
        >
          {clientLogo ? (
            <img
              src={clientLogo}
              alt={clientName || 'MallorcAutos'}
              className='max-h-full max-w-full object-contain'
            />
          ) : (
            clientName || 'MallorcAutos'
          )}
        </div>
        <div className='text-sm'>
          <p className='font-semibold'>{clientName}</p>
        </div>
      </div>
      <div className='text-right'>
        <h1 className='text-2xl font-semibold mb-1'>
          NOTA DE VENTA N° {saleNoteId}
        </h1>
        <Badge
          variant='outline'
          className='bg-yellow-100 text-yellow-800 border-yellow-300'
        >
          PENDIENTE
        </Badge>
        <div className='mt-4 text-sm text-right'>
          <p>Fecha solicitud: {formatDate(saleDate)}</p>
          <p>Fecha creación: {formatDate(saleDate)}</p>
          <p>Fecha aprobación: PENDIENTE</p>
        </div>
      </div>
    </div>
  );
};

export default SaleNoteHeader;
