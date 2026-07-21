import React from 'react';

interface VehicleSectionProps {
  vehicle: any;
}

const VehicleSection: React.FC<VehicleSectionProps> = ({ vehicle }) => {
  if (!vehicle) {
    return (
      <div className='border border-gray-200 rounded-lg p-4 mb-6'>
        <h2 className='font-semibold text-lg mb-2'>DATOS DEL VEHÍCULO</h2>
        <p className='text-gray-500 italic'>No hay información del vehículo</p>
      </div>
    );
  }

  return (
    <div className='border border-gray-200 rounded-lg p-4 mb-6'>
      <h2 className='font-semibold text-lg mb-2'>DATOS DEL VEHÍCULO</h2>

      <div className='grid md:grid-cols-2 gap-4'>
        <div>
          <p>
            <span className='font-semibold'>Tipo: </span>
            {vehicle.category_id?.name || '-'}
          </p>
          <p>
            <span className='font-semibold'>Año: </span>
            {vehicle.year || '-'}
          </p>
          <p>
            <span className='font-semibold'>N. Chasis: </span>-
          </p>
        </div>
        <div>
          <p>
            <span className='font-semibold'>Marca: </span>
            {vehicle.brand_id?.name || '-'}
          </p>
          <p>
            <span className='font-semibold'>Color: </span>
            {vehicle.color_id?.name || '-'}
          </p>
          <p>
            <span className='font-semibold'>N. Motor: </span>-
          </p>
        </div>
        <div>
          <p>
            <span className='font-semibold'>Modelo / Versión: </span>
            {vehicle.model_id?.name || '-'}
          </p>
          <p>
            <span className='font-semibold'>Kilometraje: </span>
            {vehicle.mileage ? `${vehicle.mileage}` : '-'}
          </p>
        </div>
        <div>
          <p>
            <span className='font-semibold'>Patente: </span>
            {vehicle.license_plate || '-'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VehicleSection;
