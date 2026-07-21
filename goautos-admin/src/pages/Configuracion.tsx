'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Building2, Settings, Bell, Plus, Wallet, Code2, Receipt } from 'lucide-react';

import { DealershipsConfig } from '@/components/configuration/dealerships/DealershipsConfig';
import GeneralConfig from '@/components/configuration/general/GeneralConfig';
import PushNotificationsConfig from '@/components/configuration/messaging/PushNotificationsConfig';
import NotificationPreferencesConfig from '@/components/configuration/messaging/NotificationPreferencesConfig';
import DevelopersConfig from '@/components/configuration/developers/DevelopersConfig';
import { FiscalConfig } from '@/components/configuration/fiscal/FiscalConfig';
import FixedMonthlyExpensesManager from '@/components/admin/FixedMonthlyExpensesManager';
import UnattributedExpensesManager from '@/components/admin/UnattributedExpensesManager';
import { useTranslation } from 'react-i18next';
import posthog from '@/utils/posthog';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

type Section = 'general' | 'dealerships' | 'gastos' | 'contabilidad' | 'notifications' | 'developers';

type TabConfig = {
  value: Section;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const STORAGE_KEY = 'config.selectedTab';

function getHashTab(): Section | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.hash.match(/tab=([a-z-]+)/i);
  return (m?.[1] as Section) ?? null;
}

function setHashTab(tab: Section) {
  if (typeof window === 'undefined') return;
  const base = window.location.href.split('#')[0];
  window.history.replaceState(null, '', `${base}#tab=${tab}`);
}

export default function ConfiguracionPage() {
  const { t } = useTranslation('common');
  const { userId } = useAuth();

  const tabs: TabConfig[] = [
    { value: 'general', label: t('configuration.company.general.title'), Icon: Settings },
    { value: 'dealerships', label: t('configuration.company.dealerships.title'), Icon: Building2 },
    { value: 'gastos', label: 'Gastos fijos', Icon: Wallet },
    { value: 'contabilidad', label: 'Contabilidad', Icon: Receipt },
    { value: 'notifications', label: 'Notificaciones', Icon: Bell },
    { value: 'developers', label: 'Desarrolladores', Icon: Code2 },
  ];

  const [activeTab, setActiveTab] = useState<Section>(() => {
    if (typeof window === 'undefined') return 'general';
    const hash = getHashTab();
    // Handle legacy hash values that no longer exist
    if (hash && ['vehicles', 'checklist', 'equipo', 'legal-info'].includes(hash)) return 'general';
    return hash || (localStorage.getItem(STORAGE_KEY) as Section) || 'general';
  });

  const [createDealershipOpen, setCreateDealershipOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, activeTab);
    setHashTab(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const onHash = () => {
      const h = getHashTab();
      if (h) setActiveTab(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <DashboardLayout>
      <main className="flex flex-col h-full bg-white">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => {
                      posthog.capture({
                        distinctId: userId || 'anonymous',
                        event: 'settings_tab_switched',
                        properties: { tab_name: tab.value },
                      });
                      setActiveTab(tab.value);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                        : 'hover:bg-slate-200/60 text-slate-600'
                    }`}
                  >
                    <tab.Icon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            {activeTab === 'dealerships' && (
              <Button
                className='h-9 rounded-xl text-[13px] font-medium shrink-0'
                onClick={() => setCreateDealershipOpen(true)}
              >
                <Plus className='h-4 w-4 mr-2' />
                {t('configuration.dealerships.newButton')}
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto relative z-0">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            {activeTab === 'general' && <GeneralConfig />}
            {activeTab === 'dealerships' && (
              <DealershipsConfig
                createDialogOpen={createDealershipOpen}
                onCreateDialogOpenChange={setCreateDealershipOpen}
              />
            )}
            {activeTab === 'gastos' && (
              <div className="space-y-6">
                <FixedMonthlyExpensesManager />
                <UnattributedExpensesManager />
              </div>
            )}
            {activeTab === 'contabilidad' && <FiscalConfig />}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <PushNotificationsConfig />
                <NotificationPreferencesConfig />
              </div>
            )}
            {activeTab === 'developers' && <DevelopersConfig />}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
