'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { useLoadScript, GoogleMap, OverlayView } from '@react-google-maps/api';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { EditableText } from '../../EditableText';
import { OpeningHours, type OpeningHoursData } from './OpeningHours';
import { Icon } from '@iconify/react';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Client as BaseClient } from '@/types/user';

// Extend the Client type to include potential location data
interface ExtendedClient extends BaseClient {
  location?: {
    lat: number | string;
    lng: number | string;
  };
}

interface HowToArriveProps {
  title?: string;
  subtitle?: string;
  titleAlignment?: 'left' | 'center' | 'right';
  height?: string;
  backgroundColor?: string;
  textColor?: string;
  cardBgColor?: string;
  cardTextColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonLabel?: string;
  iconColor?: string;
  children?: React.ReactNode;
}

interface Location {
  lat: number;
  lng: number;
}

interface Dealership {
  id: string | number;
  client_id: number;
  address: string;
  phone: string;
  email: string;
  location: Location | any; // Accommodate for various location formats from Supabase
  opening_hours?: OpeningHoursData | null;
  created_at: string;
  updated_at?: string; // Make optional to handle Supabase data
}

// Gray map style — matches website-gocar exactly
const grayMapStyle = [
  {
    featureType: 'administrative',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7280' }],
  },
  {
    featureType: 'landscape',
    elementType: 'all',
    stylers: [{ color: '#f3f4f6' }],
  },
  {
    featureType: 'poi',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7280' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#e5e7eb' }],
  },
  {
    featureType: 'transit',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'all',
    stylers: [{ color: '#dbeafe' }],
  },
];

// Map marker component — matches website-gocar SVG marker
const MapMarker = ({
  onClick,
  isSelected,
  hasMultipleLocations = false,
}: {
  onClick?: () => void;
  isSelected?: boolean;
  hasMultipleLocations?: boolean;
}) => (
  <div
    onClick={onClick}
    className={`cursor-pointer transition-all duration-200 ${
      isSelected ? 'scale-110' : 'hover:scale-105'
    } ${hasMultipleLocations && !isSelected ? 'opacity-40 hover:opacity-70' : ''}`}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="w-8 h-8 drop-shadow-lg text-blue-500"
      fill="currentColor"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  </div>
);

