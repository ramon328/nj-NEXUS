import React from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

const PurchaseNoteHeader: React.FC = () => {
  const { client } = useAuth();
  const today = format(new Date(), 'dd-MM-yyyy');
  const documentId = Math.floor(100 + Math.random() * 900); // For demo purposes

  return (
    <div className='flex justify-between items-start mb-6'>
      <div className='flex flex-col'>
        <div
          className='flex-shrink-0 border border-gray-300 rounded-md p-4 mb-2'
          style={{ width: '200px', height: '80px' }}
        >
          {client?.logo ? (
            <img
              src={client.logo}
              alt={`${client.name} Logo`}
              className='h-full w-full object-contain'
              crossOrigin="anonymous"
            />
          ) : (
            <h2 className='text-2xl font-semibold text-gray-700'>
              {client?.name || 'MallorcAutos'}
            </h2>
          )}
        </div>
        <div className='text-sm'>
          <p className='font-semibold'>{client?.name || 'MallorcAutos'}</p>
        </div>
      </div>

      <div className='text-right'>
        <h1 className='text-2xl font-semibold mb-1'>
          NOTA DE COMPRA N° {documentId}
        </h1>
        <div className='inline-block bg-yellow-100 px-3 py-1 text-yellow-800 font-semibold rounded mb-2'>
          PENDIENTE
        </div>
        <p className='text-gray-600'>Fecha: {today}</p>

        <div className='mt-4 text-left'>
          <p>
            <span className='font-semibold'>Giro:</span> Compra y venta de
            vehículos usados
          </p>
          <p>
            <span className='font-semibold'>Email:</span>{' '}
            {client?.contact?.email || 'info@mallorcautos.com'}
          </p>
          <p>
            <span className='font-semibold'>Domicilio:</span>{' '}
            {client?.contact?.address || 'Av. Principal 1234'}
          </p>
          {client?.contact?.rut && (
            <p>
              <span className='font-semibold'>RUT:</span> {client.contact.rut}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseNoteHeader;
