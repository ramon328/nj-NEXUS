import React from 'react';
import { formatNumber } from '@/lib/utils';

interface VehicleSectionProps {
  vehicle: any;
}

const VehicleSection = ({ vehicle }: VehicleSectionProps) => {
  if (!vehicle) {
    return (
      <div className='border border-gray-200 rounded-lg p-4 my-6'>
        <h2 className='font-semibold text-lg mb-2'>DETALLES DEL VEHÍCULO</h2>
        <p>No hay información del vehículo disponible.</p>
      </div>
    );
  }

  const getVehicleType = () => {
    if (vehicle.category?.name) return vehicle.category.name.toLowerCase();
    return 'suv';
  };

  return (
    <div className='border border-gray-200 rounded-lg p-4 my-6'>
      <h2 className='font-semibold text-lg mb-2'>DETALLES DEL VEHÍCULO</h2>
      <div className='grid grid-cols-2 gap-4'>
        <div>
          <p>
            <strong>Tipo</strong> {getVehicleType()}
          </p>
          <p>
            <strong>Marca</strong> {vehicle.brand?.name || '-'}
          </p>
          <p>
            <strong>Modelo</strong> {vehicle.model?.name || '-'}
          </p>
          <p>
            <strong>Versión</strong> -
          </p>
          <p>
            <strong>Año</strong> {vehicle.year || '-'}
          </p>
        </div>
        <div>
          <p>
            <strong>Patente</strong> {vehicle.license_plate || '-'}
          </p>
          <p>
            <strong>Nº motor</strong> -
          </p>
          <p>
            <strong>Chasis</strong> -
          </p>
          <p>
            <strong>Color</strong> {vehicle.color?.name || '-'}
          </p>
          <p>
            <strong>Kilometraje</strong>{' '}
            {vehicle.mileage ? formatNumber(vehicle.mileage) : '-'}
          </p>
          <p>
            <strong>Dueños</strong> {vehicle.owners || 1}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VehicleSection;
