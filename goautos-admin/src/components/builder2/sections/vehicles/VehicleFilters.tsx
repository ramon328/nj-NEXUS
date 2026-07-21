import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Banknote,
  Car,
  CarFront,
  Fuel,
  RotateCcw,
  Star,
  Palette,
  X,
  Filter,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

// Filter interfaces
export interface PriceRange {
  min: number;
  max: number;
}

export interface VehicleFiltersProps {
  priceRange: PriceRange;
  setPriceRange: React.Dispatch<React.SetStateAction<PriceRange>>;
  minMaxPrice: { min: number; max: number };
  selectedBrands: string[];
  setSelectedBrands: React.Dispatch<React.SetStateAction<string[]>>;
  availableBrands: string[];
  selectedTypes: string[];
  setSelectedTypes: React.Dispatch<React.SetStateAction<string[]>>;
  availableTypes: string[];
  selectedFuels: string[];
  setSelectedFuels: React.Dispatch<React.SetStateAction<string[]>>;
  availableFuels: string[];
  selectedConditions: string[];
  setSelectedConditions: React.Dispatch<React.SetStateAction<string[]>>;
  availableConditions: string[];
  selectedColors: string[];
  setSelectedColors: React.Dispatch<React.SetStateAction<string[]>>;
  availableColors: string[];
  toggleFilter: (
    filter: string,
    type: 'brand' | 'type' | 'fuel' | 'condition' | 'color'
  ) => void;
  activeVehicleType: string;
  resetAllFilters: () => void;
}

