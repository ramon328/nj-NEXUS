import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Car,
  Truck,
  Bike,
  CarFront,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Tipos de vehículos comunes con iconos de Lucide
export const commonVehicleTypes = [
  {
    id: 'all',
    label: 'Todos',
    icon: <RefreshCw size={16} className='text-current' />,
  },
  {
    id: 'suv',
    label: 'SUVs',
    icon: <Car size={16} className='text-current' />,
  },
  {
    id: 'sedan',
    label: 'Sedanes',
    icon: <Car size={16} className='text-current' />,
  },
  {
    id: 'hatchback',
    label: 'Hatchbacks',
    icon: <CarFront size={16} className='text-current' />,
  },
  {
    id: 'pickup',
    label: 'Pickups',
    icon: <Truck size={16} className='text-current' />,
  },
  {
    id: 'van',
    label: 'Vans',
    icon: <Truck size={16} className='text-current' />,
  },
  {
    id: 'coupe',
    label: 'Coupés',
    icon: <Car size={16} className='text-current' />,
  },
  {
    id: 'wagon',
    label: 'Wagons',
    icon: <CarFront size={16} className='text-current' />,
  },
];

// Esta función mapea los tipos comunes a los tipos reales en la base de datos
export const mapCommonTypeToActual = (
  commonType: string,
  availableTypes: string[]
): string[] => {
  const mappings: Record<string, string[]> = {
    suv: ['SUV', 'Crossover', 'Todoterreno', '4x4'],
    sedan: ['Sedán', 'Sedan', 'Berlina'],
    hatchback: ['Hatchback', 'Compacto'],
    pickup: ['Pickup', 'Camioneta'],
    van: ['Van', 'Minivan', 'Furgoneta'],
    coupe: ['Coupe', 'Coupé', 'Deportivo'],
    wagon: ['Wagon', 'Station Wagon', 'Familiar'],
  };

  if (commonType === 'all') {
    return [];
  }

  // Encuentra los tipos que coinciden en la base de datos
  const potentialTypes = mappings[commonType] || [];
  return availableTypes.filter((type) =>
    potentialTypes.some((pt) => type.toLowerCase().includes(pt.toLowerCase()))
  );
};

interface VehicleTypeFilterProps {
  activeVehicleType: string;
  setActiveVehicleType: (type: string) => void;
  availableTypes: string[];
  setSelectedTypes: React.Dispatch<React.SetStateAction<string[]>>;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonBorderColor?: string;
  activeButtonBgColor?: string;
  activeButtonTextColor?: string;
  activeButtonBorderColor?: string;
  containerBgColor?: string;
  containerBorderColor?: string;
}

export const VehicleTypeFilter: React.FC<VehicleTypeFilterProps> = ({
  activeVehicleType,
  setActiveVehicleType,
  availableTypes,
  setSelectedTypes,
  buttonBgColor = '#ffffff',
  buttonTextColor = '#3b82f6',
  buttonBorderColor = '#3b82f6',
  activeButtonBgColor = '#3b82f6',
  activeButtonTextColor = '#ffffff',
  activeButtonBorderColor = '#3b82f6',
  containerBgColor = '#ffffff',
  containerBorderColor = '#e5e7eb',
}) => {
  // Filter by vehicle type
  const handleVehicleTypeClick = (typeId: string) => {
    // Si ya estaba activo o se selecciona "Todos", quitamos todos los filtros de tipo
    if (typeId === 'all' || typeId === activeVehicleType) {
      setSelectedTypes([]);
      setActiveVehicleType('all');
      return;
    }

    // Encuentra los tipos correspondientes en la base de datos
    const matchingTypes = mapCommonTypeToActual(typeId, availableTypes);

    // Si existen, aplicamos el filtro
    if (matchingTypes.length > 0) {
      setSelectedTypes(matchingTypes);
      setActiveVehicleType(typeId);
    }
  };

  const renderScrollButtons = (scrollArea: HTMLDivElement) => {
    const hasOverflow = scrollArea?.scrollWidth > scrollArea?.clientWidth;

    if (!hasOverflow) return null;

    return (
      <>
        <button
          onClick={() =>
            scrollArea.scrollBy({ left: -200, behavior: 'smooth' })
          }
          className='absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-80 rounded-full p-1 shadow-md'
          aria-label='Scroll left'
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={() => scrollArea.scrollBy({ left: 200, behavior: 'smooth' })}
          className='absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-white bg-opacity-80 rounded-full p-1 shadow-md'
          aria-label='Scroll right'
        >
          <ChevronRight size={20} />
        </button>
      </>
    );
  };

  return (
    <div
      className='w-full mb-6 rounded-lg shadow-sm p-3 relative'
      style={{
        backgroundColor: containerBgColor,
        border: `1px solid ${containerBorderColor}`,
      }}
    >
      <ScrollArea className='w-full relative'>
        <div className='flex py-1 px-4 gap-2 items-center overflow-x-auto'>
          {commonVehicleTypes.map((type) => {
            const isActive = activeVehicleType === type.id;

            return (
              <button
                key={type.id}
                type='button'
                style={{
                  backgroundColor: isActive
                    ? activeButtonBgColor
                    : buttonBgColor,
                  color: isActive ? activeButtonTextColor : buttonTextColor,
                  border: `1px solid ${
                    isActive ? activeButtonBorderColor : buttonBorderColor
                  }`,
                }}
                className={`
                  flex items-center gap-2 px-4 py-2 min-w-max
                  transition-all duration-200 ease-in-out rounded-full
                  ${isActive ? 'shadow-md' : 'hover:opacity-80'}
                  cursor-pointer
                `}
                onClick={() => handleVehicleTypeClick(type.id)}
              >
                <span className='transition-colors'>{type.icon}</span>
                <span className='text-sm font-medium'>{type.label}</span>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation='horizontal' className='h-1.5' />
      </ScrollArea>
    </div>
  );
};
