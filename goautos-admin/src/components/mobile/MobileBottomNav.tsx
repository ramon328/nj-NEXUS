import { useLocation } from 'wouter';
import { useI18n } from '@/hooks/useI18n';
import { usePendingLeadsCount } from '@/hooks/usePendingLeadsCount';
import { useSidebar } from '@/contexts/SidebarContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import {
  LuLayoutDashboard,
  LuCar,
  LuMailPlus,
} from 'react-icons/lu';
import { MoreHorizontal } from 'lucide-react';
import LottieImport from 'lottie-react';
const Lottie = (typeof LottieImport === 'object' && 'default' in LottieImport) ? (LottieImport as any).default : LottieImport;
import aiAnimation from '@/assets/ai-animation.json';

interface Tab {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  badge?: number;
  exact?: boolean;
  permission?: PermissionCode;
}

export default function MobileBottomNav() {
  const [location, navigate] = useLocation();
  const { tNav } = useI18n();
  const { setMobileSheetOpen } = useSidebar();
  const { hasPermission } = usePermissions();
  const showAssistant = hasPermission(PermissionCode.AI_ASSISTANT_VIEW);
  const pendingLeads = usePendingLeadsCount();

  const allTabs: Tab[] = [
    {
      key: 'dashboard',
      href: '/',
      icon: LuLayoutDashboard,
      labelKey: 'sidebar.dashboard',
      exact: true,
    },
    {
      key: 'vehicles',
      href: '/vehiculos',
      icon: LuCar,
      labelKey: 'sidebar.vehicles',
      permission: PermissionCode.VEHICLES_VIEW,
    },
    {
      key: 'leads',
      href: '/leads',
      icon: LuMailPlus,
      labelKey: 'sidebar.leads',
      badge: pendingLeads,
      permission: PermissionCode.LEADS_VIEW,
    },
  ];

  const visibleTabs = allTabs.filter(t => !t.permission || hasPermission(t.permission));

  const isActive = (tab: Tab) => {
    if (tab.exact) return location === tab.href;
    return location.startsWith(tab.href);
  };

  const renderTab = (tab: Tab) => {
    const Icon = tab.icon;
    const active = isActive(tab);
    return (
      <button
        key={tab.key}
        onClick={() => navigate(tab.href)}
        className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 transition-colors ${
          active ? 'text-primary' : 'text-slate-400'
        }`}
      >
        <div className="relative">
          <Icon className="h-5 w-5 shrink-0" />
          {tab.badge > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
              {tab.badge > 99 ? '99+' : tab.badge}
            </span>
          )}
        </div>
        <span className="text-[10px] font-medium leading-tight">
          {tNav(tab.labelKey)}
        </span>
      </button>
    );
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/80 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <div className="flex items-end justify-around">
        {/* Left tabs — first half */}
        {visibleTabs.slice(0, Math.ceil(visibleTabs.length / 2)).map(renderTab)}

        {/* AI Assistant — center button (solo si tiene permiso) */}
        {showAssistant && (
          <button
            onClick={() => navigate('/asistente')}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 px-1 transition-colors"
          >
            <div className="relative flex items-center justify-center w-12 h-12 -mt-6">
              {/* Orbital ring — visible only when active */}
              {location === '/asistente' && (
                <div
                  className="absolute inset-[-4px] animate-spin"
                  style={{ animationDuration: '10s' }}
                >
                  <div className="w-full h-full rounded-full" style={{
                    background: 'conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(6,182,212,0.35) 78%, transparent 100%)',
                    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                  }} />
                </div>
              )}
              <div className="w-full h-full rounded-full bg-white border border-slate-200/80 flex items-center justify-center">
                <Lottie animationData={aiAnimation} loop className="w-10 h-10" />
              </div>
            </div>
            <span className="text-[10px] font-medium leading-tight text-slate-400 mt-1">
              GAIA
            </span>
          </button>
        )}

        {/* Right tabs — second half */}
        {visibleTabs.slice(Math.ceil(visibleTabs.length / 2)).map(renderTab)}

        {/* Tab "Más" — opens the Sheet drawer */}
        <button
          onClick={() => setMobileSheetOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 text-slate-400 transition-colors"
        >
          <MoreHorizontal className="h-5 w-5 shrink-0" />
          <span className="text-[10px] font-medium leading-tight">
            {tNav('sidebar.more') || 'Más'}
          </span>
        </button>
      </div>
    </div>
  );
}
