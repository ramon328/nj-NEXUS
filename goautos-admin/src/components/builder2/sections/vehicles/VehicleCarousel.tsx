import React, { useEffect, useMemo, useState } from 'react';
import { useNode } from '@craftjs/core';
import { DeleteButton } from '../../DeleteButton';
import { supabase } from '@/integrations/supabase/client';
import { Condition, FuelType, Vehicle } from '@/types/vehicle';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { Button } from '@/components/ui/button';
import { VehicleCard } from './VehicleCard';
import { EditableText } from '../../EditableText';

export type SimpleVehicle = Omit<
  Vehicle,
  'brand' | 'model' | 'status' | 'category' | 'fuel_type' | 'condition'
> & {
  // Relaciones simplificadas que llegan del SELECT de Supabase
  brand?: { id: number; name: string };
  model?: { id: number; name: string };
  status?: { id: number; name: string; show_in_web?: boolean };
  category?: { id: number; name: string };

  // Hacemos compatibles fuel_type/condition (permitimos campos de FuelType/Condition pero al menos id/name)
  fuel_type?: ({ id: number; name: string } & Partial<FuelType>);
  condition?: ({ id: number; name: string } & Partial<Condition>);

  // Ya existe created_at en Vehicle, pero aquí no molesta
  vehicles_sales?:
    | Array<{ created_at: string; [key: string]: any }>
    | { created_at: string; [key: string]: any }
    | null;

  vehicles_reservations?:
    | Array<{ created_at: string; [key: string]: any }>
    | { created_at: string; [key: string]: any }
    | null;

  event_date?: string;
};


interface VehicleCarouselProps {
  title?: string;
  subtitle?: string;
  bgColor?: string;
  textColor?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  autoplay?: boolean;
  autoplaySpeed?: number;
  itemsToShow?: number;
  // 'available' = vehículos disponibles (default, comportamiento histórico).
  // 'sold' = recién vendidos, ordenados por fecha de venta desc.
  mode?: 'available' | 'sold';
  showStatuses?: ('Publicado' | 'Vendido' | 'Reservado')[];
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
  newBadgeText?: string; // New prop for the "Recién publicado" badge text
  children?: React.ReactNode;
}

