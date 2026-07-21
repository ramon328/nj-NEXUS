// components/SidebarNav.tsx
import { useSidebar } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';

import { SidebarNavItems } from './sidebar/SidebarNavItems';
import { Drawer, DrawerContentRight } from './ui/drawer';
import { useEffect, useState, useCallback, memo } from 'react';

import { Button } from './ui/button';
import { Icon } from '@iconify/react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { useLocation } from 'wouter';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { usePendingLeadsCount } from '@/hooks/usePendingLeadsCount';
import { usePendingSalesCount } from '@/hooks/usePendingSalesCount';
import {
  LuUsers,
  LuFileText,
  LuCreditCard,
  LuScale,
  LuMegaphone,
  LuInstagram,
  LuStore,
  LuShoppingBag,
  LuGlobe,
  LuSettings2,
  LuWrench,
  LuZap,
  LuReceipt,
  LuCalendar,
  LuCalendarDays,
  LuSearch,
  LuBell,
  LuSparkles,
  LuClipboardCheck,
} from 'react-icons/lu';
import React from 'react';

interface DesktopSidebarContentProps {
  className?: string;
  collapsed: boolean;
  toggleSidebar: () => void;
  handleLogout: () => void;
  user: any;
  getUserInitials: () => string;
}

interface MobileSidebarContentProps {
  setIsOpen: (open: boolean) => void;
  user: any;
  getUserInitials: () => string;
  handleLogout: () => void;
}

