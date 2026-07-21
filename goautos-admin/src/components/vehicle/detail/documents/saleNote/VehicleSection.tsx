import React from 'react';

interface VehicleSectionProps {
  vehicle: any;
}

const VehicleSection = ({ vehicle }: VehicleSectionProps) => {
  return (
    <div className='border border-gray-200 rounded-lg p-4 mb-6'>
      <h2 className='font-semibold text-lg mb-2'>DATOS DEL VEHÍCULO</h2>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <p>
            <strong>Tipo:</strong> {vehicle?.category_id?.name || '-'}
          </p>
          <p>
            <strong>Año:</strong> {vehicle?.year || '-'}
          </p>
          <p>
            <strong>N. Chasis:</strong> {vehicle?.chassis_number || '-'}
          </p>
        </div>
        <div>
          <p>
            <strong>Marca:</strong> {vehicle?.brand_id?.name || '-'}
          </p>
          <p>
            <strong>Color:</strong> {vehicle?.color_id?.name || '-'}
          </p>
          <p>
            <strong>N. Motor:</strong> {vehicle?.engine_number || '-'}
          </p>
        </div>
        <div>
          <p>
            <strong>Modelo / Versión:</strong> {vehicle?.model_id?.name || '-'}
          </p>
          <p>
            <strong>Kilometraje:</strong>{' '}
            {vehicle?.mileage ? `${vehicle.mileage}` : '-'}
          </p>
        </div>
        <div>
          <p>
            <strong>Patente:</strong> {vehicle?.license_plate || '-'}
          </p>
          <p>
            <strong>Dueños anteriores:</strong> {vehicle?.owners || '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VehicleSection;
