import React, { useRef, useState, useCallback } from 'react';
import type { DocTabNavProps } from '@/pages/Documentos';
import { DocumentTemplatesConfig } from '@/components/configuration/document-templates/DocumentTemplatesConfig';
import type { DocumentTemplatesConfigHandle } from '@/components/configuration/document-templates/DocumentTemplatesConfig';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useDealerships } from '@/hooks/useDealerships';

const DocumentTemplatesTab = ({ tabNav }: { tabNav: DocTabNavProps }) => {
  const { t } = useTranslation('common');
  const configRef = useRef<DocumentTemplatesConfigHandle>(null);
  const [selectedDealershipId, setSelectedDealershipId] = useState<string | null>(null);
  const { dealerships } = useDealerships();

  const handleSave = useCallback(() => {
    if (configRef.current) {
      configRef.current.save();
    }
  }, []);

  return (
    <>
      {/* Sticky header — pills + dealership selector + save button */}
      <div className="sticky top-0 z-10 bg-[#f5f5f7] border-b border-slate-300">
        <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-nowrap gap-2 overflow-x-auto hide-scrollbar flex-1">
              {tabNav.tabs.map((tab) => {
                const isActive = tabNav.activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => tabNav.setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                        : 'hover:bg-slate-200/60 text-slate-600'
                    }`}
                  >
                    <TabIcon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {dealerships.length > 0 && (
              <Select
                value={selectedDealershipId || '_none'}
                onValueChange={(value) => setSelectedDealershipId(value === '_none' ? null : value)}
              >
                <SelectTrigger className="w-auto min-w-[160px] rounded-xl h-9 text-[13px] border-slate-200/60 bg-white shrink-0 text-slate-500 [&>svg]:text-slate-400">
                  <SelectValue placeholder={t('configuration.documents.selectDealership')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">{t('configuration.documents.generalLegalInfo')}</SelectItem>
                  {dealerships.map((dealership) => (
                    <SelectItem key={dealership.id} value={String(dealership.id)}>
                      {dealership.address || `Sucursal ${dealership.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              onClick={handleSave}
              disabled={configRef.current?.saving}
              className="rounded-xl h-9 text-[13px] px-3.5 shrink-0"
            >
              {configRef.current?.saving ? t('actions.saving') : t('configuration.documents.saveButton')}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="space-y-6">
          <DocumentTemplatesConfig ref={configRef} selectedDealershipId={selectedDealershipId} />
        </div>
      </div>
    </>
  );
};

export default DocumentTemplatesTab;
