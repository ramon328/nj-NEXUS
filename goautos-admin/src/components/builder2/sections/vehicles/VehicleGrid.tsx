import React, { useEffect, useState } from 'react';
import { useNode } from '@craftjs/core';
import { DeleteButton } from '../../DeleteButton';
import { supabase } from '@/integrations/supabase/client';
import { Vehicle } from '@/types/vehicle';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  ChevronLeft,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VehicleFilters, PriceRange } from './VehicleFilters';
import { VehicleList } from './VehicleList';
import { VehicleTypeFilter } from './VehicleTypeFilter';
import { EditableText } from '../../EditableText';

interface VehicleStatus {
  id: number;
  name: string;
  show_in_web?: boolean;
}

// Extended Vehicle interface to include the nested properties
export interface ExtendedVehicle extends Vehicle {
  // En Vehicle, category es "any", así que aquí podemos afinarla sin romper compatibilidad
  category?: { id: number; name: string };
  // ⚠️ No redefinimos fuel_type / condition / color para no chocar con Vehicle (FuelType/Condition/Color)
  vehicles_sales?:
    | Array<{ created_at: string; [key: string]: any }>
    | { created_at: string; [key: string]: any }
    | null;
  vehicles_reservations?:
    | Array<{ created_at: string; [key: string]: any }>
    | { created_at: string; [key: string]: any }
    | null;
  event_date?: string;
}

interface VehicleGridProps {
  title?: string;
  subtitle?: string;
  bgColor?: string;
  textColor?: string;
  columns?: 2 | 3 | 4;
  showStatuses?: ('Publicado' | 'Vendido' | 'Reservado')[];
  children?: React.ReactNode;
  showFilters?: boolean;
  filterButtonColors?: {
    buttonBgColor: string;
    buttonTextColor: string;
    buttonBorderColor: string;
    activeButtonBgColor: string;
    activeButtonTextColor: string;
    activeButtonBorderColor: string;
    containerBgColor: string;
    containerBorderColor: string;
  }[];
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
}

