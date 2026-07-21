import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatRut } from '@/utils/rutFormatter';

export interface CustomerData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  rut?: string;
}

interface CustomerDetailsProps {
  customer: CustomerData;
  title?: string;
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({
  customer,
  title = '',
}) => {
  const { t } = useTranslation('vehicleDocuments');
  const getCustomerFullName = () => {
    return (
      `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || '-'
    );
  };

  return (
    <div className=' rounded-lg p-1 sm:p-2 mb-1 sm:mb-2 print:p-1 print:mb-1'>
      <h2 className='font-semibold text-xs print:text-xs mb-0.5 print:mb-0'>
        {title || t('customer.title')}
      </h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-0.5 sm:gap-2 print:gap-0.5 text-xs print:text-xs'>
        <div>
          <p>
            <strong>{t('customer.name')}</strong> {getCustomerFullName()}
          </p>
          <p>
            <strong>{t('customer.phone')}</strong> {customer?.phone || '-'}
          </p>
        </div>
        <div>
          <p>
            <strong>{t('customer.rut')}</strong>{' '}
            {formatRut(customer?.rut) || '-'}
          </p>
          <p>
            <strong>{t('customer.email')}</strong>{' '}
            <span className='break-all'>{customer?.email || '-'}</span>
          </p>
          <p>
            <strong>{t('customer.address')}</strong> {customer?.address || '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;
