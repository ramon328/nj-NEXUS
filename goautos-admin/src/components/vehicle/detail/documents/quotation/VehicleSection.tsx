import React from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '../saleNote/utils';

type VehicleSectionProps = {
  vehicle: any;
};

const VehicleSection: React.FC<VehicleSectionProps> = ({ vehicle }) => {
  if (!vehicle) {
    return (
      <Card className='p-6'>
        <h3 className='text-lg font-semibold uppercase mb-4'>
          DATOS DEL VEHÍCULO
        </h3>
        <p className='text-gray-500 italic'>Vehículo no encontrado</p>
      </Card>
    );
  }

  return (
    <Card className='p-6'>
      <h3 className='text-lg font-semibold uppercase mb-4'>
        DATOS DEL VEHÍCULO
      </h3>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <p>
            <span className='font-semibold'>Tipo:</span>{' '}
            {vehicle.category?.name || '-'}
          </p>
          <p>
            <span className='font-semibold'>Año:</span> {vehicle.year || '-'}
          </p>
          <p>
            <span className='font-semibold'>N. Chasis:</span> -
          </p>
          <p>
            <span className='font-semibold'>Valor:</span>{' '}
            {formatCurrency(vehicle.price)}
          </p>
        </div>
        <div>
          <p>
            <span className='font-semibold'>Marca:</span>{' '}
            {vehicle.brand?.name || '-'}
          </p>
          <p>
            <span className='font-semibold'>Color:</span>{' '}
            {vehicle.color?.name || '-'}
          </p>
          <p>
            <span className='font-semibold'>N. Motor:</span> -
          </p>
        </div>
        <div>
          <p>
            <span className='font-semibold'>Modelo:</span>{' '}
            {vehicle.model?.name || '-'}
          </p>
          <p>
            <span className='font-semibold'>Kilometraje:</span>{' '}
            {vehicle.mileage ? `${vehicle.mileage} km` : '-'}
          </p>
        </div>
        <div>
          <p>
            <span className='font-semibold'>Versión:</span> -
          </p>
          <p>
            <span className='font-semibold'>Patente:</span>{' '}
            {vehicle.license_plate || '-'}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default VehicleSection;
