import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface ClientContact {
  address?: string;
  email?: string;
  phone?: string;
  rut?: string;
}

export interface QuotationHeaderProps {
  quotationId: number;
  quotationDate: string | Date;
  expirationDate: string;
  clientName: string;
  clientLogo: string;
  clientContact: ClientContact;
}

const QuotationHeader: React.FC<QuotationHeaderProps> = ({
  quotationId,
  quotationDate,
  expirationDate,
  clientName,
  clientLogo,
  clientContact,
}) => {
  const { client } = useAuth();

  return (
    <div className='flex justify-between items-start'>
      <div>
        <div
          className='logo-container border border-gray-300 rounded-lg p-4 flex items-center justify-center mb-2'
          style={{ width: '200px', height: '80px' }}
        >
          {clientLogo ? (
            <img
              src={clientLogo}
              alt={clientName}
              className='max-h-full max-w-full object-contain'
            />
          ) : (
            <div>{clientName}</div>
          )}
        </div>
        <h3 className='font-semibold text-gray-800'>{clientName}</h3>
      </div>
      <div>
        <h1 className='text-2xl font-semibold text-gray-900'>COTIZACIÓN</h1>
        <p className='text-sm text-gray-500'>
          Nº {quotationId} - Fecha:{' '}
          {typeof quotationDate === 'string'
            ? quotationDate
            : format(quotationDate, 'dd/MM/yyyy', { locale: es })}
        </p>
        <p className='text-sm text-gray-500'>Válida hasta: {expirationDate}</p>
      </div>
      <div className='text-right'>
        <p className='text-xs text-gray-500'>
          {clientContact.address || client?.contact?.address}
        </p>
        <p className='text-xs text-gray-500'>
          {clientContact.email || client?.contact?.email} •{' '}
          {clientContact.phone || client?.contact?.phone}
        </p>
        {(clientContact.rut || client?.contact?.rut) && (
          <p className='text-xs text-gray-500'>
            RUT: {clientContact.rut || client?.contact?.rut}
          </p>
        )}
      </div>
    </div>
  );
};

export default QuotationHeader;