const DesktopSidebarContent = memo(
  ({
    className,
    collapsed,
    toggleSidebar,
    handleLogout,
    user,
    getUserInitials,
  }: DesktopSidebarContentProps) => {
    const { tNav } = useI18n();

    return (
      <div
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200/80 bg-white transition-all duration-500 ease-in-out',
          collapsed ? 'w-[70px] px-1' : 'w-64 px-3',
          collapsed && 'sm:py-0.5 md:py-1 lg:py-1.5 xl:py-2',
          className
        )}
      >
        {/* Header con logo y botón de menú */}
        <div
          className={cn(
            'flex items-center justify-between px-5',
            collapsed
              ? 'mb-2 min-h-[60px] sm:min-h-[30px] md:min-h-[35px] lg:min-h-[40px] xl:min-h-[50px] mt-4'
              : 'mb-4 min-h-[70px] mt-4',
            'sm:px-2 md:px-3 lg:px-4 xl:px-5'
          )}
        >
          {!collapsed ? (
            <div className='flex items-center justify-between w-full'>
              <img
                src='/goauto-logo-negro.png'
                alt='GoAuto Logo'
                className='h-16'
              />
              <Button
                variant='ghost'
                size='sm'
                className='h-12 w-16 p-0 rounded-lg flex items-center justify-center hover:bg-gray-200 hover:text-gray-700 transition-all duration-500 ease-in-out ml-4'
                onClick={toggleSidebar}
              >
                <Icon
                  icon={
                    collapsed
                      ? 'eva:arrow-ios-forward-outline'
                      : 'eva:arrow-ios-back-outline'
                  }
                  className='h-6 w-6 text-gray-500'
                  width={48}
                  height={48}
                />
              </Button>
            </div>
          ) : (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-12 w-12 p-0 rounded-xl mx-auto flex items-center justify-center hover:bg-gray-200 hover:text-gray-700 transition-all duration-500 ease-in-out sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-9 lg:w-9 xl:h-10 xl:w-10'
                    onClick={toggleSidebar}
                  >
                    <Icon
                      icon={
                        collapsed
                          ? 'eva:arrow-ios-forward-outline'
                          : 'eva:arrow-ios-back-outline'
                      }
                      className='h-6 w-6 text-gray-500 sm:w-[20px] sm:h-[20px] md:w-[22px] md:h-[22px] lg:w-[24px] lg:h-[24px] xl:w-[28px] xl:h-[28px]'
                      width='30'
                      height='30'
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side='right'
                  className='bg-white border border-gray-200 text-xs px-3 py-1.5 shadow-md rounded-md z-50'
                >
                  <div className='flex items-center gap-1.5'>
                    <span className='text-gray-800'>
                      {tNav('sidebar.expandMenu')}
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Línea divisoria */}
        <div
          className={cn(
            'h-[1px] bg-gray-200 mx-3',
            collapsed ? 'mb-4 sm:mb-3 md:mb-3.5 lg:mb-4 xl:mb-4' : 'mb-4',
            'sm:mx-1 md:mx-1.5 lg:mx-2 xl:mx-3'
          )}
        />

        {/* Navegación */}
        <div
          className={cn(
            'flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200',
            collapsed && 'sm:py-0.5 md:py-0.5 lg:py-1 xl:py-1'
          )}
        >
          <nav className={cn('pt-0', collapsed ? 'px-0' : 'px-1')}>
            <SidebarNavItems collapsed={collapsed} />
          </nav>
        </div>

        {/* User profile + Logout */}
        <div
          className={cn(
            'mt-auto mb-2 pt-2 pb-3',
            collapsed &&
              'sm:pt-1 sm:pb-1 md:pt-1 md:pb-1.5 lg:pt-1.5 lg:pb-2 xl:pt-2 xl:pb-2.5'
          )}
        >
          {!collapsed && user && (
            <div className='flex items-center gap-2.5 mx-3 mb-2'>
              <Avatar className='h-8 w-8 border border-slate-200 shrink-0'>
                <AvatarFallback className='bg-sky-50 text-sky-600 font-medium text-xs'>
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className='flex flex-col min-w-0'>
                <p className='text-[13px] font-medium text-slate-700 leading-none truncate'>
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || ''}
                </p>
                <p className='text-[11px] text-slate-400 leading-none mt-1 truncate'>
                  {user.email || ''}
                </p>
              </div>
            </div>
          )}
          {collapsed ? (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className='flex items-center justify-center h-10 w-10 mx-auto rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-all duration-500 ease-in-out sm:h-5 sm:w-5 md:h-6 md:w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8'
                  >
                    <LogOut className='h-5 w-5 rotate-180 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 lg:h-4 lg:w-4 xl:h-5 xl:w-5' />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side='right'
                  className='bg-white border border-gray-200 text-xs px-3 py-1.5 shadow-md rounded-md z-50'
                >
                  <div className='flex items-center gap-1.5'>
                    <span className='text-gray-800'>
                      {tNav('sidebar.logout')}
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <button
              onClick={handleLogout}
              className='flex items-center gap-3 px-4 py-2.5 w-full mb-2 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-500'
            >
              <LogOut className='h-5 w-5' />
              <span>{tNav('sidebar.logout')}</span>
            </button>
          )}
        </div>
      </div>
    );
  }
);

interface MobileNavLink {
  icon: React.ElementType;
  label: string;
  path: string;
  permission?: PermissionCode;
  badge?: number;
}

interface MobileNavSection {
  title: string;
  items: MobileNavLink[];
}

