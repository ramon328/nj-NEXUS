import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from 'react-i18next';
import DocumentTemplatesTab from '@/components/documents/tabs/DocumentTemplatesTab';
import VehicleDocumentsTab from '@/components/documents/tabs/VehicleDocumentsTab';
import AdditionalDocumentsTab from '@/components/documents/tabs/AdditionalDocumentsTab';
import { LuFileText, LuLayoutTemplate, LuFolderPlus } from 'react-icons/lu';

export type DocTabType = 'vehicle-docs' | 'templates' | 'additional-docs';

export interface DocTab {
  id: DocTabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface DocTabNavProps {
  tabs: DocTab[];
  activeTab: DocTabType;
  setActiveTab: (tab: DocTabType) => void;
}

const Documentos = () => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<DocTabType>('vehicle-docs');

  const tabs: DocTab[] = [
    { id: 'vehicle-docs', label: 'Documentos', icon: LuFileText },
    { id: 'additional-docs', label: 'Adicionales', icon: LuFolderPlus },
    { id: 'templates', label: 'Plantillas', icon: LuLayoutTemplate },
  ];

  const tabNavProps: DocTabNavProps = { tabs, activeTab, setActiveTab };

  return (
    <DashboardLayout>
      <main className="flex flex-col h-full bg-[#f5f5f7]">
        {activeTab === 'vehicle-docs' && <VehicleDocumentsTab tabNav={tabNavProps} />}
        {activeTab === 'templates' && <DocumentTemplatesTab tabNav={tabNavProps} />}
        {activeTab === 'additional-docs' && <AdditionalDocumentsTab tabNav={tabNavProps} />}
      </main>
    </DashboardLayout>
  );
};

export default Documentos;
