// TraditionalHowToArrive — exact clone of website-gocar HowToArrive.tsx
// Only changes: useClientStore → useAuth, supabase import path, heroui Button → native,
// useTranslation → hardcoded ES, text-primary → inline style

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { useLoadScript, GoogleMap, OverlayView } from '@react-google-maps/api';
import { Icon } from '@iconify/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';
import { OpeningHours, type OpeningHoursData } from './OpeningHours';

// ── Types ──
interface Dealership {
  id: string | number;
  client_id: number;
  address: string;
  phone: string;
  email: string;
  location: { lat: number | string; lng: number | string };
  opening_hours?: OpeningHoursData | null;
  created_at: string;
  updated_at?: string;
}

// ── Gray map style — same as website ──
const grayMapStyle = [
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'landscape', elementType: 'all', stylers: [{ color: '#f3f4f6' }] },
  { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'all', stylers: [{ color: '#dbeafe' }] },
];

// ── Map marker — same SVG as website ──
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
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' className='w-8 h-8 drop-shadow-lg text-blue-500' fill='currentColor'>
      <path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' />
    </svg>
  </div>
);

// ── Main component ──
interface TraditionalHowToArriveProps {
  title?: string;
  subtitle?: string;
  bgColor?: string;
  textColor?: string;
  subtitleColor?: string;
  accentColor?: string;
  buttonText?: string;
  cardBgColor?: string;
  cardBorderColor?: string;
  labelColor?: string;
  valueColor?: string;
}

