import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VehicleStatesConfig } from './VehicleStatesConfig';
import { VehiclesPageConfig } from './VehiclesPageConfig';
import { VehicleDocsConfig } from './VehicleDocsConfig';
import { Workflow, Settings2, Shield } from 'lucide-react';

type VehiclesConfigTab = 'states' | 'page' | 'docs';

export const VehiclesConfig = () => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<VehiclesConfigTab>('states');

  return (
    <div className='space-y-6'>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as VehiclesConfigTab)}>
        <TabsList className='inline-flex bg-slate-100 rounded-xl p-1 gap-0.5'>
          <TabsTrigger value='states' className='flex items-center gap-2 rounded-lg text-[13px] font-medium px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500'>
            <Workflow className='h-4 w-4' />
            {t('configuration.vehicles.tabs.states')}
          </TabsTrigger>
          <TabsTrigger value='page' className='flex items-center gap-2 rounded-lg text-[13px] font-medium px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500'>
            <Settings2 className='h-4 w-4' />
            {t('configuration.vehicles.tabs.page')}
          </TabsTrigger>
          <TabsTrigger value='docs' className='flex items-center gap-2 rounded-lg text-[13px] font-medium px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-500'>
            <Shield className='h-4 w-4' />
            Documentación
          </TabsTrigger>
        </TabsList>

        <TabsContent value='states' className='mt-6'>
          <VehicleStatesConfig />
        </TabsContent>

        <TabsContent value='page' className='mt-6'>
          <VehiclesPageConfig />
        </TabsContent>

        <TabsContent value='docs' className='mt-6'>
          <VehicleDocsConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VehiclesConfig;