const MobileSidebarContent = memo(
  ({
    setIsOpen,
    user,
    getUserInitials,
    handleLogout,
  }: MobileSidebarContentProps) => {
    const { tNav } = useI18n();
    const [location, navigate] = useLocation();
    const { userRole, client, isTenantOverride } = useAuth();
    const { hasPermission, isSuperadmin } = usePermissions();
    const pendingLeadsCount = usePendingLeadsCount();
    const pendingSalesCount = usePendingSalesCount();
    const effectiveRole = userRole === 'superadmin' && isTenantOverride ? 'admin' : userRole;

    const handleNavigate = useCallback(
      (path: string) => {
        navigate(path);
        setIsOpen(false);
      },
      [navigate, setIsOpen]
    );

    // Items NOT in the bottom nav (bottom nav has: /, /vehiculos, /leads, /ventas)
    const sections: MobileNavSection[] = React.useMemo(() => {
      if (effectiveRole === 'superadmin') {
        return [
          {
            title: tNav('groups.main'),
            items: [
              { icon: LuUsers, label: tNav('sidebar.clients'), path: '/clientes' },
              { icon: LuUsers, label: tNav('sidebar.people'), path: '/personas' },
              { icon: LuClipboardCheck, label: tNav('sidebar.tasks'), path: '/tareas' },
              { icon: LuCalendarDays, label: tNav('sidebar.calendar'), path: '/calendario', permission: PermissionCode.SCHEDULING_VIEW },
              { icon: LuZap, label: tNav('sidebar.updates'), path: '/novedades' },
              { icon: LuSettings2, label: tNav('sidebar.configuration'), path: '/configuracion' },
            ],
          },
        ];
      }

      const managementItems: MobileNavLink[] = [
        { icon: LuReceipt, label: tNav('sidebar.sales'), path: '/ventas', permission: PermissionCode.SALES_VIEW },
        { icon: LuUsers, label: tNav('sidebar.clients'), path: '/clientes', permission: PermissionCode.CLIENTS_VIEW },
        { icon: LuFileText, label: tNav('sidebar.documents'), path: '/documentos', permission: PermissionCode.DOCUMENTS_VIEW },
        { icon: LuCreditCard, label: tNav('sidebar.financing'), path: '/financiamiento', permission: PermissionCode.FINANCING_VIEW },
        { icon: LuScale, label: tNav('sidebar.appraiser'), path: '/tasador', permission: PermissionCode.APPRAISER_VIEW },
      ];

      const operationsItems: MobileNavLink[] = [
        { icon: LuClipboardCheck, label: tNav('sidebar.tasks'), path: '/tareas', permission: PermissionCode.TASKS_VIEW },
        { icon: LuCalendarDays, label: tNav('sidebar.calendar'), path: '/calendario', permission: PermissionCode.SCHEDULING_VIEW },
        { icon: LuSearch, label: tNav('sidebar.requests'), path: '/solicitudes', permission: PermissionCode.VEHICLE_REQUESTS_VIEW },
        { icon: LuBell, label: tNav('sidebar.notifications'), path: '/notificaciones', permission: PermissionCode.NOTIFICATIONS_VIEW },
      ];

      const socialItems: MobileNavLink[] = [
        { icon: LuMegaphone, label: tNav('sidebar.marketing'), path: '/marketing', permission: PermissionCode.MARKETING_VIEW },
        { icon: LuSparkles, label: tNav('sidebar.smartAlerts'), path: '/alertas-inteligentes', permission: PermissionCode.MARKETING_VIEW },
        { icon: LuInstagram, label: tNav('sidebar.instagram'), path: '/instagram', permission: PermissionCode.INSTAGRAM_VIEW },
        { icon: LuStore, label: tNav('sidebar.mercadolibre'), path: '/mercadolibre', permission: PermissionCode.MERCADOLIBRE_VIEW },
        { icon: LuShoppingBag, label: tNav('sidebar.facebookMarketplace'), path: '/facebook-marketplace', permission: PermissionCode.FACEBOOK_VIEW },
        { icon: LuGlobe, label: tNav('sidebar.chileautos'), path: '/chileautos', permission: PermissionCode.CHILEAUTOS_VIEW },
      ];

      const configItems: MobileNavLink[] = [
        { icon: LuSettings2, label: tNav('sidebar.generalConfiguration'), path: '/configuracion', permission: PermissionCode.CONFIGURATION_VIEW },
        { icon: LuUsers, label: tNav('sidebar.team'), path: '/equipo', permission: PermissionCode.TEAM_VIEW },
        { icon: LuWrench, label: tNav('sidebar.builder'), path: '/builder', permission: PermissionCode.BUILDER_VIEW },
        { icon: LuZap, label: tNav('sidebar.updates'), path: '/novedades', permission: PermissionCode.UPDATES_VIEW },
      ];

      return [
        { title: tNav('groups.management'), items: managementItems },
        { title: tNav('groups.operations'), items: operationsItems },
        { title: tNav('groups.social'), items: socialItems },
        { title: tNav('groups.configuration'), items: configItems },
      ];
    }, [effectiveRole, tNav, pendingLeadsCount, pendingSalesCount]);

    // Filter by permissions
    const filteredSections = React.useMemo(
      () =>
        sections
          .map((s) => ({
            ...s,
            items: s.items.filter(
              (item) => isSuperadmin || !item.permission || hasPermission(item.permission)
            ),
          }))
          .filter((s) => s.items.length > 0),
      [sections, isSuperadmin, hasPermission]
    );

    return (
      <div className='bg-white flex flex-col h-full relative'>
        {/* Header — logo + close */}
        <div className='flex items-center justify-between pl-1 pr-3 py-2'>
          <img
            src='/goauto-logo-negro.png'
            alt='GoAuto Logo'
            className='h-16'
          />
          <button
            onClick={() => setIsOpen(false)}
            className='h-9 w-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors'
          >
            <ChevronRight className='h-5 w-5' />
          </button>
        </div>

        <div className='h-[1px] bg-slate-100 mx-4' />

        {/* Scrollable content */}
        <div className='flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-5'>
          {filteredSections.map((section) => (
            <div key={section.title}>
              <p className='text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1'>
                {section.title}
              </p>
              <div className='grid grid-cols-3 gap-1.5'>
                {section.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive =
                    location === item.path ||
                    location.startsWith(item.path + '/');
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigate(item.path)}
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-slate-400 hover:bg-slate-50 active:bg-slate-100'
                      )}
                    >
                      <div className='relative'>
                        <ItemIcon className='h-5 w-5' />
                        {item.badge > 0 && (
                          <span className='absolute -top-1 -right-2 min-w-[14px] h-3.5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none'>
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </div>
                      <span className='text-[11px] font-medium leading-tight text-center line-clamp-2'>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer — user + logout */}
        <div
          className='px-4 pt-3 pb-4 border-t border-slate-100'
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
        >
          <div className='flex items-center gap-3 px-3'>
            <Avatar className='h-9 w-9 border border-gray-200 shadow-sm flex-shrink-0'>
              <AvatarFallback className='bg-sky-50 text-sky-600 font-semibold text-xs'>
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className='flex flex-col min-w-0 flex-1'>
              <p className='text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate leading-none'>
                {client?.name || 'Automotora'}
              </p>
              <p className='text-[11px] text-slate-400 truncate leading-none mt-[5px]'>
                {user?.user_metadata?.full_name || user?.email || ''}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className='h-8 w-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors flex-shrink-0'
            >
              <LogOut className='h-4 w-4' />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

const SidebarNav = ({ className }: { className?: string }) => {
  const { collapsed, toggleSidebar, mobileSheetOpen, setMobileSheetOpen } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const { user, signOut } = useAuth();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Error',
        description:
          'Ocurrió un error al cerrar sesión. Por favor, recarga la página.',
        variant: 'destructive',
      });
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
  }, [signOut]);

  const getUserInitials = useCallback(() => {
    if (!user?.email) return 'U';
    if (user.user_metadata?.full_name) {
      const nameParts = user.user_metadata.full_name.split(' ');
      if (nameParts.length >= 2) return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      return nameParts[0][0].toUpperCase();
    }
    const email = user.email;
    const name = email.split('@')[0] || 'Usuario';
    return name.substring(0, 2).toUpperCase();
  }, [user]);

  if (isMobile) {
    return (
      <Drawer direction='right' open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <DrawerContentRight className='p-0 border-0 overflow-hidden'>
          <MobileSidebarContent
            setIsOpen={setMobileSheetOpen}
            user={user}
            getUserInitials={getUserInitials}
            handleLogout={handleLogout}
          />
        </DrawerContentRight>
      </Drawer>
    );
  }

  return (
    <DesktopSidebarContent
      className={className}
      collapsed={collapsed}
      toggleSidebar={toggleSidebar}
      handleLogout={handleLogout}
      user={user}
      getUserInitials={getUserInitials}
    />
  );
};

export default React.memo(SidebarNav);
