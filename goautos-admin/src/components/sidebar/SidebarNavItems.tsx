// sidebar/SidebarNavItems.tsx
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useI18n } from '@/hooks/useI18n';
import { useLocation } from 'wouter';
import { usePendingLeadsCount } from '@/hooks/usePendingLeadsCount';
import { usePendingSalesCount } from '@/hooks/usePendingSalesCount';
import { useVehicleRequests } from '@/hooks/useVehicleRequests';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Lucide (react-icons)
import {
  LuLayoutDashboard,  // Dashboard
  LuCar,              // Vehículos
  LuCarFront,         // Grupo Inventario
  LuScale,            // Tasador
  LuMegaphone,        // Marketing
  LuInstagram,        // Instagram
  LuStore,            // Mercado Libre
  LuShoppingBag,      // Facebook Marketplace
  LuGlobe,            // ChileAutos
  LuMailPlus,         // Leads
  LuUsers,            // Clientes / Equipo
  LuReceipt,          // Ventas
  LuCreditCard,       // Financiamiento
  LuSettings2,        // Configuración
  LuWrench,           // Builder
  LuBriefcase,        // Grupo Comercial
  LuChevronDown,
  LuChevronUp,
  LuChevronRight,     // Indicador de submenú
  LuFileText,         // Documentos
  LuSparkles,         // Asistente IA
  LuCalendar,         // Agendamientos
  LuCalendarDays,     // Calendario
  LuSearch,           // Solicitudes
  LuBell,             // Notificaciones
  LuClipboardCheck,   // Tareas
  LuActivity,         // Admin Metrics
} from 'react-icons/lu';

import { createPortal } from 'react-dom';
import LottieImport from 'lottie-react';
import aiAnimation from '@/assets/ai-animation.json';

// lottie-react puede exportar como { default: Component } en algunos bundlers
const Lottie = (typeof LottieImport === 'object' && 'default' in LottieImport)
  ? (LottieImport as any).default
  : LottieImport;

interface SidebarNavItemsProps { collapsed: boolean; }
interface NavItem { icon?: React.ElementType; label: string; path: string; specialClass?: string; permission?: PermissionCode; badge?: number; }
interface GroupItem {
  group: string;
  groupKey: string;
  icon?: React.ElementType;
  items: NavItem[];
}

/* =========================
   Flyout state + position
========================= */
type FlyKey = string | null;
type FlyRect = { top: number; left: number; width: number; height: number } | null;

const PANEL_MAX_W = 320;
const GAP = 8;
const BRIDGE_W = 18;

function isNode(x: unknown): x is Node {
  return typeof window !== 'undefined' && typeof (window as any).Node !== 'undefined'
    ? x instanceof (window as any).Node
    : false;
}

function useFlyoutPosition() {
  const [anchorRect, setAnchorRect] = useState<FlyRect>(null);
  const [flyKey, setFlyKey] = useState<FlyKey>(null);

  const openFor = useCallback((key: string, el: HTMLElement | null) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchorRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setFlyKey(key);
  }, []);

  const close = useCallback(() => setFlyKey(null), []);

  useEffect(() => {
    const handler = () => {
      if (!flyKey) return;
      const active = document.querySelector<HTMLElement>('[data-fly-anchor="true"][data-fly-active="true"]');
      if (active) {
        const r = active.getBoundingClientRect();
        setAnchorRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [flyKey]);

  return { flyKey, anchorRect, openFor, close, setFlyKey };
}

/* =========================
   Portal del panel (flyout)
========================= */
function FlyoutPortal({
  anchorRect,
  children,
  onMouseEnter,
  onMouseLeave,
  maxWidth = PANEL_MAX_W,
}: {
  anchorRect: FlyRect;
  children: React.ReactNode;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  maxWidth?: number;
}) {
  if (!anchorRect) return null;

  const vw = window.innerWidth;
  let left = Math.round(anchorRect.left + anchorRect.width + GAP);
  const top = Math.round(anchorRect.top);
  const wouldOverflow = left + maxWidth + 8 > vw;
  if (wouldOverflow) {
    left = Math.max(8, Math.round(anchorRect.left - GAP - maxWidth));
  }

  return createPortal(
    <div
      role="menu"
      data-flyout-panel="true"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 1000,
        width: 'max-content',
        maxWidth,
      }}
      className="inline-block rounded-lg border border-slate-200 bg-white shadow-lg p-1 will-change-transform w-max"
    >
      <div className="max-h-[60vh] overflow-auto">
        {children}
      </div>
    </div>,
    document.body
  );
}