export const VehicleFilters: React.FC<VehicleFiltersProps> = ({
  priceRange,
  setPriceRange,
  minMaxPrice,
  selectedBrands,
  setSelectedBrands,
  availableBrands,
  selectedTypes,
  setSelectedTypes,
  availableTypes,
  selectedFuels,
  setSelectedFuels,
  availableFuels,
  selectedConditions,
  setSelectedConditions,
  availableConditions,
  selectedColors,
  setSelectedColors,
  availableColors,
  toggleFilter,
  activeVehicleType,
  resetAllFilters,
}) => {
  const [priceRangeOpen, setPriceRangeOpen] = useState(true);
  const [brandOpen, setBrandOpen] = useState(true);
  const [typeOpen, setTypeOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  // Check if any filters are active
  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedTypes.length > 0 ||
    selectedFuels.length > 0 ||
    selectedConditions.length > 0 ||
    selectedColors.length > 0 ||
    priceRange.min !== minMaxPrice.min ||
    priceRange.max !== minMaxPrice.max;

  // Generic filter section component
  const FilterSection = ({
    title,
    icon,
    isOpen,
    toggleOpen,
    selectedItems,
    availableItems,
    type,
  }: {
    title: string;
    icon: React.ReactNode;
    isOpen: boolean;
    toggleOpen: () => void;
    selectedItems: string[];
    availableItems: string[];
    type: 'brand' | 'type' | 'fuel' | 'condition' | 'color';
  }) => (
    <div className='mb-4 border-b border-gray-100 pb-4'>
      <button
        className='flex w-full items-center justify-between cursor-pointer transition-colors hover:bg-gray-50 p-2 rounded-md'
        onClick={() => toggleOpen()}
        type='button'
      >
        <div className='flex items-center gap-2'>
          {icon}
          <span className='font-medium text-gray-800'>{title}</span>
          {selectedItems.length > 0 && (
            <Badge
              variant='secondary'
              className='ml-1 bg-blue-50 text-blue-700 text-xs'
            >
              {selectedItems.length}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronDown size={18} className='text-gray-600' />
        ) : (
          <ChevronRight size={18} className='text-gray-600' />
        )}
      </button>

      {isOpen && (
        <div className='mt-3 pl-6 space-y-2 max-h-[200px] overflow-y-auto pr-2'>
          {availableItems.map((item) => (
            <div
              key={item}
              className='flex items-center gap-2 hover:bg-gray-50 p-1 rounded-md'
            >
              <Checkbox
                id={`${type}-${item}`}
                checked={selectedItems.includes(item)}
                onCheckedChange={() => toggleFilter(item, type)}
                className='rounded border-gray-300'
              />
              <label
                htmlFor={`${type}-${item}`}
                className='text-sm text-gray-700 cursor-pointer w-full'
              >
                {item}
              </label>
            </div>
          ))}
          {availableItems.length === 0 && (
            <div className='text-sm text-gray-500 italic py-2'>
              No hay opciones disponibles
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className='w-full md:w-full lg:w-80'>
      {/* Advanced Filters */}
      <div className='bg-white rounded-lg shadow-sm border border-gray-100 p-4 sticky top-4'>
        <div className='flex justify-between items-center mb-4'>
          <div className='flex items-center gap-2'>
            <Filter size={16} />
            <h3 className='text-lg font-semibold text-gray-800'>Filtros</h3>
          </div>
          {hasActiveFilters && (
            <Button
              variant='ghost'
              size='sm'
              onClick={resetAllFilters}
              className='text-blue-600 hover:text-blue-800 flex items-center gap-1'
            >
              <RotateCcw size={14} />
              <span className='text-xs'>Resetear</span>
            </Button>
          )}
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className='flex flex-wrap gap-1 mb-4'>
            {selectedBrands.map((brand) => (
              <Badge
                key={`badge-${brand}`}
                variant='outline'
                className='flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200'
              >
                {brand}
                <X
                  size={12}
                  className='ml-1 cursor-pointer'
                  onClick={() => toggleFilter(brand, 'brand')}
                />
              </Badge>
            ))}

            {selectedTypes.map((type) => (
              <Badge
                key={`badge-${type}`}
                variant='outline'
                className='flex items-center gap-1 bg-green-50 text-green-700 border-green-200'
              >
                {type}
                <X
                  size={12}
                  className='ml-1 cursor-pointer'
                  onClick={() => toggleFilter(type, 'type')}
                />
              </Badge>
            ))}

            {selectedFuels.map((fuel) => (
              <Badge
                key={`badge-${fuel}`}
                variant='outline'
                className='flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200'
              >
                {fuel}
                <X
                  size={12}
                  className='ml-1 cursor-pointer'
                  onClick={() => toggleFilter(fuel, 'fuel')}
                />
              </Badge>
            ))}

            {selectedConditions.map((condition) => (
              <Badge
                key={`badge-${condition}`}
                variant='outline'
                className='flex items-center gap-1 bg-violet-50 text-violet-700 border-violet-200'
              >
                {condition}
                <X
                  size={12}
                  className='ml-1 cursor-pointer'
                  onClick={() => toggleFilter(condition, 'condition')}
                />
              </Badge>
            ))}

            {selectedColors.map((color) => (
              <Badge
                key={`badge-${color}`}
                variant='outline'
                className='flex items-center gap-1 bg-rose-50 text-rose-700 border-rose-200'
              >
                {color}
                <X
                  size={12}
                  className='ml-1 cursor-pointer'
                  onClick={() => toggleFilter(color, 'color')}
                />
              </Badge>
            ))}

            {(priceRange.min !== minMaxPrice.min ||
              priceRange.max !== minMaxPrice.max) && (
              <Badge
                variant='outline'
                className='flex items-center gap-1 bg-slate-50 text-slate-700 border-slate-200'
              >
                ${priceRange.min.toLocaleString()} - $
                {priceRange.max.toLocaleString()}
                <X
                  size={12}
                  className='ml-1 cursor-pointer'
                  onClick={() =>
                    setPriceRange({
                      min: minMaxPrice.min,
                      max: minMaxPrice.max,
                    })
                  }
                />
              </Badge>
            )}
          </div>
        )}

        {/* Price Range Filter */}
        <div className='mb-4 border-b border-gray-100 pb-4'>
          <button
            className='flex w-full items-center justify-between cursor-pointer transition-colors hover:bg-gray-50 p-2 rounded-md'
            onClick={() => setPriceRangeOpen(!priceRangeOpen)}
            type='button'
          >
            <div className='flex items-center gap-2'>
              <Banknote size={18} />
              <span className='font-medium text-gray-800'>Rango de Precio</span>
            </div>
            {priceRangeOpen ? (
              <ChevronDown size={18} className='text-gray-600' />
            ) : (
              <ChevronRight size={18} className='text-gray-600' />
            )}
          </button>

          {priceRangeOpen && (
            <div className='mt-3 px-4'>
              <div className='flex justify-between mb-2 text-sm text-gray-600'>
                <span>${priceRange.min?.toLocaleString()}</span>
                <span>${priceRange.max?.toLocaleString()}</span>
              </div>
              <Slider
                defaultValue={[priceRange.min, priceRange.max]}
                value={[priceRange.min, priceRange.max]}
                min={minMaxPrice.min}
                max={minMaxPrice.max}
                step={1000}
                onValueChange={(values) => {
                  setPriceRange({ min: values[0], max: values[1] });
                }}
                className='my-4'
              />
            </div>
          )}
        </div>

        {/* Brand Filter */}
        <FilterSection
          title='Marca'
          icon={<Car size={18} />}
          isOpen={brandOpen}
          toggleOpen={() => setBrandOpen(!brandOpen)}
          selectedItems={selectedBrands}
          availableItems={availableBrands}
          type='brand'
        />

        {/* Vehicle Type Filter */}
        <FilterSection
          title='Tipo de Vehículo'
          icon={<CarFront size={18} />}
          isOpen={typeOpen}
          toggleOpen={() => setTypeOpen(!typeOpen)}
          selectedItems={selectedTypes}
          availableItems={availableTypes}
          type='type'
        />

        {/* Fuel Type Filter */}
        <FilterSection
          title='Combustible'
          icon={<Fuel size={18} />}
          isOpen={fuelOpen}
          toggleOpen={() => setFuelOpen(!fuelOpen)}
          selectedItems={selectedFuels}
          availableItems={availableFuels}
          type='fuel'
        />

        {/* Condition Filter */}
        <FilterSection
          title='Condición'
          icon={<Star size={18} />}
          isOpen={conditionOpen}
          toggleOpen={() => setConditionOpen(!conditionOpen)}
          selectedItems={selectedConditions}
          availableItems={availableConditions}
          type='condition'
        />

        {/* Color Filter */}
        <FilterSection
          title='Color'
          icon={<Palette size={18} />}
          isOpen={colorOpen}
          toggleOpen={() => setColorOpen(!colorOpen)}
          selectedItems={selectedColors}
          availableItems={availableColors}
          type='color'
        />
      </div>
    </div>
  );
};
