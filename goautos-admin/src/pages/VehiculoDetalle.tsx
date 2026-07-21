import { VehicleDetailHeader } from '@/components/vehicle/detail/VehicleDetailHeader';
import VehicleResume from '@/components/vehicle/detail/VehicleResume';
import VehicleTimeline from '@/components/vehicle/detail/VehicleTimeline';
import VehicleDetails from '@/components/vehicle/detail/VehicleDetails';
import VehicleDocuments from '@/components/vehicle/detail/VehicleDocuments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useRouteParams } from '@/hooks/useNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { TransactionsProvider } from '@/components/vehicle/detail/transactions/TransactionsContext';
import DashboardLayout from '@/components/DashboardLayout';
import { useI18n } from '@/hooks/useI18n';
import { useTranslation } from 'react-i18next';
import posthog from '@/utils/posthog';

const VehiculoDetalle = () => {
  const { tCommon } = useI18n();
  const { t: tVehicleDetails } = useTranslation('vehicleDetails');
  const { id } = useRouteParams<{ id: string }>('/vehiculo/:id');
  const { clientId, user } = useAuth();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumen');

  const fetchVehicleData = async () => {
    try {
      if (!id) return;

      const { data, error } = await supabase
        .from('vehicles')
        .select(
          '*, brand:brand_id(name), model:model_id(name), color:color_id(name), condition:condition_id(name), fuel_type:fuel_type_id(name), category:category_id(name), status:status_id(name,color)'
        )
        .eq('id', parseInt(id))
        .eq('client_id', clientId)
        .single();

      if (error) {
        console.error('Error fetching vehicle data:', error);
        return;
      }

      setVehicle(data);
    } catch (error) {
      console.error('Error in fetchVehicleData:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleUpdate = async () => {
    await fetchVehicleData();
  };

  // Track vehicle detail view on mount
  const hasTrackedView = useState(false);
  useEffect(() => {
    if (clientId && id) {
      fetchVehicleData();
    }
  }, [id, clientId]);

  useEffect(() => {
    if (vehicle && id && !hasTrackedView[0]) {
      hasTrackedView[1](true);
      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'vehicle_detail_viewed',
        properties: {
          vehicle_id: parseInt(id),
        },
      });
    }
  }, [vehicle, id, user]);

  // URL hash sync
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['resumen', 'timeline', 'details', 'documents', 'instagram'];
    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'vehicle_detail_tab_switched',
      properties: {
        tab_name: tab,
        vehicle_id: id ? parseInt(id) : undefined,
      },
    });
  };

  const tabItems = [
    { value: 'resumen', label: tCommon('vehicles.detail.tabs.resume') },
    { value: 'timeline', label: tCommon('vehicles.detail.tabs.timeline') },
    { value: 'details', label: tCommon('vehicles.detail.tabs.details') },
    { value: 'documents', label: tCommon('vehicles.detail.tabs.documents') },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <main className="flex flex-col h-full bg-[#f5f5f7]">
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
            <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-2 sm:pb-3 animate-pulse space-y-2">
              <div className='h-4 bg-slate-200 rounded w-40'></div>
              <div className='flex justify-between items-center'>
                <div className='h-7 bg-slate-200 rounded w-56'></div>
                <div className='flex items-center gap-2'>
                  <div className='h-9 w-48 bg-slate-100 rounded-xl'></div>
                  <div className='h-9 w-24 bg-slate-200 rounded-xl'></div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 animate-pulse">
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='h-[260px] sm:h-[320px] bg-slate-100 rounded-2xl'></div>
              <div className='space-y-4'>
                <div className='bg-white rounded-2xl border border-slate-200/60 p-4 space-y-3'>
                  <div className='flex items-center gap-2.5'>
                    <div className='h-8 w-8 bg-slate-100 rounded-xl'></div>
                    <div className='h-5 bg-slate-100 rounded w-32'></div>
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    {[1,2,3,4].map(i => (
                      <div key={i} className='space-y-1.5'>
                        <div className='h-3 bg-slate-100 rounded w-16'></div>
                        <div className='h-4 bg-slate-100 rounded w-20'></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className='bg-white rounded-2xl border border-slate-200/60 p-4 space-y-3'>
                  <div className='flex items-center gap-2.5'>
                    <div className='h-8 w-8 bg-slate-100 rounded-xl'></div>
                    <div className='h-5 bg-slate-100 rounded w-24'></div>
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    {[1,2].map(i => (
                      <div key={i} className='space-y-1.5'>
                        <div className='h-3 bg-slate-100 rounded w-20'></div>
                        <div className='h-5 bg-slate-100 rounded w-24'></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (!vehicle) {
    return (
      <DashboardLayout>
        <main className="flex flex-col h-full bg-[#f5f5f7]">
          <div className='flex-1 flex items-center justify-center'>
            <div className='text-center py-10'>
              <h2 className='text-lg sm:text-2xl font-semibold text-slate-900'>
                {tVehicleDetails('notFoundTitle')}
              </h2>
              <p className='text-slate-500 text-sm mt-2'>
                {tVehicleDetails('notFoundDescription')}
              </p>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TransactionsProvider vehicle={vehicle}>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <main className="flex flex-col h-full bg-[#f5f5f7]">
            {/* Sticky Header — frosted glass + tabs integrated */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
              <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-2 sm:pb-3">
                <div data-tour='vehicle-header'>
                  <VehicleDetailHeader vehicle={vehicle}>
                    <div data-tour='vehicle-tabs' className="overflow-x-auto scrollbar-none min-w-0">
                      <TabsList className="bg-slate-100/80 rounded-xl p-1 h-auto inline-flex">
                        {tabItems.map((tab) => (
                          <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="text-[13px] font-medium px-3 sm:px-4 py-1.5 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 text-slate-500 transition-all whitespace-nowrap"
                          >
                            {tab.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                  </VehicleDetailHeader>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto relative z-0 px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <TabsContent value='resumen' className='mt-0'>
                <VehicleResume vehicle={vehicle} onUpdate={handleVehicleUpdate} />
              </TabsContent>

              <TabsContent value='timeline' className='mt-0'>
                <VehicleTimeline vehicle={vehicle} />
              </TabsContent>

              <TabsContent value='details' className='mt-0'>
                <VehicleDetails vehicle={vehicle} />
              </TabsContent>

              <TabsContent value='documents' className='mt-0'>
                <VehicleDocuments vehicleId={vehicle.id} vehicle={vehicle} />
              </TabsContent>

            </div>
          </main>
        </Tabs>
      </TransactionsProvider>
    </DashboardLayout>
  );
};

export default VehiculoDetalle;
