import { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, Building2, X, Check, ChevronsUpDown, MapPin } from 'lucide-react';
import { LuZap } from 'react-icons/lu';
import { useLocation } from 'wouter';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { useDealerships } from '@/hooks/useDealerships';
import { useActiveDealership } from '@/hooks/useActiveDealership';
import { useActiveDealershipStore } from '@/stores/activeDealershipStore';
import { useUpdatesNotification } from '@/hooks/useUpdatesNotification';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import NotificationBell from '@/components/notifications/NotificationBell';
import TourButton from '@/components/TourButton';
import GlobalSearch from '@/components/GlobalSearch';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types/user';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function TenantSelector() {
  const { client, setTenantOverride, clearTenantOverride, isTenantOverride, allowedClientIds } = useAuth();
  const { isSuperadmin } = usePermissions();
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<Client[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchTenants = async () => {
      // Superadmin: todas las automotoras. Admin multi-automotora: solo las permitidas.
      if (!isSuperadmin && allowedClientIds.length === 0) {
        setTenants([]);
        return;
      }
      let query = supabase
        .from('clients')
        .select('*, legal_info(*), logo')
        .order('name');
      if (!isSuperadmin) {
        query = query.in('id', allowedClientIds);
      }
      const { data } = await query;
      if (data) setTenants(data);
    };
    fetchTenants();
  }, [isSuperadmin, allowedClientIds]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tenants;
    const q = search.toLowerCase();
    return tenants.filter((t) => t.name?.toLowerCase().includes(q));
  }, [tenants, search]);

  const handleSelect = (tenant: Client) => {
    setTenantOverride(tenant.id, tenant);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearTenantOverride();
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 h-9 px-3 rounded-lg border text-sm transition-colors max-w-[280px]',
            isTenantOverride
              ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
              : 'border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100'
          )}
        >
          {isTenantOverride && client?.logo ? (
            <img src={client.logo} alt="" className="h-5 max-w-[80px] object-contain" />
          ) : (
            <Building2 className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="truncate font-medium">
            {isTenantOverride ? client?.name : 'Seleccionar automotora'}
          </span>
          {isTenantOverride ? (
            <X className="h-3.5 w-3.5 flex-shrink-0 opacity-60 hover:opacity-100" onClick={handleClear} />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2 border-b border-slate-100">
          <Input
            placeholder="Buscar automotora..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-[280px] overflow-y-auto">
          <div className="p-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No se encontraron automotoras.</p>
            ) : (
              filtered.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => handleSelect(tenant)}
                  className={cn(
                    'flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm transition-colors cursor-pointer',
                    'hover:bg-slate-100 text-slate-700',
                    isTenantOverride && client?.id === tenant.id && 'bg-primary/5 text-primary'
                  )}
                >
                  {tenant.logo ? (
                    <img src={tenant.logo} alt="" className="h-5 w-5 object-contain flex-shrink-0 rounded" />
                  ) : (
                    <Building2 className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  )}
                  <span className="truncate">{tenant.name}</span>
                  {isTenantOverride && client?.id === tenant.id && (
                    <Check className="h-4 w-4 ml-auto text-primary flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Selector de sede (sucursal) activa. Espejo del TenantSelector pero para la sede.
 *
 * Reglas (fuente de verdad: useActiveDealership):
 *   - Solo visible si el tenant tiene >=2 sedes y hay al menos 2 opciones reales.
 *   - Usuario restringido (isRestricted): solo ve sus sedes asignadas; la opcion
 *     "Todas mis sedes" aparece solo si tiene mas de una asignada.
 *   - Usuario no restringido: ve todas las sedes + "Todas las sedes".
 *   - Al elegir, escribe la seleccion cruda en activeDealershipStore.
 */
function DealershipSelector() {
  const { dealerships } = useDealerships();
  const { assignedDealershipIds, isRestricted, activeDealershipId } = useActiveDealership();
  const setSelectedDealership = useActiveDealershipStore((s) => s.setSelectedDealership);
  const [open, setOpen] = useState(false);

  const selectable = useMemo(
    () =>
      isRestricted
        ? dealerships.filter((d) => assignedDealershipIds.includes(d.id))
        : dealerships,
    [dealerships, isRestricted, assignedDealershipIds]
  );

  // "Todas" para no restringidos, o para restringidos con mas de una sede asignada.
  const showAllOption = !isRestricted || selectable.length > 1;
  const optionCount = selectable.length + (showAllOption ? 1 : 0);

  const dealershipLabel = (id: number) => {
    const d = dealerships.find((x) => x.id === id);
    return d ? d.name || d.address || `Sede ${id}` : `Sede ${id}`;
  };

  // Guard: tenant con >=2 sedes Y al menos 2 opciones reales para elegir.
  if (dealerships.length < 2 || optionCount < 2) return null;

  const allLabel = isRestricted ? 'Todas mis sedes' : 'Todas las sedes';
  const currentLabel =
    activeDealershipId != null ? dealershipLabel(activeDealershipId) : allLabel;
  const hasSelection = activeDealershipId != null;

  const handleSelect = (id: number | null) => {
    setSelectedDealership(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 h-9 px-3 rounded-lg border text-sm transition-colors max-w-[220px]',
            hasSelection
              ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
              : 'border-slate-200 bg-slate-50/80 text-slate-600 hover:bg-slate-100'
          )}
        >
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate font-medium">{currentLabel}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <div className="max-h-[280px] overflow-y-auto p-1">
          {showAllOption && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm transition-colors cursor-pointer',
                'hover:bg-slate-100 text-slate-700',
                !hasSelection && 'bg-primary/5 text-primary'
              )}
            >
              <Building2 className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <span className="truncate">{allLabel}</span>
              {!hasSelection && <Check className="h-4 w-4 ml-auto text-primary flex-shrink-0" />}
            </button>
          )}
          {selectable.map((d) => {
            const isActive = activeDealershipId === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => handleSelect(d.id)}
                className={cn(
                  'flex items-center gap-2 w-full rounded-md px-2 py-2 text-sm transition-colors cursor-pointer',
                  'hover:bg-slate-100 text-slate-700',
                  isActive && 'bg-primary/5 text-primary'
                )}
              >
                <MapPin className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <span className="truncate">{d.name || d.address || `Sede ${d.id}`}</span>
                {isActive && <Check className="h-4 w-4 ml-auto text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function TopBar() {
  const { collapsed } = useSidebar();
  const { user, client, canSwitchTenant } = useAuth();
  const { hasPermission, isSuperadmin } = usePermissions();
  const showNotifications = isSuperadmin || hasPermission(PermissionCode.NOTIFICATIONS_VIEW);
  const showUpdates = isSuperadmin || hasPermission(PermissionCode.UPDATES_VIEW);
  const { hasNewUpdates, markAsViewed } = useUpdatesNotification();
  const [, navigate] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  const getUserInitials = useCallback(() => {
    if (!user?.email) return 'U';
    if (user.user_metadata?.full_name) {
      const nameParts = user.user_metadata.full_name.split(' ');
      if (nameParts.length >= 2) return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      return nameParts[0][0].toUpperCase();
    }
    const name = user.email.split('@')[0] || 'Usuario';
    return name.substring(0, 2).toUpperCase();
  }, [user]);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';

  return (
    <>
      <div
        className="hidden md:flex items-center justify-between h-14 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 fixed top-0 right-0 z-30 transition-[left] duration-500 ease-in-out"
        style={{ left: collapsed ? '70px' : '256px' }}
      >
        {/* Left side — tenant selector for superadmin/admin multi-automotora, logo for others; sede selector al lado (si el tenant tiene >=2 sedes) */}
        <div className="flex items-center gap-2">
          {canSwitchTenant ? (
            <TenantSelector />
          ) : client ? (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60">
              {client.logo ? (
                <img src={client.logo} alt={client.name || ''} className="h-6 w-auto max-w-[80px] object-contain rounded" />
              ) : (
                <div className="h-6 w-6 rounded bg-slate-200 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-500">{client.name?.charAt(0) || '?'}</span>
                </div>
              )}
              <span className="text-[13px] font-medium text-slate-700">{client.name}</span>
            </div>
          ) : null}
          <DealershipSelector />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 h-9 px-3 w-[200px] rounded-lg border border-slate-200 bg-slate-50/80 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="hidden lg:inline">Buscar...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 ml-auto rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              {typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
                ? <><span className="text-xs">&#8984;</span>K</>
                : <>Ctrl K</>
              }
            </kbd>
          </button>

          {/* Tour button */}
          <TourButton />

          {/* Novedades — solo si tiene permiso */}
          {showUpdates && (
            <button
              onClick={() => { markAsViewed(); navigate('/novedades'); }}
              className={cn(
                'relative flex items-center gap-1.5 rounded-lg transition-all duration-300',
                hasNewUpdates
                  ? 'h-9 px-3 bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'h-9 w-9 justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              )}
              aria-label="Novedades"
            >
              <LuZap className="h-[18px] w-[18px] shrink-0" />
              {hasNewUpdates && (
                <span className="text-[11px] font-bold text-yellow-800 uppercase tracking-wide">New</span>
              )}
            </button>
          )}

          {/* Notification bell — solo si tiene permiso */}
          {showNotifications && (
            <NotificationBell variant="sidebar" />
          )}
        </div>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