export const VehicleGrid = ({
  title = 'Nuestros vehículos',
  subtitle = 'Explora nuestro inventario de vehículos disponibles',
  bgColor = '#ffffff',
  textColor = '#333333',
  columns = 3,
  showStatuses = ['Publicado', 'Reservado'],
  showFilters = true,
  filterButtonColors = [
    {
      buttonBgColor: '#ffffff',
      buttonTextColor: '#8c8c8c',
      buttonBorderColor: '#454545',
      activeButtonBgColor: '#224887',
      activeButtonTextColor: '#ffffff',
      activeButtonBorderColor: '#3b82f6',
      containerBgColor: '#f8fafc',
      containerBorderColor: '#e2e8f0',
    },
  ],
  cardSettings = [
    {
      cardBgColor: '#ffffff',
      cardBorderColor: '#e5e7eb',
      cardTextColor: '#1f2937',
      cardPriceColor: '#ffffff',
      cardButtonColor: '#3b82f6',
      cardButtonTextColor: '#ffffff',
      detailsButtonText: 'Ver detalles',
      bannerPosition: 'right',
      pricePosition: 'overlay',
      featuresConfig: {
        feature1: 'category',
        feature2: 'year',
        feature3: 'fuel',
        feature4: 'mileage',
      },
    },
  ],
  newBadgeText = 'Recién publicado',
  children,
}: VehicleGridProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { client } = useAuth();

  const [vehicles, setVehicles] = useState<ExtendedVehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<ExtendedVehicle[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [activeVehicleType, setActiveVehicleType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Filter values
  const [priceRange, setPriceRange] = useState<PriceRange>({
    min: 0,
    max: 100000,
  });
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedFuels, setSelectedFuels] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<
    'price_asc' | 'price_desc' | 'date_asc' | 'date_desc'
  >('date_desc'); // Default to newest first

  // Available options derived from vehicles
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableFuels, setAvailableFuels] = useState<string[]>([]);
  const [availableConditions, setAvailableConditions] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);
  const [minMaxPrice, setMinMaxPrice] = useState<{ min: number; max: number }>({
    min: 0,
    max: 100000,
  });

  // Check if any filters are active
  const hasActiveFilters =
    selectedBrands.length > 0 ||
    selectedTypes.length > 0 ||
    selectedFuels.length > 0 ||
    selectedConditions.length > 0 ||
    selectedColors.length > 0 ||
    priceRange.min !== minMaxPrice.min ||
    priceRange.max !== minMaxPrice.max ||
    searchQuery.trim() !== '' ||
    activeVehicleType !== 'all';

  // Fetch vehicles from Supabase
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!client?.id) return;
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('vehicles')
          .select(
            `
            id,
            brand_id,
            model_id,
            year,
            price,
            mileage,
            transmission,
            main_image,
            status_id,
            discount_percentage,
            created_at,
            status:status_id(id, name, show_in_web),
            brand:brand_id(id, name),
            model:model_id(id, name),
            category:category_id(id, name),
            fuel_type:fuel_type_id(id, name, created_at),
            condition:condition_id(id, name, created_at),
            color:color_id(id, name, hex, created_at),
            vehicles_sales!vehicle_id(*),
            vehicles_reservations!vehicle_id(*)
          `
          )
          .eq('client_id', client?.id as number)
          .order('created_at', { ascending: false })
          .limit(50); // Limitamos a 50 vehículos para evitar sobrecarga

        if (error) {
          console.error('Error fetching vehicles:', error);
        } else {
          // First convert to unknown to bypass type checking
          const typedData = data as unknown as Array<{
            id: any;
            brand_id: any;
            model_id: any;
            year: any;
            price: any;
            mileage: any;
            main_image: any;
            status_id: any;
            discount_percentage: any;
            created_at: any;
            status: VehicleStatus;
            brand: { id: any; name: any };
            model: { id: any; name: any };
            category: { id: any; name: any };
            fuel_type: { id: any; name: any; created_at: any };
            condition: { id: any; name: any; created_at: any };
            color: { id: any; name: any; hex: any; created_at: any };
            vehicles_sales?:
              | Array<{ created_at: string; [key: string]: any }>
              | { created_at: string; [key: string]: any }
              | null;
            vehicles_reservations?:
              | Array<{ created_at: string; [key: string]: any }>
              | { created_at: string; [key: string]: any }
              | null;
            event_date?: string;
          }>;

          // Process event_date for Vendido/Reservado
          const processedData = typedData.map((vehicle) => {
            let event_date: string | undefined;
            if (vehicle.status?.name === 'Vendido' && vehicle.vehicles_sales) {
              if (
                Array.isArray(vehicle.vehicles_sales) &&
                vehicle.vehicles_sales.length > 0
              ) {
                const sortedSales = [...vehicle.vehicles_sales].sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                );
                event_date = sortedSales[0].created_at;
              } else if (
                !Array.isArray(vehicle.vehicles_sales) &&
                (vehicle.vehicles_sales as { created_at: string }).created_at
              ) {
                event_date = (vehicle.vehicles_sales as { created_at: string })
                  .created_at;
              }
            } else if (
              vehicle.status?.name === 'Reservado' &&
              vehicle.vehicles_reservations
            ) {
              if (
                Array.isArray(vehicle.vehicles_reservations) &&
                vehicle.vehicles_reservations.length > 0
              ) {
                const sortedReservations = [
                  ...vehicle.vehicles_reservations,
                ].sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                );
                event_date = sortedReservations[0].created_at;
              } else if (
                !Array.isArray(vehicle.vehicles_reservations) &&
                (vehicle.vehicles_reservations as { created_at: string })
                  .created_at
              ) {
                event_date = (
                  vehicle.vehicles_reservations as { created_at: string }
                ).created_at;
              }
            }
            return { ...vehicle, event_date }; // Add event_date to the vehicle object
          });

          // Filter vehicles that should be visible on web
          // Use show_in_web field if defined, fallback to name-based logic for backward compatibility
          const filteredByStatus = processedData.filter((vehicle) => {
            if (!vehicle.status) return false;
            // If show_in_web is explicitly set, use it
            if (typeof vehicle.status.show_in_web === 'boolean') {
              return vehicle.status.show_in_web;
            }
            // Fallback: use name-based filtering for legacy states without show_in_web
            return showStatuses.includes(vehicle.status.name as any);
          });

          // Sort vehicles to show "Publicado" status first, then by newest
          const sortedVehicles = [...filteredByStatus].sort((a, b) => {
            if (
              a.status.name === 'Publicado' &&
              b.status.name !== 'Publicado'
            ) {
              return -1;
            }
            if (
              a.status.name !== 'Publicado' &&
              b.status.name === 'Publicado'
            ) {
              return 1;
            }
            // If statuses are the same, sort by created_at (newest first)
            if (a.created_at && b.created_at) {
              const dateA = new Date(a.created_at).getTime();
              const dateB = new Date(b.created_at).getTime();
              if (dateA > dateB) return -1;
              if (dateA < dateB) return 1;
            }
            return 0;
          });

          // Convert to ExtendedVehicle type
          const vehiclesData = sortedVehicles as unknown as ExtendedVehicle[];
          setVehicles(vehiclesData);
          setFilteredVehicles(vehiclesData);

          // Extract available filter options
          const brands = [
            ...new Set(vehiclesData.map((v) => v.brand?.name).filter(Boolean)),
          ];
          const types = [
            ...new Set(
              vehiclesData.map((v) => v.category?.name).filter(Boolean)
            ),
          ];
          const fuels = [
            ...new Set(
              vehiclesData.map((v) => v.fuel_type?.name).filter(Boolean)
            ),
          ];
          const conditions = [
            ...new Set(
              vehiclesData.map((v) => v.condition?.name).filter(Boolean)
            ),
          ];
          const colors = [
            ...new Set(vehiclesData.map((v) => v.color?.name).filter(Boolean)),
          ];

          // Find min and max prices
          const prices = vehiclesData
            .map((v) => v.price)
            .filter((p) => p !== undefined && p !== null) as number[];
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : 100000;

          setAvailableBrands(brands as string[]);
          setAvailableTypes(types as string[]);
          setAvailableFuels(fuels as string[]);
          setAvailableConditions(conditions as string[]);
          setAvailableColors(colors as string[]);
          setMinMaxPrice({ min: minPrice, max: maxPrice });
          setPriceRange({ min: minPrice, max: maxPrice });
        }
      } catch (err) {
        console.error('Failed to fetch vehicles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [showStatuses, client?.id]);

  // Reset all filters
  const resetAllFilters = () => {
    setPriceRange({ min: minMaxPrice.min, max: minMaxPrice.max });
    setSelectedBrands([]);
    setSelectedTypes([]);
    setSelectedFuels([]);
    setSelectedConditions([]);
    setSelectedColors([]);
    setActiveVehicleType('all');
    setSearchQuery('');
  };

  // Apply filters when any filter value changes
  useEffect(() => {
    if (vehicles.length === 0) return;

    let filtered = [...vehicles];

    // Search filter - check brand, model, category
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (v) =>
          (v.brand?.name && v.brand.name.toLowerCase().includes(query)) ||
          (v.model?.name && v.model.name.toLowerCase().includes(query)) ||
          (v.version_name && v.version_name.toLowerCase().includes(query)) ||
          (v.category?.name && v.category.name.toLowerCase().includes(query)) ||
          (v.year && v.year.toString().includes(query))
      );
    }

    // Filter by price range
    filtered = filtered.filter(
      (v) =>
        v.price !== undefined &&
        v.price >= priceRange.min &&
        v.price <= priceRange.max
    );

    // Filter by brand
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(
        (v) => v.brand?.name && selectedBrands.includes(v.brand.name as string)
      );
    }

    // Filter by type (category)
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(
        (v) =>
          v.category?.name && selectedTypes.includes(v.category.name as string)
      );
    }

    // Filter by fuel type
    if (selectedFuels.length > 0) {
      filtered = filtered.filter(
        (v) =>
          v.fuel_type?.name &&
          selectedFuels.includes(v.fuel_type.name as string)
      );
    }

    // Filter by condition
    if (selectedConditions.length > 0) {
      filtered = filtered.filter(
        (v) =>
          v.condition?.name &&
          selectedConditions.includes(v.condition.name as string)
      );
    }

    // Filter by color
    if (selectedColors.length > 0) {
      filtered = filtered.filter(
        (v) => v.color?.name && selectedColors.includes(v.color.name as string)
      );
    }

    // Always exclude sold vehicles — they should never appear on the website
    filtered = filtered.filter((vehicle) => {
      if ((vehicle.status?.name || '').toLowerCase().includes('vendido')) return false;
      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortOrder === 'price_asc') {
        const priceA =
          a.price && a.discount_percentage && a.discount_percentage > 0
            ? a.price * (1 - a.discount_percentage / 100)
            : a.price;
        const priceB =
          b.price && b.discount_percentage && b.discount_percentage > 0
            ? b.price * (1 - b.discount_percentage / 100)
            : b.price;
        return (priceA ?? Infinity) - (priceB ?? Infinity);
      } else if (sortOrder === 'price_desc') {
        const priceA =
          a.price && a.discount_percentage && a.discount_percentage > 0
            ? a.price * (1 - a.discount_percentage / 100)
            : a.price;
        const priceB =
          b.price && b.discount_percentage && b.discount_percentage > 0
            ? b.price * (1 - b.discount_percentage / 100)
            : b.price;
        return (priceB ?? Infinity) - (priceA ?? Infinity);
      } else if (sortOrder === 'date_desc') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      } else if (sortOrder === 'date_asc') {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      }
      return 0;
    });

    setFilteredVehicles(filtered);
  }, [
    vehicles,
    searchQuery,
    priceRange,
    selectedBrands,
    selectedTypes,
    selectedFuels,
    selectedConditions,
    selectedColors,
    sortOrder,
  ]);

  // Generate status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Publicado':
        return 'bg-green-100 text-green-800';
      case 'Vendido':
        return 'bg-red-100 text-red-800';
      case 'Reservado':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Toggle filter selection
  const toggleFilter = (
    filter: string,
    type: 'brand' | 'type' | 'fuel' | 'condition' | 'color'
  ) => {
    switch (type) {
      case 'brand':
        setSelectedBrands((prev) =>
          prev.includes(filter)
            ? prev.filter((b) => b !== filter)
            : [...prev, filter]
        );
        break;
      case 'type':
        setSelectedTypes((prev) =>
          prev.includes(filter)
            ? prev.filter((t) => t !== filter)
            : [...prev, filter]
        );
        break;
      case 'fuel':
        setSelectedFuels((prev) =>
          prev.includes(filter)
            ? prev.filter((f) => f !== filter)
            : [...prev, filter]
        );
        break;
      case 'condition':
        setSelectedConditions((prev) =>
          prev.includes(filter)
            ? prev.filter((c) => c !== filter)
            : [...prev, filter]
        );
        break;
      case 'color':
        setSelectedColors((prev) =>
          prev.includes(filter)
            ? prev.filter((c) => c !== filter)
            : [...prev, filter]
        );
        break;
    }
  };

  // Create a ref handler that returns void to match expected type
  const refHandler = (element: HTMLDivElement | null) => {
    if (element && connectors.connect) {
      connectors.connect(element);
    }
  };

  return (
    <div
      ref={refHandler}
      style={{
        background: bgColor,
        color: textColor,
        padding: '40px 0',
        position: 'relative',
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
      className='w-full VehicleGrid vehicles-section'
      data-section='vehicles'
      id='vehicles-section'
    >
      {selected && <DeleteButton nodeId={id} />}
      <div className='max-w-7xl mx-auto px-4 sm:px-6'>
        {/* Header Section */}
        <div className='text-center mb-8'>
          <EditableText tag="h2" value={title} nodeId={id} propName="title" style={{ color: textColor }} className='text-3xl font-bold mb-3 text-center' />
          <EditableText tag="p" value={subtitle} nodeId={id} propName="subtitle" style={{ color: textColor }} className='text-base text-gray-600 mb-6 text-center max-w-2xl mx-auto' />
        </div>

        {loading ? (
          <div className='flex justify-center items-center h-60'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
          </div>
        ) : (
          <div>
            {/* Search and Filter Bar */}
            <div className='mb-6 flex flex-col sm:flex-row gap-4'>
              <div className='relative flex-grow'>
                <Search
                  className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400'
                  size={18}
                />
                <Input
                  type='text'
                  placeholder='Buscar por marca, modelo o año...'
                  className='pl-10 pr-4 py-2 w-full rounded-lg border border-gray-200'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className='flex gap-3'>
                {/* Filter button for mobile */}
                <Sheet
                  open={isMobileFilterOpen}
                  onOpenChange={setIsMobileFilterOpen}
                >
                  <SheetTrigger asChild>
                    <Button
                      variant='outline'
                      className='flex items-center gap-2 md:hidden border border-gray-200'
                    >
                      <Filter size={16} />
                      <span>Filtros</span>
                      {hasActiveFilters && (
                        <span className='bg-blue-100 text-blue-800 text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center'>
                          !
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side='right'
                    className='w-[85vw] sm:max-w-md p-0 overflow-auto'
                  >
                    <SheetHeader className='px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10'>
                      <div className='flex justify-between items-center'>
                        <SheetTitle className='text-left'>Filtros</SheetTitle>
                        <div className='flex items-center gap-2'>
                          {hasActiveFilters && (
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => {
                                resetAllFilters();
                                setIsMobileFilterOpen(false);
                              }}
                              className='text-blue-600 hover:text-blue-800 text-xs'
                            >
                              <RotateCcw size={14} className='mr-1' />
                              Resetear
                            </Button>
                          )}
                          <SheetClose asChild>
                            <Button variant='outline' size='sm'>
                              <ChevronLeft size={16} className='mr-1' />
                              Volver
                            </Button>
                          </SheetClose>
                        </div>
                      </div>
                    </SheetHeader>

                    <div className='p-4'>
                      <VehicleFilters
                        priceRange={priceRange}
                        setPriceRange={setPriceRange}
                        minMaxPrice={minMaxPrice}
                        selectedBrands={selectedBrands}
                        setSelectedBrands={setSelectedBrands}
                        availableBrands={availableBrands}
                        selectedTypes={selectedTypes}
                        setSelectedTypes={setSelectedTypes}
                        availableTypes={availableTypes}
                        selectedFuels={selectedFuels}
                        setSelectedFuels={setSelectedFuels}
                        availableFuels={availableFuels}
                        selectedConditions={selectedConditions}
                        setSelectedConditions={setSelectedConditions}
                        availableConditions={availableConditions}
                        selectedColors={selectedColors}
                        setSelectedColors={setSelectedColors}
                        availableColors={availableColors}
                        toggleFilter={toggleFilter}
                        activeVehicleType={activeVehicleType}
                        resetAllFilters={resetAllFilters}
                      />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Filter toggle for desktop */}
                {showFilters && (
                  <Button
                    variant='outline'
                    className='hidden md:flex items-center gap-2 border border-gray-200'
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                  >
                    {isFilterOpen ? (
                      <SlidersHorizontal size={16} />
                    ) : (
                      <Filter size={16} />
                    )}
                    <span>
                      {isFilterOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
                    </span>
                    {hasActiveFilters && !isFilterOpen && (
                      <span className='bg-blue-100 text-blue-800 text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center'>
                        !
                      </span>
                    )}
                  </Button>
                )}

                {hasActiveFilters && (
                  <Button
                    variant='ghost'
                    className='text-sm text-blue-600'
                    onClick={resetAllFilters}
                  >
                    <RotateCcw size={14} className='mr-1' />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {/* Vehicle Type Filter - Horizontal above grid */}
            <VehicleTypeFilter
              activeVehicleType={activeVehicleType}
              setActiveVehicleType={setActiveVehicleType}
              availableTypes={availableTypes}
              setSelectedTypes={setSelectedTypes}
              buttonBgColor={filterButtonColors[0]?.buttonBgColor || '#ffffff'}
              buttonTextColor={
                filterButtonColors[0]?.buttonTextColor || '#8c8c8c'
              }
              buttonBorderColor={
                filterButtonColors[0]?.buttonBorderColor || '#454545'
              }
              activeButtonBgColor={
                filterButtonColors[0]?.activeButtonBgColor || '#224887'
              }
              activeButtonTextColor={
                filterButtonColors[0]?.activeButtonTextColor || '#ffffff'
              }
              activeButtonBorderColor={
                filterButtonColors[0]?.activeButtonBorderColor || '#3b82f6'
              }
              containerBgColor={
                filterButtonColors[0]?.containerBgColor || '#ffffff'
              }
              containerBorderColor={
                filterButtonColors[0]?.containerBorderColor || '#e5e7eb'
              }
            />

            <div className='flex flex-col md:flex-row gap-6'>
              {/* Filters Section - Desktop */}
              {showFilters && isFilterOpen && (
                <div className='hidden md:block'>
                  <VehicleFilters
                    priceRange={priceRange}
                    setPriceRange={setPriceRange}
                    minMaxPrice={minMaxPrice}
                    selectedBrands={selectedBrands}
                    setSelectedBrands={setSelectedBrands}
                    availableBrands={availableBrands}
                    selectedTypes={selectedTypes}
                    setSelectedTypes={setSelectedTypes}
                    availableTypes={availableTypes}
                    selectedFuels={selectedFuels}
                    setSelectedFuels={setSelectedFuels}
                    availableFuels={availableFuels}
                    selectedConditions={selectedConditions}
                    setSelectedConditions={setSelectedConditions}
                    availableConditions={availableConditions}
                    selectedColors={selectedColors}
                    setSelectedColors={setSelectedColors}
                    availableColors={availableColors}
                    toggleFilter={toggleFilter}
                    activeVehicleType={activeVehicleType}
                    resetAllFilters={resetAllFilters}
                  />
                </div>
              )}

              {/* Results Section */}
              <div
                className={`flex-1 ${
                  filteredVehicles.length === 0
                    ? 'flex justify-center items-center min-h-[300px]'
                    : ''
                }`}
              >
                {filteredVehicles.length === 0 ? (
                  <div className='text-center p-8 bg-gray-50 rounded-xl'>
                    <div className='text-gray-400 mb-3'>
                      <Search size={48} className='mx-auto opacity-50' />
                    </div>
                    <h3 className='text-lg font-medium text-gray-700 mb-2'>
                      No se encontraron vehículos
                    </h3>
                    <p className='text-gray-500 mb-4'>
                      Intenta ajustar los filtros o buscar otra cosa
                    </p>
                    <Button variant='outline' onClick={resetAllFilters}>
                      Quitar todos los filtros
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className='mb-4 flex justify-between items-center'>
                      <p className='text-sm text-gray-500'>
                        <span className='font-medium text-gray-700'>
                          {filteredVehicles.length}
                        </span>{' '}
                        vehículos encontrados
                      </p>
                    </div>

                    <VehicleList
                      vehicles={filteredVehicles}
                      columns={columns}
                      getStatusColor={getStatusColor}
                      sortOrder={sortOrder}
                      setSortOrder={setSortOrder}
                      cardSettings={cardSettings}
                      newBadgeText={newBadgeText}
                      source="grid" // 👈 usa VehicleCard (no VehicleCard2)
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

VehicleGrid.craft = {
  displayName: 'VehicleGrid',
  props: {
    title: 'Nuestros vehículos',
    subtitle: 'Explora nuestro inventario de vehículos disponibles',
    bgColor: '#ffffff',
    textColor: '#333333',
    columns: 3,
    showStatuses: ['Publicado', 'Reservado'],
    showFilters: true,
    filterButtonColors: [
      {
        buttonBgColor: '#ffffff',
        buttonTextColor: '#8c8c8c',
        buttonBorderColor: '#454545',
        activeButtonBgColor: '#e05d31',
        activeButtonTextColor: '#ffffff',
        activeButtonBorderColor: '#e05d31',
        containerBgColor: '#ffffff',
        containerBorderColor: '#e5e7eb',
      },
    ],
    cardSettings: [
      {
        cardBgColor: '#ffffff',
        cardBorderColor: '#e5e7eb',
        cardTextColor: '#1f2937',
        cardPriceColor: '#ffffff',
        cardButtonColor: '#e05d31',
        cardButtonTextColor: '#ffffff',
        detailsButtonText: 'Ver detalles',
        bannerPosition: 'right',
        featuresConfig: {
          feature1: 'category',
          feature2: 'year',
          feature3: 'fuel',
          feature4: 'mileage',
        },
      },
    ],
    newBadgeText: 'Recién publicado',
  },
  related: {
    // Settings component will be external
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
  isCanvas: true,
};