export const HowToArrive = ({
  title = '¿Cómo llegar?',
  subtitle = 'Encuentranos en la siguiente dirección:',
  titleAlignment = 'center',
  height = '400px',
  backgroundColor = '#f9fafb',
  textColor = '#111827',
  cardBgColor = '#ffffff',
  cardTextColor = '#111827',
  buttonBgColor = '#2563eb', // primary blue color
  buttonTextColor = '#ffffff',
  buttonLabel = 'Cómo llegar en Google Maps',
  iconColor = '#60a5fa',
  children,
}: HowToArriveProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  // Detectar si estamos en modo editor
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const { client } = useAuth() as { client: ExtendedClient | null };
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [selectedDealership, setSelectedDealership] =
    useState<Dealership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: '__REDACTED_SECRET__',
  });

  // Fetch dealerships data from Supabase
  useEffect(() => {
    const fetchDealerships = async () => {
      if (client?.id) {
        try {
          const { data, error } = await supabase
            .from('dealerships')
            .select('*')
            .eq('client_id', client.id);

          if (error) {
            console.error('Error fetching dealerships:', error);
            setIsLoading(false);
            return;
          }

          if (data && data.length > 0) {
            // Ensure data matches our Dealership interface
            const typedDealerships = data.map((dealership: any) => ({
              ...dealership,
              // Add updated_at if it doesn't exist
              updated_at: dealership.updated_at || new Date().toISOString(),
              // Ensure location is properly formatted
              location: dealership.location || { lat: 0, lng: 0 },
            })) as Dealership[];

            setDealerships(typedDealerships);
            setSelectedDealership(typedDealerships[0]);
          } else if (client.location) {
            // Create a default dealership using client data if no dealerships found
            const defaultDealership: Dealership = {
              id: 'default',
              client_id: client.id,
              address: client.contact?.address || '',
              phone: client.contact?.phone || '',
              email: client.contact?.email || '',
              location: {
                lat: Number(client.location.lat),
                lng: Number(client.location.lng),
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            setDealerships([defaultDealership]);
            setSelectedDealership(defaultDealership);
          }
        } catch (err) {
          console.error('Failed to fetch dealerships:', err);
        }
      }
      setIsLoading(false);
    };

    fetchDealerships();
  }, [client]);

  // Map options
  const mapOptions = useMemo(
    () => ({
      styles: grayMapStyle,
      disableDefaultUI: true,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
    }),
    []
  );

  // Handler for marker click - Opens Google Maps directions
  const handleMarkerClick = useCallback(
    (dealership: Dealership) => {
      if (isEnabled) {
        return; // No hacer nada en modo editor
      }

      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${dealership.location.lat},${dealership.location.lng}`;
      window.open(googleMapsUrl, '_blank');
    },
    [isEnabled]
  );

  // Navigation handlers for multiple dealerships
  const handleNextDealership = () => {
    if (!selectedDealership || dealerships.length <= 1) return;
    const currentIndex = dealerships.findIndex(
      (d) => d.id === selectedDealership.id
    );
    const nextIndex = (currentIndex + 1) % dealerships.length;
    setSelectedDealership(dealerships[nextIndex]);
  };

  const handlePrevDealership = () => {
    if (!selectedDealership || dealerships.length <= 1) return;
    const currentIndex = dealerships.findIndex(
      (d) => d.id === selectedDealership.id
    );
    const prevIndex =
      (currentIndex - 1 + dealerships.length) % dealerships.length;
    setSelectedDealership(dealerships[prevIndex]);
  };

  // Create a ref handler that returns void to match expected type
  const refHandler = (element: HTMLDivElement | null) => {
    if (element && connectors.connect) {
      connectors.connect(element);
    }
  };

  // Loading state
  if (!isLoaded || isLoading) {
    return (
      <div
        className='flex items-center justify-center'
        style={{ height, background: backgroundColor }}
        ref={refHandler}
      >
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    );
  }

  const currentIndex = dealerships.findIndex((d) => d.id === selectedDealership?.id);

  return (
    <div
      ref={refHandler}
      style={{
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
      className='py-12 bg-slate-50/50 w-full'
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header — matches website */}
        <div className={`mb-8 text-${titleAlignment}`}>
          <EditableText tag="h2" value={title} nodeId={id} propName="title" className='text-3xl font-bold text-gray-900 mb-2' />
          <EditableText tag="p" value={subtitle} nodeId={id} propName="subtitle" className='text-gray-600' />
        </div>

        {/* Grid Layout — matches website lg:grid-cols-3 */}
        <div className='grid lg:grid-cols-3 gap-6'>
          {/* Info Card — matches website styling */}
          <div className='lg:col-span-1'>
            <div className='bg-white rounded-xl shadow-sm border border-slate-200/60 h-full min-h-[300px] flex flex-col'>
              {/* Navigation (only if multiple) */}
              {dealerships.length > 1 && (
                <div className='flex items-center justify-between px-4 py-3 border-b border-slate-100'>
                  <button
                    onClick={handlePrevDealership}
                    className='p-1 rounded-full hover:bg-slate-100 transition-colors'
                  >
                    <Icon icon='mdi:chevron-left' className='text-xl text-gray-500' />
                  </button>
                  <span className='text-sm text-gray-500'>
                    {currentIndex + 1} de {dealerships.length}
                  </span>
                  <button
                    onClick={handleNextDealership}
                    className='p-1 rounded-full hover:bg-slate-100 transition-colors'
                  >
                    <Icon icon='mdi:chevron-right' className='text-xl text-gray-500' />
                  </button>
                </div>
              )}

              {/* Content */}
              {selectedDealership && (
                <div className='p-5 flex-1 flex flex-col'>
                  <div className='space-y-4 flex-1'>
                    {/* Address */}
                    <div className='flex gap-3'>
                      <Icon icon='mdi:map-marker' className='text-xl text-primary flex-shrink-0 mt-0.5' />
                      <div className='min-w-0'>
                        <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>Dirección</p>
                        <p className='text-gray-900 text-sm leading-relaxed'>{selectedDealership.address}</p>
                      </div>
                    </div>

                    {/* Phone */}
                    {selectedDealership.phone && (
                      <div className='flex gap-3'>
                        <Icon icon='mdi:phone' className='text-xl text-primary flex-shrink-0' />
                        <div>
                          <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>Teléfono</p>
                          <a href={`tel:${selectedDealership.phone}`} className='text-gray-900 text-sm hover:text-primary transition-colors'>
                            {selectedDealership.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    {selectedDealership.email && (
                      <div className='flex gap-3'>
                        <Icon icon='mdi:email' className='text-xl text-primary flex-shrink-0' />
                        <div className='min-w-0'>
                          <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>Email</p>
                          <a href={`mailto:${selectedDealership.email}`} className='text-gray-900 text-sm hover:text-primary transition-colors truncate block'>
                            {selectedDealership.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Horario de atención */}
                    {selectedDealership.opening_hours && (
                      <div className='flex gap-3'>
                        <Icon icon='mdi:clock-outline' className='text-xl text-primary flex-shrink-0 mt-0.5' />
                        <div className='min-w-0 flex-1'>
                          <p className='text-xs text-gray-500 uppercase tracking-wide mb-1'>Horario</p>
                          <OpeningHours
                            hours={selectedDealership.opening_hours}
                            labelColor='#374151'
                            valueColor='#111827'
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Button */}
                  <button
                    className='w-full mt-4 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90'
                    style={{ backgroundColor: buttonBgColor }}
                    onClick={() =>
                      selectedDealership && !isEnabled && handleMarkerClick(selectedDealership)
                    }
                  >
                    <EditableText tag="span" value={buttonLabel} nodeId={id} propName="buttonLabel" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className='lg:col-span-2'>
            <div
              style={{ height }}
              className='w-full rounded-xl overflow-hidden shadow-sm border border-slate-200/60'
            >
              <GoogleMap
                zoom={15}
                center={
                  selectedDealership
                    ? {
                        lat: Number(selectedDealership.location.lat),
                        lng: Number(selectedDealership.location.lng),
                      }
                    : undefined
                }
                mapContainerStyle={{ width: '100%', height: '100%' }}
                options={mapOptions}
              >
                {dealerships.map((dealership) => (
                  <OverlayView
                    key={dealership.id.toString()}
                    position={{
                      lat: Number(dealership.location.lat),
                      lng: Number(dealership.location.lng),
                    }}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                  >
                    <MapMarker
                      onClick={() => setSelectedDealership(dealership)}
                      isSelected={selectedDealership?.id === dealership.id}
                      hasMultipleLocations={dealerships.length > 1}
                    />
                  </OverlayView>
                ))}
              </GoogleMap>
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
};

// Settings component for the editor
const HowToArriveSettings = () => {
  const { actions, selected } = useEditor((state) => {
    const currentNodeId = state.events.selected;
    let selectedNode = null;

    if (currentNodeId) {
      const nodeId = Array.from(currentNodeId as Set<string>)[0];
      if (nodeId && state.nodes[nodeId]) {
        selectedNode = {
          id: nodeId,
          data: state.nodes[nodeId].data,
          props: state.nodes[nodeId].data.props,
        };
      }
    }

    return {
      selected: selectedNode,
    };
  });

  if (!selected) {
    return (
      <div>Please select the HowToArrive component to edit its properties.</div>
    );
  }

  if (!selected.props) {
    return <div>Loading properties...</div>;
  }

  return (
    <div className='space-y-4'>
      <div>
        <label className='text-sm font-medium mb-1 block'>Título</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.title || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.title = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Subtítulo</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={3}
          value={selected.props.subtitle || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.subtitle = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Altura del mapa
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.height || '400px'}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.height = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Color de fondo</label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.backgroundColor || '#f9fafb'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.backgroundColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.backgroundColor || '#f9fafb'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.backgroundColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del texto
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.textColor || '#111827'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.textColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.textColor || '#111827'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.textColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de fondo de la tarjeta
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.cardBgColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.cardBgColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.cardBgColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.cardBgColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del texto de la tarjeta
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.cardTextColor || '#111827'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.cardTextColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.cardTextColor || '#111827'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.cardTextColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de fondo del botón
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.buttonBgColor || '#2563eb'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonBgColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.buttonBgColor || '#2563eb'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonBgColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del texto del botón
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.buttonTextColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonTextColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.buttonTextColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonTextColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Texto del botón
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.buttonLabel || 'Cómo llegar en Google Maps'}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.buttonLabel = e.target.value;
            });
          }}
        />
      </div>
    </div>
  );
};

HowToArrive.craft = {
  displayName: 'HowToArrive',
  props: {
    title: '¿Cómo llegar?',
    subtitle: 'Encuentranos en la siguiente dirección:',
    titleAlignment: 'center',
    height: '400px',
    backgroundColor: '#f9fafb',
    textColor: '#111827',
    cardBgColor: '#ffffff',
    cardTextColor: '#111827',
    buttonBgColor: '#2563eb',
    buttonTextColor: '#ffffff',
    buttonLabel: 'Cómo llegar en Google Maps',
    iconColor: '#60a5fa',
  },
  related: {
    settings: HowToArriveSettings,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
  isCanvas: true,
};

export { HowToArriveSettings };
