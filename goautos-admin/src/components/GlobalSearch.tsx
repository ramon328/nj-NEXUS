import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/hooks/useI18n';
import { PermissionCode } from '@/types/permissions';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search } from 'lucide-react';
import {
  LuLayoutDashboard,
  LuCar,
  LuScale,
  LuMailPlus,
  LuUsers,
  LuReceipt,
  LuCreditCard,
  LuMegaphone,
  LuInstagram,
  LuStore,
  LuShoppingBag,
  LuGlobe,
  LuSettings2,
  LuWrench,
  LuZap,
  LuFileText,
  LuCalendar,
  LuSearch,
  LuSparkles,
  LuUser,
  LuBell,
  LuPalette,
  LuLanguages,
  LuShield,
  LuPhone,
  LuCreditCard as LuSubscription,
  LuListChecks,
  LuClipboardList,
} from 'react-icons/lu';
import React from 'react';

// --- Types ---

interface StaticItem {
  icon: React.ElementType;
  label: string;
  keywords: string;
  path: string;
  permission?: PermissionCode;
}

interface VehicleResult {
  id: number;
  year: number | null;
  price: number | null;
  license_plate: string | null;
  main_image: string | null;
  brand: { name: string } | null;
  model: { name: string } | null;
}

interface CustomerResult {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  rut: string | null;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [, navigate] = useLocation();
  const { hasPermission, isSuperadmin } = usePermissions();
  const { userRole, clientId, isTenantOverride } = useAuth();
  const { tNav } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [vehicles, setVehicles] = useState<VehicleResult[]>([]);
  const [customers, setCustomers] = useState<CustomerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Focus input on open, reset on close
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setVehicles([]);
      setCustomers([]);
      setSearching(false);
    }
  }, [open]);

  // Debounced DB search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setVehicles([]);
      setCustomers([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const likeTerm = `%${trimmed}%`;
      const promises: Promise<void>[] = [];

      // --- Vehicles ---
      if (isSuperadmin || hasPermission(PermissionCode.VEHICLES_VIEW)) {
        promises.push(
          (async () => {
            const [{ data: matchBrands }, { data: matchModels }] = await Promise.all([
              supabase.from('brands').select('id').ilike('name', likeTerm),
              supabase.from('models').select('id').ilike('name', likeTerm),
            ]);

            const brandIds = (matchBrands || []).map((b: { id: number }) => b.id);
            const modelIds = (matchModels || []).map((m: { id: number }) => m.id);

            const filters = [`license_plate.ilike.${likeTerm}`];
            if (brandIds.length > 0) filters.push(`brand_id.in.(${brandIds.join(',')})`);
            if (modelIds.length > 0) filters.push(`model_id.in.(${modelIds.join(',')})`);

            const { data } = await supabase
              .from('vehicles')
              .select('id, year, price, license_plate, main_image, brand:brand_id(name), model:model_id(name)')
              .eq('client_id', clientId)
              .or(filters.join(','))
              .limit(5);

            setVehicles((data as unknown as VehicleResult[]) || []);
          })()
        );
      }

      // --- Customers ---
      if (isSuperadmin || hasPermission(PermissionCode.CLIENTS_VIEW)) {
        promises.push(
          supabase
            .from('customers')
            .select('id, first_name, last_name, email, phone, rut')
            .eq('client_id', clientId)
            .or(`first_name.ilike.${likeTerm},last_name.ilike.${likeTerm},email.ilike.${likeTerm},rut.ilike.${likeTerm},phone.ilike.${likeTerm}`)
            .limit(5)
            .then(({ data }) => {
              setCustomers((data as CustomerResult[]) || []);
            })
        );
      }

      await Promise.allSettled(promises);
      setSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, clientId, isSuperadmin, hasPermission]);

  // --- Static searchable items ---
  const staticItems: StaticItem[] = useMemo(() => {
    if (userRole === 'superadmin' && !isTenantOverride) {
      return [
        { icon: LuLayoutDashboard, label: 'Dashboard', keywords: 'inicio panel', path: '/' },
        { icon: LuUsers, label: 'Clientes', keywords: 'automotoras', path: '/clientes' },
        { icon: LuUsers, label: 'Personas', keywords: 'usuarios people', path: '/personas' },
        { icon: LuZap, label: 'Novedades', keywords: 'updates', path: '/novedades' },
        { icon: LuSettings2, label: 'Configuración', keywords: 'settings ajustes', path: '/configuracion' },
      ];
    }

    return [
      { icon: LuLayoutDashboard, label: 'Dashboard', keywords: 'inicio panel resumen', path: '/' },
      { icon: LuCar, label: tNav('sidebar.vehicles'), keywords: 'autos inventario stock', path: '/vehiculos', permission: PermissionCode.VEHICLES_VIEW },
      { icon: LuScale, label: tNav('sidebar.appraiser'), keywords: 'tasacion valorar', path: '/tasador', permission: PermissionCode.APPRAISER_VIEW },
      { icon: LuMailPlus, label: tNav('sidebar.leads'), keywords: 'prospectos contactos', path: '/leads', permission: PermissionCode.LEADS_VIEW },
      { icon: LuUsers, label: tNav('sidebar.clients'), keywords: 'clientes personas', path: '/clientes', permission: PermissionCode.CLIENTS_VIEW },
      { icon: LuReceipt, label: tNav('sidebar.sales'), keywords: 'ventas transacciones', path: '/ventas', permission: PermissionCode.SALES_VIEW },
      { icon: LuCreditCard, label: tNav('sidebar.financing'), keywords: 'financiamiento credito', path: '/financiamiento', permission: PermissionCode.FINANCING_VIEW },
      { icon: LuCalendar, label: tNav('sidebar.scheduling'), keywords: 'agendamientos citas calendario', path: '/calendario', permission: PermissionCode.SCHEDULING_VIEW },
      { icon: LuFileText, label: tNav('sidebar.documents'), keywords: 'documentos contratos notas', path: '/documentos', permission: PermissionCode.DOCUMENTS_VIEW },
      { icon: LuSearch, label: 'Solicitudes', keywords: 'solicitudes busqueda vehiculos pedidos', path: '/solicitudes', permission: PermissionCode.VEHICLE_REQUESTS_VIEW },
      { icon: LuSparkles, label: tNav('sidebar.assistant'), keywords: 'asistente ia inteligencia artificial chat', path: '/asistente', permission: PermissionCode.AI_ASSISTANT_VIEW },
      { icon: LuMegaphone, label: tNav('sidebar.marketing'), keywords: 'campañas publicidad', path: '/marketing', permission: PermissionCode.MARKETING_VIEW },
      { icon: LuSparkles, label: tNav('sidebar.smartAlerts'), keywords: 'alertas inteligentes ia sugerencias', path: '/alertas-inteligentes', permission: PermissionCode.MARKETING_VIEW },
      { icon: LuInstagram, label: tNav('sidebar.instagram'), keywords: 'redes sociales ig', path: '/instagram', permission: PermissionCode.INSTAGRAM_VIEW },
      { icon: LuStore, label: tNav('sidebar.mercadolibre'), keywords: 'marketplace mercado libre ml', path: '/mercadolibre', permission: PermissionCode.MERCADOLIBRE_VIEW },
      { icon: LuShoppingBag, label: tNav('sidebar.facebookMarketplace'), keywords: 'facebook fb marketplace', path: '/facebook-marketplace', permission: PermissionCode.FACEBOOK_VIEW },
      { icon: LuGlobe, label: tNav('sidebar.chileautos'), keywords: 'chileautos portal', path: '/chileautos', permission: PermissionCode.CHILEAUTOS_VIEW },
      { icon: LuUsers, label: tNav('sidebar.team'), keywords: 'equipo usuarios roles vendedores', path: '/equipo', permission: PermissionCode.TEAM_VIEW },
      { icon: LuWrench, label: tNav('sidebar.builder'), keywords: 'constructor sitio web pagina', path: '/builder', permission: PermissionCode.BUILDER_VIEW },
      { icon: LuZap, label: tNav('sidebar.updates'), keywords: 'novedades actualizaciones', path: '/novedades', permission: PermissionCode.UPDATES_VIEW },
      // Configuration sub-sections
      { icon: LuSettings2, label: 'Configuración General', keywords: 'configuracion settings ajustes general datos empresa nombre logo', path: '/configuracion#tab=general', permission: PermissionCode.CONFIGURATION_VIEW },
      { icon: LuPalette, label: 'Tema y Colores', keywords: 'configuracion tema theme colores apariencia dark mode oscuro claro', path: '/configuracion#tab=general', permission: PermissionCode.CONFIGURATION_VIEW },
      { icon: LuGlobe, label: 'SEO', keywords: 'configuracion seo google busqueda titulo descripcion keywords meta', path: '/configuracion#tab=general', permission: PermissionCode.CONFIGURATION_VIEW },
      { icon: LuPhone, label: 'Contacto', keywords: 'configuracion contacto telefono email correo direccion', path: '/configuracion#tab=general', permission: PermissionCode.CONFIGURATION_VIEW },
      { icon: LuShield, label: 'Permisos', keywords: 'configuracion permisos roles acceso seguridad', path: '/configuracion#tab=general', permission: PermissionCode.CONFIGURATION_VIEW },
      { icon: LuLanguages, label: 'Idioma', keywords: 'configuracion idioma lenguaje language español ingles', path: '/configuracion#tab=general', permission: PermissionCode.CONFIGURATION_VIEW },
      { icon: LuSubscription, label: 'Suscripción', keywords: 'configuracion suscripcion plan pago facturacion mercadopago', path: '/configuracion#tab=general', permission: PermissionCode.CONFIGURATION_VIEW },
      { icon: LuStore, label: 'Sucursales', keywords: 'configuracion sucursales dealerships locales puntos venta', path: '/configuracion#tab=dealerships', permission: PermissionCode.CONFIGURATION_VIEW },
      { icon: LuFileText, label: 'Info Legal', keywords: 'configuracion legal rut razon social giro direccion representante', path: '/configuracion#tab=legal-info', permission: PermissionCode.CONFIGURATION_VIEW },
      { icon: LuClipboardList, label: 'Estados de Vehículos', keywords: 'configuracion estados vehiculos status', path: '/configuracion#tab=vehicles', permission: PermissionCode.CONFIGURATION_VIEW },
      { icon: LuListChecks, label: 'Checklist', keywords: 'configuracion checklist verificacion revision', path: '/configuracion#tab=checklist', permission: PermissionCode.CONFIGURATION_VIEW },
      { icon: LuBell, label: 'Notificaciones', keywords: 'configuracion notificaciones push alertas avisos', path: '/configuracion#tab=notifications', permission: PermissionCode.CONFIGURATION_VIEW },
    ];
  }, [userRole, isTenantOverride, tNav]);

  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filteredStaticItems = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const allowed = staticItems.filter(
      (item) => isSuperadmin || !item.permission || hasPermission(item.permission)
    );

    const normalizedQuery = normalize(trimmed);

    return allowed.filter((item) => {
      const searchable = normalize(`${item.label} ${item.keywords}`);
      return normalizedQuery.split(/\s+/).every((token) => searchable.includes(token));
    });
  }, [query, staticItems, isSuperadmin, hasPermission]);

  const go = useCallback(
    (path: string) => {
      if (path.includes('#')) {
        const [basePath, hash] = path.split('#');
        navigate(basePath);
        requestAnimationFrame(() => {
          window.location.hash = hash;
        });
      } else {
        navigate(path);
      }
      onOpenChange(false);
    },
    [navigate, onOpenChange]
  );

  const hasQuery = query.trim().length >= 2;
  const hasResults = vehicles.length > 0 || customers.length > 0 || filteredStaticItems.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-lg gap-0 [&>button]:hidden">
        {/* Search input */}
        <div className="flex items-center border-b px-4">
          <Search className="mr-3 h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar vehículos, clientes, secciones..."
            className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {hasQuery && searching && !hasResults && (
            <p className="py-10 text-center text-sm text-muted-foreground">Buscando...</p>
          )}

          {hasQuery && !hasResults && !searching && (
            <p className="py-10 text-center text-sm text-muted-foreground">No se encontraron resultados.</p>
          )}

          {/* Vehicles */}
          {vehicles.length > 0 && (
            <div className="p-1">
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Vehículos</p>
              {vehicles.map((v) => {
                const label = [v.brand?.name, v.model?.name, v.year].filter(Boolean).join(' ');
                return (
                  <button
                    key={`v-${v.id}`}
                    onClick={() => go(`/vehiculos/${v.id}`)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  >
                    {v.main_image ? (
                      <img
                        src={v.main_image}
                        alt={label}
                        className="h-10 w-14 rounded object-cover flex-shrink-0 bg-slate-100"
                      />
                    ) : (
                      <div className="h-10 w-14 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <LuCar className="h-5 w-5 text-slate-300" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium">{label || `Vehículo #${v.id}`}</span>
                      {v.license_plate && (
                        <span className="text-xs text-muted-foreground">{v.license_plate}</span>
                      )}
                    </div>
                    {v.price != null && (
                      <span className="ml-auto text-xs text-muted-foreground flex-shrink-0">
                        ${v.price.toLocaleString('es-CL')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Customers */}
          {customers.length > 0 && (
            <div className="p-1">
              {vehicles.length > 0 && <div className="mx-3 my-1 h-px bg-border" />}
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Clientes</p>
              {customers.map((c) => (
                <button
                  key={`c-${c.id}`}
                  onClick={() => go('/clientes')}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                >
                  <LuUser className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Sin nombre'}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {[c.rut, c.email, c.phone].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Static items */}
          {filteredStaticItems.length > 0 && (
            <div className="p-1">
              {(vehicles.length > 0 || customers.length > 0) && (
                <div className="mx-3 my-1 h-px bg-border" />
              )}
              <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Secciones</p>
              {filteredStaticItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.path + item.label}
                    onClick={() => go(item.path)}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                  >
                    <ItemIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
