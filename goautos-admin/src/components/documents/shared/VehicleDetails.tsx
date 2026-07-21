import React from 'react';
import { useTranslation } from 'react-i18next';

export interface VehicleData {
  brand?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  color?: string;
  mileage?: number;
  version?: string;
  condition?: string;
  owner_number?: string;
  engine_number?: string;
  chassis_number?: string;
  transfer_value?: number;
  is_consigned?: boolean;
  price?: number;
}

interface VehicleDetailsProps {
  vehicle: VehicleData;
  title?: string;
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({
  vehicle,
  title = '',
}) => {
  const { t } = useTranslation('vehicleDocuments');
  return (
    <div className=' rounded-lg p-1 sm:p-2 mb-1 sm:mb-2 print:p-1 print:mb-1'>
      <h2 className='font-semibold text-xs print:text-xs mb-0.5 print:mb-0'>
        {title || t('vehicle.title')}
      </h2>
      <div className='grid grid-cols-2 gap-1 sm:gap-2 print:gap-0.5 text-xs print:text-xs'>
        <p>
          <strong>{t('vehicle.brand')}</strong> {vehicle?.brand || '-'}
        </p>
        <p>
          <strong>{t('vehicle.model')}</strong> {vehicle?.model || '-'}
        </p>
        <p>
          <strong>{t('vehicle.year')}</strong> {vehicle?.year || '-'}
        </p>
        {vehicle?.version && (
          <p>
            <strong>{t('vehicle.version')}</strong> {vehicle.version}
          </p>
        )}
        <p>
          <strong>{t('vehicle.color')}</strong> {vehicle?.color || '-'}
        </p>
        <p>
          <strong>{t('vehicle.license')}</strong>{' '}
          {vehicle?.license_plate || '-'}
        </p>
        <p>
          <strong>{t('vehicle.mileage')}</strong>{' '}
          {vehicle?.mileage ? vehicle.mileage.toLocaleString() : '-'}
        </p>
        <p>
          <strong>{t('vehicle.engine')}</strong> {vehicle?.engine_number || '-'}
        </p>
        <p>
          <strong>{t('vehicle.chassis')}</strong>{' '}
          {vehicle?.chassis_number || '-'}
        </p>
      </div>
    </div>
  );
};

export default VehicleDetails;