export const VehicleCarousel = ({
  title = 'Vehículos destacados',
  subtitle = 'Descubre nuestra selección de vehículos',
  bgColor = '#ffffff',
  textColor = '#333333',
  buttonText = 'Ver todos',
  buttonLink = '/vehicles',
  buttonBgColor = '#3b82f6',
  buttonTextColor = '#ffffff',
  autoplay = true,
  autoplaySpeed = 5000,
  itemsToShow = 3,
  mode = 'available',
  showStatuses = ['Publicado', 'Reservado'],
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
}: VehicleCarouselProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  // Convert string-based props to their actual types
  const autoplayValue =
    typeof autoplay === 'string' ? autoplay === 'true' : autoplay;
  const itemsToShowValue =
    typeof itemsToShow === 'string' ? parseInt(itemsToShow) : itemsToShow;

  // Handle complex showStatuses — memoize to avoid infinite re-renders
  const statusValues = useMemo(() => {
    if (
      Array.isArray(showStatuses) &&
      showStatuses.length > 0 &&
      typeof showStatuses[0] === 'object'
    ) {
      return showStatuses.map((item: any) => item.status);
    }
    return showStatuses;
  }, [showStatuses]);

  const { client } = useAuth();

  // Obtener valores por defecto del cliente real
  const clientDefaults = getPersonalizedDefaults(client);

  const [vehicles, setVehicles] = useState<SimpleVehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Ajustar cantidad de vehículos visibles según el tamaño de pantalla
  const getVisibleItems = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 1;
      if (window.innerWidth < 1024) return Math.min(2, itemsToShowValue);
      return itemsToShowValue;
    }
    return itemsToShowValue;
  };

  const [visibleItems, setVisibleItems] = useState(getVisibleItems());

  useEffect(() => {
    const handleResize = () => {
      setVisibleItems(getVisibleItems());
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fetch vehículos desde Supabase
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
            status:status_id(id, name, show_in_web, web_visibility_days),
            brand:brand_id(id, name),
            model:model_id(id, name),
            category:category_id(id, name),
            fuel_type:fuel_type_id(id, name),
            vehicles_sales!vehicle_id(*),
            vehicles_reservations!vehicle_id(*)
          `
          )
          .eq('client_id', client?.id as number)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching vehicles:', error);
        } else {
          const processedData = data.map((vehicle: any) => {
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
                vehicle.vehicles_sales.created_at
              ) {
                // It's a single object
                event_date = vehicle.vehicles_sales.created_at;
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
                vehicle.vehicles_reservations.created_at
              ) {
                // It's a single object
                event_date = vehicle.vehicles_reservations.created_at;
              }
            }
            return { ...vehicle, event_date };
          });

          const vehiclesData = processedData as unknown as SimpleVehicle[];

          // Filtrar vehículos por estado y luego por fecha de evento para Vendido/Reservado
          console.log('vehicles data with event_date', vehiclesData);
          console.log('status values', statusValues);

          // Per-state visibility window (clients_vehicles_states.web_visibility_days).
          // NULL/<=0 = always show. Positive int = event_date must be within N days.
          const isWithinWindow = (
            eventDateStr: string | undefined,
            days: number | null | undefined
          ): boolean => {
            if (!days || days <= 0) return true;
            if (!eventDateStr) return false;
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            cutoff.setHours(0, 0, 0, 0);
            return new Date(eventDateStr) >= cutoff;
          };

          // Filter vehicles según mode:
          // - mode='sold': solo vendidos, respetando ventana del estado.
          // - mode='available': estados visibles (excluye vendidos), respetando ventana.
          const activelyFilteredVehicles = vehiclesData.filter((vehicle) => {
            if (!vehicle.status) return false;
            const stateDays = (vehicle.status as any).web_visibility_days as
              | number
              | null
              | undefined;
            const statusName = (vehicle.status.name || '').toLowerCase();
            const isSold = statusName.includes('vendido');

            if (mode === 'sold') {
              if (!isSold) return false;
              return isWithinWindow(vehicle.event_date, stateDays);
            }

            // mode === 'available': nunca vendidos en este preset
            if (isSold) return false;

            let shouldShow = false;
            if (typeof vehicle.status.show_in_web === 'boolean') {
              shouldShow = vehicle.status.show_in_web;
            } else {
              shouldShow = statusValues.includes(vehicle.status.name as any);
            }
            if (!shouldShow) return false;
            return isWithinWindow(vehicle.event_date, stateDays);
          });

          // mode='sold': ordenar por event_date (fecha de venta) desc
          if (mode === 'sold') {
            const sortedSold = [...activelyFilteredVehicles].sort((a, b) => {
              const dateA = a.event_date ? new Date(a.event_date).getTime() : 0;
              const dateB = b.event_date ? new Date(b.event_date).getTime() : 0;
              return dateB - dateA;
            });
            console.log('sold vehicles ordered by sale date', sortedSold);
            setVehicles(sortedSold);
            return;
          }

          // Ordenar para que los vehículos con estado "Publicado" aparezcan primero y luego por precio
          const sortedVehicles = [...activelyFilteredVehicles].sort((a, b) => {
            // Prioritize "Publicado" status
            if (
              a.status?.name === 'Publicado' &&
              b.status?.name !== 'Publicado'
            ) {
              return -1;
            }
            if (
              a.status?.name !== 'Publicado' &&
              b.status?.name === 'Publicado'
            ) {
              return 1;
            }

            // If statuses are the same (or both not 'Publicado'), sort by created_at (newest first)
            if (a.created_at && b.created_at) {
              const dateA = new Date(a.created_at).getTime();
              const dateB = new Date(b.created_at).getTime();
              if (dateA > dateB) return -1; // dateA is newer, comes first
              if (dateA < dateB) return 1; // dateB is newer, comes first
            }

            // If created_at is also the same (or one is missing), then sort by price
            const tempPriceA =
              a.price && a.discount_percentage && a.discount_percentage > 0
                ? a.price * (1 - a.discount_percentage / 100)
                : a.price;
            const tempPriceB =
              b.price && b.discount_percentage && b.discount_percentage > 0
                ? b.price * (1 - b.discount_percentage / 100)
                : b.price;

            const priceA = tempPriceA ?? Infinity;
            const priceB = tempPriceB ?? Infinity;

            if (priceA < priceB) {
              return -1;
            }
            if (priceA > priceB) {
              return 1;
            }

            return 0;
          });

          console.log('filtered by status, date, and price', sortedVehicles);

          setVehicles(sortedVehicles);
        }
      } catch (err) {
        console.error('Failed to fetch vehicles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [statusValues, client?.id]);

  return (
    <div
      ref={(ref) => ref && connectors.connect(ref)}
      style={{
        background: bgColor,
        color: textColor,
        padding: '40px 0',
        position: 'relative',
        border: selected ? '2px dashed #666666' : '1px solid transparent',
        outline: selected ? '1px dashed #999999' : 'none',
        outlineOffset: selected ? '2px' : '0px',
        minWidth: 0,
      }}
      className='w-full VehicleCarousel'
      data-section='vehicle-carousel'
    >
      {/* Botón de eliminar */}
      {selected && <DeleteButton nodeId={id} />}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 overflow-hidden'>
        {/* Encabezado */}
        <div className='flex justify-between items-center mb-8'>
          <div>
            <EditableText tag="h2" value={title} nodeId={id} propName="title" style={{ color: textColor }} className='text-3xl font-bold mb-2' />
            <EditableText tag="p" value={subtitle} nodeId={id} propName="subtitle" style={{ color: textColor }} className='text-base text-gray-600' />
          </div>
          <div>
            <Button
              style={{
                backgroundColor: buttonBgColor,
                color: buttonTextColor,
                borderColor: 'transparent',
              }}
              className='hover:opacity-90 transition-opacity'
              asChild
            >
              <a href={buttonLink}><EditableText tag="span" value={buttonText} nodeId={id} propName="buttonText" /></a>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className='flex justify-center items-center h-60'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className='text-center p-8 bg-gray-50 rounded-xl'>
            <h3 className='text-lg font-medium text-gray-700 mb-2'>
              No hay vehículos disponibles
            </h3>
            <p className='text-gray-500 mb-4'>
              En este momento no hay vehículos para mostrar
            </p>
          </div>
        ) : (
          <div className='w-full overflow-x-auto'>
            <div className='flex gap-2' style={{ minWidth: 'max-content' }}>
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className='px-2 shrink-0'
                  style={{
                    width: '320px',
                  }}
                >
                  <VehicleCard
                    vehicle={vehicle}
                    compact={false}
                    cardBgColor={cardSettings[0]?.cardBgColor}
                    cardBorderColor={cardSettings[0]?.cardBorderColor}
                    cardTextColor={cardSettings[0]?.cardTextColor}
                    cardPriceColor={cardSettings[0]?.cardPriceColor}
                    cardButtonColor={cardSettings[0]?.cardButtonColor}
                    cardButtonTextColor={cardSettings[0]?.cardButtonTextColor}
                    detailsButtonText={cardSettings[0]?.detailsButtonText}
                    bannerPosition={cardSettings[0]?.bannerPosition}
                    pricePosition={cardSettings[0]?.pricePosition}
                    newBadgeText={newBadgeText}
                    feature1={
                      cardSettings[0]?.featuresConfig?.feature1 || 'category'
                    }
                    feature2={
                      cardSettings[0]?.featuresConfig?.feature2 || 'year'
                    }
                    feature3={
                      cardSettings[0]?.featuresConfig?.feature3 || 'fuel'
                    }
                    feature4={
                      cardSettings[0]?.featuresConfig?.feature4 || 'mileage'
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
};

VehicleCarousel.craft = {
  displayName: 'VehicleCarousel',
  props: {
    title: 'Vehículos destacados',
    subtitle: 'Descubre nuestra selección de vehículos',
    bgColor: '#ffffff',
    textColor: '#333333',
    buttonText: 'Ver todos',
    buttonLink: '/vehicles',
    buttonBgColor: '#e05d31',
    buttonTextColor: '#ffffff',
    autoplay: 'true',
    autoplaySpeed: 50,
    itemsToShow: '3',
    mode: 'available',
    showStatuses: [{ status: 'Publicado' }],
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
    canDelete: () => true,
  },
  isCanvas: true,
};