/* =========================
   Bridge invisible (para cruzar)
========================= */
function BridgePortal({
  anchorRect,
  panelMaxWidth = PANEL_MAX_W,
}: {
  anchorRect: FlyRect;
  panelMaxWidth?: number;
}) {
  if (!anchorRect) return null;
  const vw = window.innerWidth;
  const toRightLeft = Math.round(anchorRect.left + anchorRect.width + GAP);
  const wouldOverflow = toRightLeft + panelMaxWidth + 8 > vw;
  const side: 'right' | 'left' = wouldOverflow ? 'left' : 'right';

  const top = Math.round(anchorRect.top);
  const height = Math.max(44, Math.round(anchorRect.height));
  const left = side === 'right'
    ? Math.round(anchorRect.left + anchorRect.width)
    : Math.round(anchorRect.left - BRIDGE_W);

  return createPortal(
    <div
      data-flyout-bridge="true"
      style={{
        position: 'fixed',
        top,
        left,
        width: BRIDGE_W,
        height,
        zIndex: 999,
      }}
    />,
    document.body
  );
}

/* ====================================================== */

export const SidebarNavItems = ({ collapsed }: SidebarNavItemsProps) => {
  const [location, navigate] = useLocation();
  const currentPath = location;
  const { userRole, isTenantOverride } = useAuth();
  // When superadmin has a tenant selected, behave like admin for navigation
  const effectiveRole = userRole === 'superadmin' && isTenantOverride ? 'admin' : userRole;
  const { tNav } = useI18n();
  const pendingLeadsCount = usePendingLeadsCount();
  const pendingSalesCount = usePendingSalesCount();
  const { openCount: openRequestsCount } = useVehicleRequests();
  const { hasPermission, isSuperadmin } = usePermissions();

  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const navigationInProgress = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Flyout global
  const { flyKey, anchorRect, openFor, close, setFlyKey } = useFlyoutPosition();
  const openT = useRef<number | null>(null);
  const closeT = useRef<number | null>(null);

  const clearOpen = () => { if (openT.current) { window.clearTimeout(openT.current); openT.current = null; } };
  const clearClose = () => { if (closeT.current) { window.clearTimeout(closeT.current); closeT.current = null; } };

  const scheduleOpen = useCallback((key: string, el: HTMLElement | null) => {
    clearClose();
    clearOpen();
    openT.current = window.setTimeout(() => openFor(key, el), 70) as unknown as number;
  }, [openFor]);

  const scheduleClose = useCallback(() => {
    clearOpen();
    clearClose();
    closeT.current = window.setTimeout(() => {
      close();
    }, 140) as unknown as number;
  }, [close]);

  /* ===== Item suelto: Asistente IA (arriba de Novedades) ===== */
  const assistantItem: NavItem = useMemo(
    () => ({ icon: LuSparkles, label: tNav('sidebar.assistant'), path: '/asistente', permission: PermissionCode.AI_ASSISTANT_VIEW }),
    [tNav]
  );


  /* ===== Items por rol ===== */
  const adminItems: GroupItem[] = useMemo(
    () => [
      {
        group: tNav('groups.main'),
        groupKey: 'main',
        // Dashboard siempre visible para todos los usuarios (sin permiso requerido)
        items: [
          { icon: LuLayoutDashboard, label: tNav('sidebar.dashboard'), path: '/' },
        ],
      },
      {
        group: tNav('groups.operations'),
        groupKey: 'operations',
        icon: LuClipboardCheck,
        items: [
          { icon: LuSparkles,    label: tNav('sidebar.smartAlerts'),    path: '/alertas-inteligentes', permission: PermissionCode.MARKETING_VIEW },
          { icon: LuClipboardCheck, label: tNav('sidebar.tasks'),       path: '/tareas', permission: PermissionCode.TASKS_VIEW },
          { icon: LuCalendarDays, label: tNav('sidebar.calendar'),      path: '/calendario', permission: PermissionCode.SCHEDULING_VIEW },
        ],
      },
      {
        group: tNav('groups.stockAndSales'),
        groupKey: 'stockAndSales',
        icon: LuCarFront,
        items: [
          { icon: LuCar,   label: tNav('sidebar.vehicles'),  path: '/vehiculos', permission: PermissionCode.VEHICLES_VIEW },
          { icon: LuScale, label: tNav('sidebar.appraiser'), path: '/tasador', permission: PermissionCode.APPRAISER_VIEW },
          { icon: LuSearch, label: tNav('sidebar.requests'), path: '/solicitudes', permission: PermissionCode.VEHICLE_REQUESTS_VIEW, badge: openRequestsCount },
          { icon: LuFileText, label: tNav('sidebar.documents'), path: '/documentos', permission: PermissionCode.DOCUMENTS_VIEW },
        ],
      },
      {
        group: tNav('groups.management'),
        groupKey: 'management',
        icon: LuBriefcase,
        items: [
          { icon: LuMailPlus,   label: tNav('sidebar.leads'),         path: '/leads', permission: PermissionCode.LEADS_VIEW, badge: pendingLeadsCount },
          { icon: LuReceipt,    label: tNav('sidebar.sales'),         path: '/ventas', permission: PermissionCode.SALES_VIEW, badge: pendingSalesCount },
          { icon: LuUsers,      label: tNav('sidebar.clients'),       path: '/clientes', permission: PermissionCode.CLIENTS_VIEW },
          { icon: LuCreditCard, label: tNav('sidebar.financing'),     path: '/financiamiento', permission: PermissionCode.FINANCING_VIEW },
        ],
      },
      {
        group: tNav('groups.social'),
        groupKey: 'social',
        icon: LuMegaphone,
        items: [
          { icon: LuMegaphone,   label: tNav('sidebar.marketing'),           path: '/marketing', permission: PermissionCode.MARKETING_VIEW },
          { icon: LuInstagram,   label: tNav('sidebar.instagram'),           path: '/instagram', permission: PermissionCode.INSTAGRAM_VIEW },
          { icon: LuStore,       label: tNav('sidebar.mercadolibre'),        path: '/mercadolibre', permission: PermissionCode.MERCADOLIBRE_VIEW },
          { icon: LuShoppingBag, label: tNav('sidebar.facebookMarketplace'), path: '/facebook-marketplace', permission: PermissionCode.FACEBOOK_VIEW },
          { icon: LuGlobe,       label: tNav('sidebar.chileautos'),          path: '/chileautos', permission: PermissionCode.CHILEAUTOS_VIEW },
        ],
      },
      {
        group: tNav('groups.configuration'),
        groupKey: 'configuration',
        icon: LuSettings2,
        items: [
          { icon: LuSettings2, label: tNav('sidebar.generalConfiguration'), path: '/configuracion', permission: PermissionCode.CONFIGURATION_VIEW },
          { icon: LuUsers,     label: tNav('sidebar.team'),                 path: '/equipo', permission: PermissionCode.TEAM_VIEW },
          { icon: LuWrench,    label: tNav('sidebar.builder'),              path: '/builder', permission: PermissionCode.BUILDER_VIEW },
        ],
      },
    ],
    [tNav, pendingLeadsCount, pendingSalesCount, openRequestsCount]
  );

  useEffect(() => {
    // Auto-expandir grupos para todos los usuarios que no son superadmin
    if (!collapsed && !navigationInProgress.current && effectiveRole !== 'superadmin') {
      const groupPaths: Record<string, string[]> = {
        main: ['/'],
        stockAndSales: ['/vehiculos', '/tasador', '/solicitudes', '/documentos'],
        social: ['/marketing', '/instagram', '/mercadolibre', '/facebook-marketplace'],
        management: ['/leads', '/ventas', '/clientes', '/financiamiento'],
        operations: ['/alertas-inteligentes', '/tareas', '/calendario'],
        configuration: ['/configuracion', '/equipo', '/builder'],
      };
      const currentGroupKey =
        Object.entries(groupPaths).find(([_, paths]) =>
          paths.some((p) => currentPath === p || currentPath.startsWith(p + '/'))
        )?.[0] ?? null;
      if (currentGroupKey) setExpandedGroups([currentGroupKey]);
    }
  }, [collapsed, currentPath, userRole]);

  const closeAllGroups = useCallback(() => setExpandedGroups([]), []);

  const navigateAndCloseGroups = useCallback(
    (path: string) => {
      if (isNavigating) return;
      navigationInProgress.current = true;
      setIsNavigating(true);
      closeAllGroups();
      setFlyKey(null);

      navigate(path);
      requestAnimationFrame(() => {
        navigationInProgress.current = false;
        setIsNavigating(false);
      });
    },
    [navigate, closeAllGroups, isNavigating, setFlyKey]
  );

  const superadminItems: NavItem[] = useMemo(
    () => [
      { icon: LuActivity,         label: 'Admin Metrics',                path: '/' },
      { icon: LuUsers,           label: tNav('sidebar.clients'),       path: '/clientes' },
      { icon: LuUsers,           label: tNav('sidebar.people'),        path: '/personas' },
    ],
    [tNav]
  );

  const sellerItems: NavItem[] = useMemo(
    () => [
      // Dashboard siempre visible para todos los usuarios (sin permiso requerido)
      { icon: LuLayoutDashboard, label: tNav('sidebar.dashboard'), path: '/' },
      { icon: LuSparkles,        label: tNav('sidebar.assistant'), path: '/asistente', permission: PermissionCode.AI_ASSISTANT_VIEW },
      { icon: LuFileText,        label: tNav('sidebar.documents'), path: '/documentos', permission: PermissionCode.DOCUMENTS_VIEW },
      { icon: LuCar,             label: tNav('sidebar.vehicles'),  path: '/vehiculos', permission: PermissionCode.VEHICLES_VIEW },
      { icon: LuMailPlus,        label: tNav('sidebar.leads'),     path: '/leads', permission: PermissionCode.LEADS_VIEW, badge: pendingLeadsCount },
      { icon: LuUsers,           label: tNav('sidebar.clients'),   path: '/clientes', permission: PermissionCode.CLIENTS_VIEW },
      { icon: LuMegaphone,       label: tNav('sidebar.marketing'), path: '/marketing', permission: PermissionCode.MARKETING_VIEW },
      { icon: LuScale,           label: tNav('sidebar.appraiser'), path: '/tasador', permission: PermissionCode.APPRAISER_VIEW },
    ],
    [tNav, pendingLeadsCount]
  );

  // Funcion para filtrar items basados en permisos
  const filterItemsByPermission = useCallback(
    (items: NavItem[]): NavItem[] => {
      if (isSuperadmin) return items;
      return items.filter(
        (item) => !item.permission || hasPermission(item.permission)
      );
    },
    [isSuperadmin, hasPermission]
  );

  // Filtrar grupos y sus items basados en permisos
  const filteredAdminItems = useMemo(() => {
    if (isSuperadmin) return adminItems;

    return adminItems
      .map((group) => ({
        ...group,
        items: filterItemsByPermission(group.items),
      }))
      .filter((group) => group.items.length > 0);
  }, [adminItems, filterItemsByPermission, isSuperadmin]);

  const getFlattenedItems = useCallback(() => {
    if (isSuperadmin && !isTenantOverride) return superadminItems;
    // Admin (or superadmin impersonating tenant) uses admin items filtered by permissions
    return filterItemsByPermission(adminItems.flatMap((g) => g.items));
  }, [isSuperadmin, isTenantOverride, adminItems, superadminItems, filterItemsByPermission]);

  /* ===== Subitems (sin icono) ===== */
  const renderNavItem = useCallback(
    (item: NavItem, isSubItem = false, active = false) => (
      <div key={item.path} className={cn('relative', isSubItem && 'pl-3')}>
        {isSubItem && (
          <div
            className={cn(
              'absolute left-0 top-0 bottom-0 w-[2px] h-full rounded-r-sm',
              active ? 'bg-slate-800' : 'bg-slate-200'
            )}
          />
        )}
        <button
          type="button"
          disabled={isNavigating}
          onClick={() => navigateAndCloseGroups(item.path)}
          className={cn(
            'flex w-full items-center justify-between transition-all duration-200 rounded-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
            isNavigating && 'pointer-events-none opacity-70',
            active
              ? isSubItem
                ? 'text-slate-800 font-semibold'
                : 'border-l-[3px] border-slate-800 text-slate-800 font-semibold'
              : isSubItem
                ? 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                : 'border-l-[3px] border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50',
            isSubItem ? 'py-1.5 px-2 text-xs' : 'px-3 py-2.5 text-sm'
          )}
          aria-current={active ? 'page' : undefined}
          aria-busy={isNavigating}
        >
          <div className="flex items-center">
            {!isSubItem && item.icon && (
              <item.icon className={cn('h-5 w-5 mr-3', active ? 'text-slate-800' : 'text-slate-500')} />
            )}
            <span className="truncate">{item.label}</span>
          </div>
          {item.badge != null && item.badge > 0 && (
            <span className="ml-2 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </button>
      </div>
    ),
    [navigateAndCloseGroups, isNavigating]
  );

  /* ===== Botón "estilo principal" (Dashboard / Documentos / Novedades) ===== */
  const renderTopButton = useCallback(
    (item: NavItem, active: boolean, itemClasses?: string) => (
      <div key={`top-${item.path}`} className="mb-0">
        <button
          type="button"
          disabled={isNavigating}
          onClick={() => navigateAndCloseGroups(item.path)}
          className={cn(
            'flex w-full items-center justify-between px-2.5 py-1.5 text-[13px] rounded-none transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
            isNavigating && 'pointer-events-none opacity-70',
            itemClasses,
            active
              ? 'border-l-[3px] border-slate-800 text-slate-800 font-semibold'
              : 'border-l-[3px] border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
          )}
          aria-current={active ? 'page' : undefined}
          aria-busy={isNavigating}
        >
          <div className="flex items-center">
            {item.icon && (
              <item.icon className={cn('h-5 w-5 mr-3', active ? 'text-slate-800' : 'text-slate-500')} />
            )}
            <span className="font-medium">{item.label}</span>
          </div>
        </button>
      </div>
    ),
    [isNavigating, navigateAndCloseGroups]
  );

  /* ===== Expandido normal (acordeones) ===== */
  const renderGroupWithItems = useCallback(
    (group: GroupItem, index: number) => {
      const isExpanded = expandedGroups.includes(group.groupKey);
      const hasActiveItem = group.items.some(
        (item) => currentPath === item.path || currentPath.startsWith(item.path + '/')
      );

      if (group.groupKey === 'main') {
        const activeMain = currentPath === '/' || currentPath === '';
        const showDashboard = group.items.length > 0;

        if (!showDashboard) {
          return null;
        }

        return (
          <div key={group.groupKey} className={cn('mb-0', index > 0 && 'pt-2')}>
            <div className="flex flex-col space-y-4">
              {showDashboard && renderTopButton(group.items[0], activeMain, undefined)}
            </div>
          </div>
        );
      }
      

      return (
        <div key={group.groupKey} className={cn('mb-0', index > 0 && 'pt-2')}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              if (isNavigating) return;
              setExpandedGroups((prev) =>
                prev.includes(group.groupKey)
                  ? prev.filter((g) => g !== group.groupKey)
                  : [group.groupKey]
              );
            }}
            className={cn(
              'flex w-full items-center justify-between px-2.5 py-1.5 text-[13px] rounded-none transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
              isNavigating && 'pointer-events-none opacity-70',
              hasActiveItem ? 'border-l-[3px] border-slate-800 text-slate-800 font-semibold' : 'border-l-[3px] border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            )}
            aria-expanded={isExpanded}
            aria-controls={`group-${group.groupKey}`}
            aria-busy={isNavigating}
          >
            <div className="flex items-center">
              {group.icon && (
                <group.icon className={cn('h-5 w-5 mr-3', hasActiveItem ? 'text-slate-800' : 'text-slate-500')} />
              )}
              <span className="font-medium">{group.group}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {(() => {
                const groupBadge = group.items.reduce((sum, item) => sum + (item.badge || 0), 0);
                return groupBadge > 0 && !isExpanded ? (
                  <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                    {groupBadge > 99 ? '99+' : groupBadge}
                  </span>
                ) : null;
              })()}
              {isExpanded ? (
                <LuChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <LuChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </button>

          {isExpanded && (
            <div id={`group-${group.groupKey}`} className="mt-1 pl-2">
              <div className="space-y-0.5 py-1">
                {group.items.map((item) => {
                  const isActive =
                    currentPath === item.path || currentPath.startsWith(item.path + '/');
                  return renderNavItem(item, true, isActive);
                })}
              </div>
            </div>
          )}
        </div>
      );
    },
    [expandedGroups, currentPath, renderNavItem, isNavigating, renderTopButton, hasPermission]
  );

  /* =========================
     RAIL COLAPSADO (hover + portal + bridge)
  ========================= */
  const SmartCollapsedAdminRail = useCallback(() => {
    const groupsOnly = filteredAdminItems.filter(g => g.groupKey !== 'main');
    const mainGroup = filteredAdminItems.find(g => g.groupKey === 'main');
    const dashItem = mainGroup?.items[0];
    const isDashboardActive = currentPath === '/' || currentPath === '';
    const showAssistant = !assistantItem.permission || hasPermission(assistantItem.permission);

    const groupsByKey = useMemo(() => {
      const map: Record<string, GroupItem> = {};
      groupsOnly.forEach(g => { map[g.groupKey] = g; });
      return map;
    }, [groupsOnly]);

    const isToPanelOrBridge = (node: unknown) => {
      if (!isNode(node)) return false;
      const el = node as HTMLElement;
      return !!(el.closest?.('[data-flyout-panel="true"]') || el.closest?.('[data-flyout-bridge="true"]'));
    };

    const GroupIconButton = ({ group }: { group: GroupItem }) => {
      const hasActiveItem = group.items.some(
        (item) => currentPath === item.path || currentPath.startsWith(item.path + '/')
      );
      const groupBadgeCount = group.items.reduce((sum, item) => sum + (item.badge || 0), 0);
      const IconCmp = group.icon ?? LuLayoutDashboard;
      const btnRef = useRef<HTMLButtonElement | null>(null);
      const key = group.groupKey;
      const isOpen = flyKey === key;
      const hasMultipleItems = group.items.length > 1;

      const handleTriggerLeave = (e: React.MouseEvent) => {
        const next = e.relatedTarget as EventTarget | null;
        if (isToPanelOrBridge(next)) return;
        scheduleClose();
      };

      const handleTriggerBlur = (e: React.FocusEvent) => {
        const next = e.relatedTarget as EventTarget | null;
        if (isToPanelOrBridge(next)) return;
        close();
      };

      // Indicador de flecha para grupos con múltiples items
      const ArrowIndicator = hasMultipleItems ? (
        <LuChevronRight
          className={cn(
            'absolute -right-1 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-all duration-200',
            'sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 lg:h-3.5 lg:w-3.5',
            isOpen ? 'opacity-100 text-slate-800' : 'opacity-70',
            hasActiveItem ? 'text-slate-800' : 'text-slate-500'
          )}
        />
      ) : null;

      return (
        <div className="relative">
          {/* Tooltip solo cuando está cerrado */}
          <TooltipProvider delayDuration={250}>
            {!isOpen ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    ref={btnRef}
                    type="button"
                    data-fly-anchor="true"
                    data-fly-active={isOpen}
                    onMouseEnter={() => { clearClose(); scheduleOpen(key, btnRef.current); }}
                    onMouseLeave={handleTriggerLeave}
                    onFocus={() => openFor(key, btnRef.current)}
                    onBlur={handleTriggerBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'ArrowRight') openFor(key, btnRef.current);
                      if (e.key === 'Escape' || e.key === 'ArrowLeft') close();
                    }}
                    onClick={() => {
                      const first = group.items[0];
                      if (first) navigateAndCloseGroups(first.path);
                    }}
                    className={cn(
                      'relative flex items-center justify-center h-11 w-11 mx-auto rounded-xl transition-all duration-200',
                      'sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-10 xl:w-10',
                      hasActiveItem ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    )}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    aria-label={group.group}
                  >
                    {hasActiveItem && (
                      <span className="absolute inset-0 rounded-xl ring-2 ring-primary/50 pointer-events-none" />
                    )}
                    {groupBadgeCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 border border-white shadow-sm">
                        {groupBadgeCount > 99 ? '99+' : groupBadgeCount}
                      </span>
                    )}
                    <IconCmp
                      className={cn(
                        'h-6 w-6',
                        'sm:h-4 sm:w-4 md:h-6 md:w-6 lg:h-6 lg:w-6 xl:h-6 xl:w-6',
                        hasActiveItem ? 'text-slate-800' : 'text-slate-500'
                      )}
                    />
                    {ArrowIndicator}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-white border border-slate-200 text-xs px-3 py-1.5 shadow-md rounded-md z-50">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-800 whitespace-normal break-words">{group.group}</span>
                    {hasMultipleItems && (
                      <LuChevronRight className="h-3 w-3 text-slate-400" />
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                ref={btnRef}
                type="button"
                data-fly-anchor="true"
                data-fly-active={isOpen}
                onMouseEnter={() => { clearClose(); scheduleOpen(key, btnRef.current); }}
                onMouseLeave={handleTriggerLeave}
                onFocus={() => openFor(key, btnRef.current)}
                onBlur={handleTriggerBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' || e.key === 'ArrowLeft') close();
                }}
                onClick={() => {
                  const first = group.items[0];
                  if (first) navigateAndCloseGroups(first.path);
                }}
                className={cn(
                  'relative flex items-center justify-center h-11 w-11 mx-auto rounded-xl transition-all duration-200',
                  'sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-10 xl:w-10',
                  hasActiveItem ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                )}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={group.group}
              >
                {hasActiveItem && (
                  <span className="absolute inset-0 rounded-xl ring-2 ring-primary/50 pointer-events-none" />
                )}
                {groupBadgeCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 border border-white shadow-sm">
                    {groupBadgeCount > 99 ? '99+' : groupBadgeCount}
                  </span>
                )}
                <IconCmp
                  className={cn(
                    'h-6 w-6',
                    'sm:h-4 sm:w-4 md:h-6 md:w-6 lg:h-6 lg:w-6 xl:h-6 xl:w-6',
                    hasActiveItem ? 'text-slate-800' : 'text-slate-500'
                  )}
                />
                {ArrowIndicator}
              </button>
            )}
          </TooltipProvider>
        </div>
      );
    };

    const handlePanelLeave = (e: React.MouseEvent) => {
      const next = e.relatedTarget as EventTarget | null;
      const toTrigger = isNode(next) && !!(next as HTMLElement).closest?.('[data-fly-anchor="true"]');
      const toBridge  = isNode(next) && !!(next as HTMLElement).closest?.('[data-flyout-bridge="true"]');
      if (toTrigger || toBridge) return;
      scheduleClose();
    };

    return (
      <div className={cn('relative flex flex-col space-y-3 sm:space-y-1.5 md:space-y-2 lg:space-y-2.5 xl:space-y-3')}>
        {/* Dashboard */}
        {dashItem && (
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => navigateAndCloseGroups(dashItem.path)}
                  className={cn(
                    'flex items-center justify-center h-11 w-11 mx-auto rounded-xl transition-all duration-200',
                    'sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-10 xl:w-10',
                    isDashboardActive ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  )}
                  aria-current={isDashboardActive ? 'page' : undefined}
                >
                  <LuLayoutDashboard
                    className={cn(
                      'h-6 w-6',
                      'sm:h-4 sm:w-4 md:h-6 md:w-6 lg:h-6 lg:w-6 xl:h-6 xl:w-6',
                      isDashboardActive ? 'text-slate-800' : 'text-slate-500'
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-white border border-slate-200 text-xs px-3 py-1.5 shadow-md rounded-md z-50">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-800 whitespace-normal break-words">{dashItem.label}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Grupos */}
        {groupsOnly.map((group) => (
          <GroupIconButton key={group.groupKey} group={group} />
        ))}

        {/* Separador + Asistente IA + Novedades */}
        <div className="h-px bg-slate-200 my-2 mx-2" />

        {/* GAIA — Lottie orb with spinning ring — solo si tiene permiso */}
        {showAssistant && (
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => navigateAndCloseGroups(assistantItem.path)}
                  className={cn(
                    'relative flex items-center justify-center mx-auto rounded-xl transition-all duration-200',
                    'h-7 w-7 sm:h-7 sm:w-7 md:h-7 md:w-7 lg:h-8 lg:w-8',
                    (currentPath === '/asistente' || currentPath.startsWith('/asistente/'))
                      ? 'bg-slate-100 text-slate-800'
                      : 'hover:bg-slate-50'
                  )}
                  aria-current={(currentPath === '/asistente' || currentPath.startsWith('/asistente/')) ? 'page' : undefined}
                  aria-label={assistantItem.label}
                >
                  <Lottie animationData={aiAnimation} loop className="absolute inset-[-25%] pointer-events-none" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-white border border-slate-200 text-xs px-3 py-1.5 shadow-md rounded-md z-50">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-800 whitespace-normal break-words">{assistantItem.label}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Bridge + Panel en portal */}
        {flyKey && anchorRect && (
          <>
            <BridgePortal anchorRect={anchorRect} />
            <FlyoutPortal
              anchorRect={anchorRect}
              onMouseEnter={() => { clearClose(); }}
              onMouseLeave={handlePanelLeave}
              maxWidth={PANEL_MAX_W}
            >
              <div className="py-1 w-fit">
                {groupsByKey[flyKey]?.items.map((item) => {
                  const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
                  return (
                    <button
                      key={item.path}
                      type="button"
                      className={cn(
                        'w-full flex items-center justify-between text-left px-3 py-2 rounded-md transition-[background-color,color] duration-150',
                        'text-[12.5px] leading-[1.15rem] whitespace-nowrap',
                        isActive
                          ? 'border-l-[3px] border-slate-800 text-slate-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-800'
                      )}
                      onClick={() => {
                        setFlyKey(null);
                        navigateAndCloseGroups(item.path);
                      }}
                      role="menuitem"
                    >
                      {item.label}
                      {item.badge != null && item.badge > 0 && (
                        <span className="ml-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </FlyoutPortal>
          </>
        )}
      </div>
    );
  }, [
    filteredAdminItems,
    currentPath,
    navigateAndCloseGroups,
    flyKey,
    anchorRect,
    openFor,
    close,
    setFlyKey,
    assistantItem,
    hasPermission,
  ]);

  // Mostrar navegación de admin para todos los usuarios que NO son superadmin,
  // O cuando superadmin está impersonando un tenant
  const showAdminNavigation = effectiveRole !== 'superadmin';

  return (
    <div className={cn('flex-1 transition-all duration-300 ease-in-out', collapsed ? 'px-0 py-1 sm:py-0.5' : 'px-0 py-3')}>
      {showAdminNavigation ? (
        collapsed ? (
          <SmartCollapsedAdminRail />
        ) : (
          <div className="space-y-2 flex flex-col">
            {filteredAdminItems.map((group, index) => (
              <div key={`group-${group.groupKey}`}>{renderGroupWithItems(group, index)}</div>
            ))}

            {/* GAIA - Arriba de Novedades — solo si tiene permiso */}
            {(!assistantItem.permission || hasPermission(assistantItem.permission)) && (
              <div className="pt-4 mt-2 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isNavigating}
                  onClick={() => navigateAndCloseGroups(assistantItem.path)}
                  className={cn(
                    'flex w-full items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                    isNavigating && 'pointer-events-none opacity-70',
                    (currentPath === '/asistente' || currentPath.startsWith('/asistente/'))
                      ? 'border-l-[3px] border-slate-800 text-slate-800 font-semibold'
                      : 'border-l-[3px] border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  )}
                  aria-current={(currentPath === '/asistente' || currentPath.startsWith('/asistente/')) ? 'page' : undefined}
                  aria-busy={isNavigating}
                >
                  <span className="relative shrink-0 mr-2.5" style={{ width: 16, height: 16 }}>
                    <Lottie animationData={aiAnimation} loop className="absolute inset-[-60%] pointer-events-none" />
                  </span>
                  <span>{assistantItem.label}</span>
                </button>
              </div>
            )}

          </div>
        )
      ) : (
        <div className={cn('flex flex-col', collapsed ? 'space-y-3 sm:space-y-1.5 md:space-y-2 lg:space-y-2.5 xl:space-y-3' : 'space-y-2')}>
          {getFlattenedItems().map((item) => {
            const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
            return (
              <SidebarNavItemComponent
                key={item.path}
                icon={item.icon || LuLayoutDashboard}
                label={item.label}
                path={item.path}
                active={isActive}
                collapsed={collapsed}
                onNavigate={navigateAndCloseGroups}
                specialClass={item.specialClass}
                badge={item.badge}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

interface NavItemProps {
  icon?: React.ElementType;
  label: string;
  path: string;
  active?: boolean;
  collapsed?: boolean;
  onNavigate?: (path: string) => void;
  specialClass?: string;
  hasNewUpdates?: boolean;
  badge?: number;
}

const SidebarNavItemComponent = React.memo(
  ({ icon: IconCmp = LuLayoutDashboard, label, path, active = false, collapsed = false, onNavigate, specialClass, hasNewUpdates, badge }: NavItemProps) => {
    const [, navigate] = useLocation();

    const handleNavigation = (e: React.MouseEvent) => {
      e.preventDefault();
      if (onNavigate) onNavigate(path);
      else navigate(path);
    };

    // Determinar si este es el item de Novedades
    const isUpdatesItem = specialClass === 'updates-item';
    const showYellow = isUpdatesItem && hasNewUpdates;

    if (collapsed) {
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleNavigation}
                className={cn(
                  'relative flex items-center justify-center h-11 w-11 mx-auto rounded-xl transition-all duration-200',
                  'sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-10 xl:w-10',
                  showYellow && 'shadow-sm border border-yellow-300',
                  active
                    ? showYellow
                      ? 'bg-yellow-200 text-yellow-900 border-yellow-400 shadow-md'
                      : 'bg-slate-100 text-slate-800'
                    : showYellow
                      ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:shadow-md'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                )}
                aria-current={active ? 'page' : undefined}
              >
                {showYellow && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-500 rounded-full border border-white shadow-sm" />
                )}
                {!showYellow && badge != null && badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 border border-white shadow-sm">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                <IconCmp
                  className={cn(
                    'h-6 w-6',
                    'sm:h-4 sm:w-4 md:h-6 md:w-6 lg:h-6 lg:w-6 xl:h-6 xl:w-6',
                    active
                      ? showYellow ? 'text-yellow-900' : 'text-slate-800'
                      : showYellow ? 'text-yellow-700' : 'text-slate-500'
                  )}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className={cn(
              'text-xs px-3 py-1.5 shadow-md rounded-md z-50',
              showYellow
                ? 'bg-yellow-100 border border-yellow-300'
                : 'bg-white border border-slate-200'
            )}>
              <div className="flex items-center gap-1.5">
                <span className={cn(showYellow ? 'text-yellow-900 font-semibold' : 'text-slate-800')}>{label}</span>
                {showYellow && (
                  <span className="text-[10px] bg-yellow-300 text-yellow-900 px-1.5 py-0.5 rounded-full font-bold">
                    NUEVO
                  </span>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <button
        type="button"
        onClick={handleNavigation}
        className={cn(
          'flex w-full items-center justify-between px-2.5 py-1.5 text-[13px] rounded-none transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2',
          showYellow && 'shadow-sm border border-yellow-300',
          !showYellow && 'focus-visible:ring-primary/60',
          showYellow && 'focus-visible:ring-yellow-400',
          active
            ? showYellow
              ? 'bg-yellow-200 text-yellow-900 font-semibold border-yellow-400 shadow-md'
              : 'border-l-[3px] border-slate-800 text-slate-800 font-semibold'
            : showYellow
              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:shadow-md font-medium'
              : 'border-l-[3px] border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800'
        )}
        aria-current={active ? 'page' : undefined}
      >
        <div className="flex items-center">
          <IconCmp className={cn(
            'h-4 w-4 mr-2.5',
            active
              ? showYellow ? 'text-yellow-900' : 'text-slate-800'
              : showYellow ? 'text-yellow-700' : 'text-slate-500'
          )} />
          <span className={cn('truncate', showYellow && 'font-semibold')}>{label}</span>
        </div>
        {showYellow && (
          <span className="text-xs bg-yellow-300 text-yellow-900 px-2 py-0.5 rounded-full font-bold">
            NUEVO
          </span>
        )}
        {!showYellow && badge != null && badge > 0 && (
          <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  }
);