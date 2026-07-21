import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';
import { ExtendedVehicle } from './VehicleGrid';
import { VehicleCard } from './VehicleCard';
import { VehicleCard2 } from './VehicleCard2';
import { SimpleVehicle } from './VehicleCarousel';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface VehicleListProps {
  vehicles: ExtendedVehicle[];
  columns: 2 | 3 | 4;
  getStatusColor: (status: string) => string;
  sortOrder: 'price_asc' | 'price_desc' | 'date_asc' | 'date_desc';
  setSortOrder: React.Dispatch<
    React.SetStateAction<'price_asc' | 'price_desc' | 'date_asc' | 'date_desc'>
  >;
  cardSettings?: {
    cardBgColor: string;
    cardBorderColor: string;
    cardTextColor: string;
    cardPriceColor: string;
    cardButtonColor: string;
    cardButtonTextColor: string;
    detailsButtonText: string;
    bannerPosition: 'left' | 'right';
    pricePosition?: 'overlay' | 'below-title';
    featuresConfig?: {
      feature1?: string;
      feature2?: string;
      feature3?: string;
      feature4?: string;
    };
  }[];
  newBadgeText?: string;

  /** Indica qué componente está usando VehicleList */
  source?: 'grid' | 'grid2';
}

export const VehicleList: React.FC<VehicleListProps> = ({
  vehicles,
  columns,
  getStatusColor,
  sortOrder,
  setSortOrder,
  cardSettings,
  newBadgeText,
  source = 'grid',
}) => {
  // columnas por breakpoint (mejor responsive)
  const gridCols =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  const getSortButtonText = () => {
    switch (sortOrder) {
      case 'date_desc':
        return 'Recientes primero';
      case 'date_asc':
        return 'Antiguos primero';
      case 'price_asc':
        return 'Precio: Menor a mayor';
      case 'price_desc':
        return 'Precio: Mayor a menor';
      default:
        return 'Ordenar';
    }
  };

  return (
    <div className="w-full">
      {/* Ordenamiento */}
      <div className="flex justify-end mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-xs"
            >
              <span>{getSortButtonText()}</span>
              <ArrowUpDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setSortOrder('date_desc')}>
              Recientes primero
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSortOrder('date_asc')}>
              Antiguos primero
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSortOrder('price_asc')}>
              Precio: Menor a mayor
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSortOrder('price_desc')}>
              Precio: Mayor a menor
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            No hay vehículos que coincidan con los filtros seleccionados.
          </p>
        </div>
      ) : (
        // gaps adaptativos: más apretado en mobile, más aire en desktop
        <div className={`grid ${gridCols} gap-4 sm:gap-5 lg:gap-6`}>
          {vehicles.map((vehicle) => {
            const commonProps = {
              vehicle: vehicle as unknown as SimpleVehicle,
              compact: false,
              cardBgColor: cardSettings?.[0]?.cardBgColor,
              cardBorderColor: cardSettings?.[0]?.cardBorderColor,
              cardTextColor: cardSettings?.[0]?.cardTextColor,
              cardPriceColor: cardSettings?.[0]?.cardPriceColor,
              cardButtonColor: cardSettings?.[0]?.cardButtonColor,
              cardButtonTextColor: cardSettings?.[0]?.cardButtonTextColor,
              detailsButtonText: cardSettings?.[0]?.detailsButtonText,
              bannerPosition: cardSettings?.[0]?.bannerPosition,
              pricePosition: cardSettings?.[0]?.pricePosition,
              newBadgeText,
              feature1: cardSettings?.[0]?.featuresConfig?.feature1 || 'category',
              feature2: cardSettings?.[0]?.featuresConfig?.feature2 || 'year',
              feature3: cardSettings?.[0]?.featuresConfig?.feature3 || 'fuel',
              feature4: cardSettings?.[0]?.featuresConfig?.feature4 || 'mileage',
            };

            // Render dinámico por origen; key en el elemento raíz
            if (source === 'grid2') {
              return <VehicleCard2 key={vehicle.id} {...commonProps} />;
            }
            return <VehicleCard key={vehicle.id} {...commonProps} />;
          })}
        </div>
      )}
    </div>
  );
};
