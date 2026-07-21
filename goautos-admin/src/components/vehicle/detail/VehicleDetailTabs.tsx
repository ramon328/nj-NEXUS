import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VehicleResume from './VehicleResume';
import VehicleTimeline from './VehicleTimeline';
import VehicleDetails from './VehicleDetails';
import VehicleTransactions from './VehicleTransactions';
import VehicleDocuments from './VehicleDocuments';
import { VehicleInstagramTab } from './VehicleInstagramTab';
import { Vehicle } from '@/types/vehicle';
import { useI18n } from '@/hooks/useI18n';

type VehicleDetailTabsProps = {
  vehicle: Vehicle;
  onUpdate?: () => void;
};

const tabItemsBase = [
  { value: 'resumen', key: 'vehicles.detail.tabs.resume' },
  { value: 'timeline', key: 'vehicles.detail.tabs.timeline' },
  { value: 'details', key: 'vehicles.detail.tabs.details' },
  { value: 'documents', key: 'vehicles.detail.tabs.documents' },
];

const VehicleDetailTabs = ({ vehicle, onUpdate }: VehicleDetailTabsProps) => {
  const { clientId } = useAuth();
  const { tCommon } = useI18n();
  const [activeTab, setActiveTab] = useState('resumen');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // Si hay Instagram, agregarlo dinámicamente
  const tabs = vehicle.instagram_post_id
    ? [...tabItemsBase, { value: 'instagram', key: 'vehicles.detail.tabs.instagram' }]
    : tabItemsBase;

  // Leer el hash de la URL al cargar el componente
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && tabs.some(t => t.value === hash)) {
      setActiveTab(hash);
    }
  }, []);

  useEffect(() => {
    const idx = tabs.findIndex((t) => t.value === activeTab);
    const ref = tabRefs.current[idx];
    if (ref) {
      setIndicatorStyle({
        left: ref.offsetLeft,
        width: ref.offsetWidth,
      });
    }
  }, [activeTab, tabs.length]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue='resumen'>
      <div className='tabs-container relative'>
        <div className='overflow-x-auto scrollbar-none'>
          <TabsList className='flex justify-start rounded-none p-0 bg-transparent'>
            {tabs.map((tab, idx) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                ref={(el) => (tabRefs.current[idx] = el)}
                className='text-xs sm:text-sm py-2 px-3 sm:px-5 min-w-[80px] sm:min-w-[120px] whitespace-nowrap font-base transition-colors duration-200 text-slate-500 data-[state=active]:text-primary'
              >
                {tCommon(tab.key)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {/* Línea base gris */}
        <div className='h-[3px] bg-slate-100 rounded-full -mt-[3px]' />
        {/* Indicador celeste animado */}
        <div
          className='h-[3px] bg-primary rounded-full -mt-[3px] transition-all duration-300'
          style={{
            marginLeft: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      </div>

      <TabsContent value='resumen' className='mt-4'>
        <VehicleResume vehicle={vehicle} onUpdate={onUpdate} />
      </TabsContent>

      <TabsContent value='timeline' className='mt-4'>
        <VehicleTimeline vehicle={vehicle} />
      </TabsContent>

      <TabsContent value='details' className='mt-4'>
        <VehicleDetails vehicle={vehicle} />
      </TabsContent>

      {/*  <TabsContent value='transactions' className='mt-4'>
        <VehicleTransactions vehicle={vehicle} />
      </TabsContent> */}

      <TabsContent value='documents' className='mt-4'>
        <VehicleDocuments vehicleId={vehicle.id} vehicle={vehicle} />
      </TabsContent>

      {vehicle.instagram_post_id && (
        <TabsContent value='instagram' className='mt-4'>
          <VehicleInstagramTab vehicle={vehicle} clientId={clientId} />
        </TabsContent>
      )}
    </Tabs>
  );
};

export default VehicleDetailTabs;