export const TraditionalHowToArrive = ({
  title = '¿Cómo llegar?',
  subtitle = 'Encuéntranos en la siguiente dirección:',
  bgColor = '',
  textColor = '',
  subtitleColor = '',
  accentColor = '',
  buttonText = 'Cómo llegar',
  cardBgColor = '',
  cardBorderColor = '',
  labelColor = '',
  valueColor = '',
}: TraditionalHowToArriveProps) => {
  const { connectors, selected, id } = useNode((s) => ({ selected: s.events.selected }));
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));
  const { client } = useAuth() as { client: any };
  const clientDefaults = getPersonalizedDefaults(client);

  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [selectedDealership, setSelectedDealership] = useState<Dealership | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: '__REDACTED_SECRET__',
  });

  // ── Fetch dealerships — same as website ──
  useEffect(() => {
    const fetchDealerships = async () => {
      if (client?.id) {
        const { data } = await supabase
          .from('dealerships')
          .select('*')
          .eq('client_id', client.id);

        // Filter out dealerships with invalid/missing location
        const valid = (data || []).filter(
          (d: any) => d.location && d.location.lat != null && d.location.lng != null
        );
        if (valid.length > 0) {
          setDealerships(valid);
          setSelectedDealership(valid[0]);
        } else if (client.location?.lat != null && client.location?.lng != null) {
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
      }
      setIsLoading(false);
    };
    fetchDealerships();
  }, [client]);

  const mapOptions = useMemo(() => ({
    styles: grayMapStyle,
    disableDefaultUI: true,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
  }), []);

  const handleOpenDirections = useCallback((dealership: Dealership) => {
    if (isEnabled) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${dealership.location.lat},${dealership.location.lng}`;
    window.open(url, '_blank');
  }, [isEnabled]);

  const currentIndex = dealerships.findIndex((d) => d.id === selectedDealership?.id);

  const handleNext = () => {
    if (dealerships.length <= 1) return;
    setSelectedDealership(dealerships[(currentIndex + 1) % dealerships.length]);
  };

  const handlePrev = () => {
    if (dealerships.length <= 1) return;
    setSelectedDealership(dealerships[(currentIndex - 1 + dealerships.length) % dealerships.length]);
  };

  const finalBg = bgColor || '#f8fafc';
  const finalText = textColor || '#111827';
  const finalCardBg = cardBgColor || '#ffffff';
  const finalCardBorder = cardBorderColor || 'rgba(0,0,0,0.06)';
  const finalLabel = labelColor || '#6b7280';
  const finalValue = valueColor || '#111827';
  const finalSubtitle = subtitleColor || '#4b5563';
  const finalAccent = accentColor || clientDefaults.primaryColor;

  if (!isLoaded || isLoading) {
    return (
      <div ref={connectors.connect} className='flex items-center justify-center py-20'>
        <div className='animate-spin rounded-full h-8 w-8 border-2 border-gray-300' style={{ borderTopColor: finalAccent }} />
      </div>
    );
  }

  // ── Render — same structure as website ──
  return (
    <div
      ref={connectors.connect}
      className='py-12 w-full'
      style={{ backgroundColor: finalBg, border: selected ? '1px dashed #1e88e5' : '1px solid transparent' }}
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8 text-center'>
          <EditableText
            tag="h2"
            value={title}
            nodeId={id}
            propName="title"
            className='text-3xl font-bold mb-2'
            style={{ color: finalText }}
          />
          <EditableText
            tag="p"
            value={subtitle}
            nodeId={id}
            propName="subtitle"
            style={{ color: finalSubtitle }}
          />
        </div>

        {/* Grid Layout — same as website */}
        <div className='grid lg:grid-cols-3 gap-6'>
          {/* Info Card — same as website */}
          <div className='lg:col-span-1'>
            <div className='rounded-xl shadow-sm h-full min-h-[300px] flex flex-col' style={{ backgroundColor: finalCardBg, border: `1px solid ${finalCardBorder}` }}>
              {/* Navigation (only if multiple) */}
              {dealerships.length > 1 && (
                <div className='flex items-center justify-between px-4 py-3' style={{ borderBottom: `1px solid ${finalCardBorder}` }}>
                  <button onClick={handlePrev} className='p-1 rounded-full transition-colors'>
                    <Icon icon='mdi:chevron-left' className='text-xl' style={{ color: finalLabel }} />
                  </button>
                  <span className='text-sm' style={{ color: finalLabel }}>
                    {currentIndex + 1} de {dealerships.length}
                  </span>
                  <button onClick={handleNext} className='p-1 rounded-full transition-colors'>
                    <Icon icon='mdi:chevron-right' className='text-xl' style={{ color: finalLabel }} />
                  </button>
                </div>
              )}

              {/* Content — same as website */}
              {selectedDealership && (
                <div className='p-5 flex-1 flex flex-col'>
                  <div className='space-y-4 flex-1'>
                    {/* Address */}
                    <div className='flex gap-3'>
                      <Icon icon='mdi:map-marker' className='text-xl flex-shrink-0 mt-0.5' style={{ color: finalAccent }} />
                      <div className='min-w-0'>
                        <p className='text-xs uppercase tracking-wide mb-1' style={{ color: finalLabel }}>Dirección</p>
                        <p className='text-sm leading-relaxed' style={{ color: finalValue }}>{selectedDealership.address}</p>
                      </div>
                    </div>

                    {/* Phone */}
                    {selectedDealership.phone && (
                      <div className='flex gap-3'>
                        <Icon icon='mdi:phone' className='text-xl flex-shrink-0' style={{ color: finalAccent }} />
                        <div>
                          <p className='text-xs uppercase tracking-wide mb-1' style={{ color: finalLabel }}>Teléfono</p>
                          <a href={`tel:${selectedDealership.phone}`} className='text-sm hover:underline transition-colors' style={{ color: finalValue }}>
                            {selectedDealership.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    {selectedDealership.email && (
                      <div className='flex gap-3'>
                        <Icon icon='mdi:email' className='text-xl flex-shrink-0' style={{ color: finalAccent }} />
                        <div className='min-w-0'>
                          <p className='text-xs uppercase tracking-wide mb-1' style={{ color: finalLabel }}>Email</p>
                          <a href={`mailto:${selectedDealership.email}`} className='text-sm hover:underline transition-colors truncate block' style={{ color: finalValue }}>
                            {selectedDealership.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Horario de atención */}
                    {selectedDealership.opening_hours && (
                      <div className='flex gap-3'>
                        <Icon icon='mdi:clock-outline' className='text-xl flex-shrink-0 mt-0.5' style={{ color: finalAccent }} />
                        <div className='min-w-0 flex-1'>
                          <p className='text-xs uppercase tracking-wide mb-1' style={{ color: finalLabel }}>Horario</p>
                          <OpeningHours
                            hours={selectedDealership.opening_hours}
                            labelColor={finalLabel}
                            valueColor={finalValue}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Button — same as website heroui Button color="primary" */}
                  <button
                    className='w-full mt-4 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90'
                    style={{ backgroundColor: finalAccent }}
                    onClick={() => selectedDealership && handleOpenDirections(selectedDealership)}
                  >
                    {buttonText}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Map — same as website */}
          <div className='lg:col-span-2'>
            <div style={{ height: '400px', border: `1px solid ${finalCardBorder}` }} className='w-full rounded-xl overflow-hidden shadow-sm'>
              <GoogleMap
                zoom={15}
                center={
                  selectedDealership?.location
                    ? { lat: Number(selectedDealership.location.lat), lng: Number(selectedDealership.location.lng) }
                    : { lat: -33.45, lng: -70.65 }
                }
                mapContainerStyle={{ width: '100%', height: '100%' }}
                options={mapOptions}
              >
                {dealerships.filter(d => d.location).map((dealership) => (
                  <OverlayView
                    key={String(dealership.id)}
                    position={{ lat: Number(dealership.location.lat), lng: Number(dealership.location.lng) }}
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
      </div>
    </div>
  );
};

(TraditionalHowToArrive as any).craft = {
  displayName: 'TraditionalHowToArrive',
  props: {
    title: '¿Cómo llegar?',
    subtitle: 'Encuéntranos en la siguiente dirección:',
    bgColor: '',
    textColor: '',
    subtitleColor: '',
    accentColor: '',
    buttonText: 'Cómo llegar',
    cardBgColor: '',
    cardBorderColor: '',
    labelColor: '',
    valueColor: '',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
