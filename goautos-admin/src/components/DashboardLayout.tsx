import React, { useEffect, useState } from 'react';
import SidebarNav from './SidebarNav';
import MobileBottomNav from './mobile/MobileBottomNav';
import NotificationBell from '@/components/notifications/NotificationBell';
import TopBar from '@/components/TopBar';
import { useSidebar } from '@/contexts/SidebarContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';

const ROUTE_TITLES: Record<string, { es: string; en: string }> = {
  '/': { es: 'Panel de Control', en: 'Dashboard' },
  '/vehiculos': { es: 'Vehículos', en: 'Vehicles' },
  '/tasador': { es: 'Tasador', en: 'Appraiser' },
  '/solicitudes': { es: 'Solicitudes', en: 'Requests' },
  '/leads': { es: 'Leads', en: 'Leads' },
  '/ventas': { es: 'Ventas', en: 'Sales' },
  '/clientes': { es: 'Clientes', en: 'Clients' },
  '/financiamiento': { es: 'Financiamiento', en: 'Financing' },
  '/alertas-inteligentes': { es: 'Alertas', en: 'Alerts' },
  '/tareas': { es: 'Tareas', en: 'Tasks' },
  '/calendario': { es: 'Calendario', en: 'Calendar' },
  '/marketing': { es: 'Marketing', en: 'Marketing' },
  '/instagram': { es: 'Instagram', en: 'Instagram' },
  '/mercadolibre': { es: 'Mercadolibre', en: 'Mercadolibre' },
  '/facebook-marketplace': { es: 'Facebook', en: 'Facebook' },
  '/chileautos': { es: 'ChileAutos', en: 'ChileAutos' },
  '/configuracion': { es: 'Configuración', en: 'Settings' },
  '/equipo': { es: 'Equipo', en: 'Team' },
  '/builder': { es: 'Builder', en: 'Builder' },
  '/documentos': { es: 'Documentos', en: 'Documents' },
};

type DashboardLayoutProps = {
  children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { collapsed } = useSidebar();
  const { hasPermission } = usePermissions();
  const showNotifications = hasPermission(PermissionCode.NOTIFICATIONS_VIEW);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [ready, setReady] = useState(false);
  const [location, navigate] = useLocation();
  const [pageKey, setPageKey] = useState(location);
  const { i18n } = useTranslation();
  const isEs = i18n.language?.toLowerCase().startsWith('es');

  const getPageTitle = () => {
    const basePath = '/' + (location.split('/')[1] || '');
    const entry = ROUTE_TITLES[basePath];
    if (entry) return isEs ? entry.es : entry.en;
    return '';
  };

  useEffect(() => {
    setReady(true);
    document.documentElement.classList.add('app-shell');

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      document.documentElement.classList.remove('app-shell');
    };
  }, []);

  useEffect(() => {
    setPageKey(location);
  }, [location]);

  return (
    <div className='h-dvh overflow-hidden bg-[#f5f5f7]'>
      <SidebarNav />
      {!isMobile && <TopBar />}
      <div
        className={`relative ${ready ? 'transition-[margin] duration-500 ease-in-out' : ''} ${
          !isMobile ? (collapsed ? 'ml-[70px]' : 'ml-64') : ''
        }`}
        style={{ height: isMobile ? 'calc(100% - env(safe-area-inset-bottom, 0px) - 64px)' : '100%' }}
      >
        {/* Mobile header — only on dashboard (home) */}
        {isMobile && location === '/' && (
          <div className='flex items-center justify-between px-4 pt-3 pb-1'>
            <div className='flex items-center gap-2'>
              <img
                src='/pwa-icons/icon-192x192.png'
                alt='GoAuto'
                className='h-7 w-7 rounded-lg cursor-pointer'
                onClick={() => navigate('/')}
              />
              <h1 className='text-lg font-bold text-slate-900'>{getPageTitle()}</h1>
            </div>
            {showNotifications && <NotificationBell variant='mobile' />}
          </div>
        )}

        <main
          key={pageKey}
          className={`w-full overflow-auto animate-page-enter h-full ${!isMobile ? 'pt-14' : ''}`}
        >
          {children}
        </main>
      </div>

      {isMobile && <MobileBottomNav />}
    </div>
  );
};

export default DashboardLayout;
