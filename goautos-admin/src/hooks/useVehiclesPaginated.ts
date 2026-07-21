import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useClientConfig } from '@/hooks/useClientConfig';
import { useActiveDealership } from '@/hooks/useActiveDealership';
import { PermissionCode } from '@/types/permissions';
import { toast } from '@/hooks/use-toast';
import { Vehicle } from '@/types/vehicle';
import { VehiculosFilters } from '@/components/vehiculos/VehiculosFilter';
import { filterVehiclesBySearch } from '@/utils/vehicleSearchUtils';
import { removeFromChileautos } from '@/services/chileautosService';
import {
  buildSyntheticSortKeys,
  isSyntheticSortField,
  sortVehiclesByKeys,
} from '@/utils/vehicleSyntheticSort';

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: VehiculosFilters;
}

interface UseVehiclesPaginatedReturn {
  vehicles: Vehicle[];
  isLoading: boolean;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  fetchVehicles: (options: PaginationOptions) => Promise<void>;
  deleteVehicle: (id: number) => Promise<boolean>;
  setPage: (page: number) => void;
}

export const useVehiclesPaginated = (): UseVehiclesPaginatedReturn => {
  const { clientId, user, userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const { data: clientConfig } = useClientConfig();
  // Sedes que el usuario puede ver (restricción por rol/asignación + selección del
  // TopBar), ya resueltas en una sola lista: null = sin filtro de sede.
  const { visibleDealershipIds } = useActiveDealership();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // Could be configurable
  // After the first successful load we keep showing the existing rows during
  // refetches, so the table doesn't flash a full-screen spinner on every
  // pagination / sort / filter change.
  const hasLoadedOnce = useRef(false);
  // Request-sequence guard. Each fetch claims an id at start; on completion it
  // only commits its results if it's still the latest in-flight request. This
  // prevents out-of-order completions (e.g. a slow text-search full-table fetch
  // racing against a fast paginated fetch) from clobbering currentPage/vehicles
  // and re-triggering the fetch effect, which made the table "jump" between
  // pages and flicker when searching right after changing pages.
  const requestIdRef = useRef(0);

  const totalPages = Math.ceil(totalCount / pageSize);

  const buildQuery = useCallback(
    (options: PaginationOptions, skipTextSearch = false) => {
      let query = supabase
        .from('vehicles')
        .select(
          `
        *,
        category:category_id(name),
        status:status_id(name, color, order),
        brand:brand_id(name),
        model:model_id(name),
        color:color_id(name),
        condition:condition_id(name),
        fuel_type:fuel_type_id(name),
        seller:seller_id(id, first_name, last_name)
      `,
          { count: 'exact' }
        )
        .eq('client_id', clientId)
        .eq('show_in_stock', true);

      // Apply filters
      if (options.filters) {
        const { search, status, seller, consigned, stockType } = options.filters;

        // All search is done client-side for multi-field matching
        // (year, price, days in stock, consignment, etc.)

        // Status filter
        if (status && status.length > 0) {
          query = query.in(
            'status_id',
            status.map((s) => parseInt(s))
          );
        }

        // Seller filter
        if (seller && seller !== 'all') {
          query = query.eq('seller_id', parseInt(seller));
        }

        // Consigned filter
        if (consigned && consigned !== 'all') {
          const isConsigned = consigned === 'true';
          query = query.eq('is_consigned', isConsigned);
        }

        // Stock type filter (online / dealership)
        if (stockType && stockType !== 'all') {
          query = query.eq('stock_type', stockType);
        }

        // Dealership filter (specific sucursal)
        const { dealershipId } = options.filters as any;
        if (dealershipId && dealershipId !== 'all') {
          query = query.eq('dealership_id', parseInt(dealershipId));
        }

        // Alert filter (deep-link from smart alerts)
        if (options.filters.alertFilter) {
          switch (options.filters.alertFilter) {
            case 'unpublished':
              query = query.eq('is_published', false);
              break;
            case 'no-photo':
              query = query.is('main_image', null);
              break;
            case 'old-stock': {
              const threshold90 = new Date(Date.now() - 90 * 86400000).toISOString();
              const threshold300 = new Date(Date.now() - 300 * 86400000).toISOString();
              query = query.lte('created_at', threshold90).gte('created_at', threshold300);
              break;
            }
            case 'liquidate': {
              const threshold300 = new Date(Date.now() - 300 * 86400000).toISOString();
              query = query.lte('created_at', threshold300);
              break;
            }
            case 'slow-brand': {
              const brandId = (options.filters as any).alertFilterBrandId;
              if (brandId) query = query.eq('brand_id', parseInt(brandId));
              break;
            }
          }
        }
      }

      // Atajo "Recientes" del filtro — pre-setea sort por:
      //  - 'sold': updated_at desc (los vendidos típicamente se actualizan al cerrar)
      //  - 'consigned': created_at desc (el consigned filter ya se aplicó arriba)
      //  - 'updated': updated_at desc
      const recentView = options.filters?.recentView;

      // Apply sorting (low-turnover overrides to oldest first).
      // Synthetic sort fields (joins/calculated) are handled client-side after
      // fetching all rows; skip server-side order for them and fall back to created_at.
      const isLowTurnover = options.filters?.alertFilter === 'low-turnover';
      const synthetic = isSyntheticSortField(options.sortField);
      if (isLowTurnover) {
        query = query.order('created_at', { ascending: true });
      } else if (recentView === 'sold' || recentView === 'updated') {
        query = query.order('updated_at', { ascending: false, nullsFirst: false });
      } else if (recentView === 'consigned') {
        query = query.order('created_at', { ascending: false });
      } else if (synthetic) {
        query = query.order('created_at', { ascending: false });
      } else if (options.sortField) {
        const ascending = options.sortDirection === 'asc';

        switch (options.sortField) {
          case 'vehicle':
            query = query
              .order('brand_id', { ascending })
              .order('model_id', { ascending });
            break;
          case 'seller':
            query = query.order('seller_id', {
              ascending,
              nullsFirst: !ascending,
            });
            break;
          case 'status':
            query = query.order('status_id', { ascending });
            break;
          case 'category':
            query = query.order('category_id', { ascending });
            break;
          case 'color':
            query = query.order('color_id', { ascending });
            break;
          case 'condition':
            query = query.order('condition_id', { ascending });
            break;
          case 'fuel_type':
            query = query.order('fuel_type_id', { ascending });
            break;
          case 'created_at':
            query = query.order('created_at', { ascending });
            break;
          default:
            query = query.order(options.sortField, { ascending });
        }
      } else {
        // Default sorting
        query = query.order('created_at', { ascending: false });
      }

      return query;
    },
    [clientId]
  );

  const applyClientSideFilters = useCallback(
    (vehicles: Vehicle[], filters?: VehiculosFilters) => {
      if (!filters?.search || !filters.search.trim()) {
        return vehicles;
      }
      return filterVehiclesBySearch(vehicles, filters.search);
    },
    []
  );

  const fetchVehicles = useCallback(
    async (options: PaginationOptions) => {
      if (!clientId) return;

      // Claim this request's sequence number. Any state write below is gated on
      // this still being the latest request when the await resolves.
      const reqId = ++requestIdRef.current;
      const isStale = () => reqId !== requestIdRef.current;

      try {
        if (!hasLoadedOnce.current) {
          setIsLoading(true);
        }

        // Any search term requires client-side filtering (multi-field matching)
        const hasTextSearch =
          !!options.filters?.search && !!options.filters.search.trim();
        // Synthetic sort fields require fetching all rows + sorting client-side
        const hasSyntheticSort = isSyntheticSortField(options.sortField);
        const needsFullFetch = hasTextSearch || hasSyntheticSort;

        // Atajo "Últimos vendidos": pre-traemos IDs de ventas recientes y
        // filtramos la query principal por esos IDs, preservando el orden.
        let soldVehicleIds: number[] | null = null;
        if (options.filters?.recentView === 'sold') {
          const { data: salesRows } = await supabase
            .from('vehicles_sales')
            .select('vehicle_id, created_at')
            .order('created_at', { ascending: false })
            .limit(500);
          const seen = new Set<number>();
          soldVehicleIds = [];
          for (const row of salesRows ?? []) {
            const vid = (row as any).vehicle_id;
            if (vid != null && !seen.has(vid)) {
              seen.add(vid);
              soldVehicleIds.push(vid);
            }
          }
        }

        // Restricción por sede (sucursal). `visibleDealershipIds`:
        //   - null  => sin restricción de sede (usuario ve todas).
        //   - array => solo esas sedes O los autos "visibles para todas" (dealership_id
        //              NULL). Compone con AND sobre client_id / seller_id / filtros.
        // Se captura acá para reconstruir la query idéntica en el reintento de página 1.
        const sedeRestrictIds =
          visibleDealershipIds && visibleDealershipIds.length > 0
            ? visibleDealershipIds
            : null;

        // 1. Resolver restricción de vendedor ANTES de construir la query, para
        // poder reconstruirla idéntica en el reintento de página 1 (416 abajo)
        // sin repetir el fetch del usuario.
        let sellerRestrictId: number | null = null;
        if (
          !hasPermission(PermissionCode.VEHICLES_VIEW) &&
          clientConfig?.sellers_see_all_vehicles === false
        ) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', user?.id)
            .single();

          if (userError) {
            console.error('Error finding seller ID:', userError);
            toast({
              title: 'Error',
              description: 'No se pudo identificar el vendedor',
              variant: 'destructive',
            });
            return;
          }

          if (userData?.id) sellerRestrictId = userData.id;
        }

        // Atajo "vendidos" sin ventas registradas todavía → resultado vacío.
        if (soldVehicleIds !== null && soldVehicleIds.length === 0) {
          if (isStale()) return;
          setVehicles([]);
          setTotalCount(0);
          setCurrentPage(options.page);
          setIsLoading(false);
          hasLoadedOnce.current = true;
          return;
        }

        // Construye una query nueva con todos los modificadores aplicados. La
        // reutilizamos para el fetch inicial y para el reintento de página 1,
        // ya que los query builders de supabase son de un solo uso.
        const buildModifiedQuery = () => {
          let q = buildQuery(options, false);
          if (soldVehicleIds !== null && soldVehicleIds.length > 0) {
            q = q.in('id', soldVehicleIds);
          }
          if (sellerRestrictId != null) {
            q = q.eq('seller_id', sellerRestrictId);
          }
          // Filtro de sede: autos de las sedes visibles O visibles-para-todas (NULL).
          if (sedeRestrictIds != null) {
            q = q.or(
              `dealership_id.in.(${sedeRestrictIds.join(',')}),dealership_id.is.null`
            );
          }
          return q;
        };

        // 2. Fetch vehicles
        let data: any[] = [];
        let count = 0;
        let effectivePage = options.page;
        if (needsFullFetch) {
          // Text search or synthetic sort: fetch all rows then process client-side
          const { data: allData, error } = await buildModifiedQuery();
          if (error) {
            console.error('Error fetching vehicles:', error);
            toast({
              title: 'Error',
              description: 'No se pudieron cargar los vehículos',
              variant: 'destructive',
            });
            return;
          }
          let processed = applyClientSideFilters(allData || [], options.filters);
          if (hasSyntheticSort && options.sortField) {
            const keys = await buildSyntheticSortKeys(
              processed as Vehicle[],
              options.sortField as any
            );
            processed = sortVehiclesByKeys(
              processed,
              keys,
              options.sortDirection || 'desc'
            );
          }
          count = processed.length;
          // Paginate client-side
          const from = (options.page - 1) * options.pageSize;
          data = processed.slice(from, from + options.pageSize);
        } else {
          // For non-text searches or numeric ID searches, use server-side pagination
          const runRange = async (page: number) => {
            const from = (page - 1) * options.pageSize;
            const to = from + options.pageSize - 1;
            return await buildModifiedQuery().range(from, to);
          };

          let { data: queryData, count: queryCount, error } = await runRange(
            options.page
          );

          // PostgREST responde 416 (code PGRST103) cuando el offset solicitado
          // supera el total de filas. Pasa al entrar a un cliente con menos
          // vehículos que la página recordada en el store (offset 40 sobre 5
          // filas, etc.). En vez de mostrar "no se pudieron cargar los
          // vehículos", reintentamos en la página 1 y corregimos currentPage
          // para que la UI se sincronice.
          if (error && error.code === 'PGRST103' && options.page > 1) {
            effectivePage = 1;
            ({ data: queryData, count: queryCount, error } = await runRange(1));
          }

          if (error) {
            console.error('Error fetching vehicles:', error);
            toast({
              title: 'Error',
              description: 'No se pudieron cargar los vehículos',
              variant: 'destructive',
            });
            return;
          }
          data = queryData || [];
          count = queryCount || 0;
        }

        // 3. NO mapear transfer_value desde vehicles_sales, solo usar el de vehicles
        // Si una request más nueva ya partió, descartar este resultado viejo:
        // evita que un fetch lento (búsqueda full-table) que llega tarde pise
        // la página/grilla y re-dispare el efecto en bucle.
        if (isStale()) return;
        setVehicles(data || []);
        setTotalCount(count);
        setCurrentPage(effectivePage);
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      } finally {
        // Solo la request vigente puede apagar el loader / marcar carga inicial,
        // para que una completion vieja no toggle-ee isLoading bajo la nueva.
        if (!isStale()) {
          setIsLoading(false);
          hasLoadedOnce.current = true;
        }
      }
    },
    [clientId, buildQuery, hasPermission, user, visibleDealershipIds]
  );

  const deleteVehicle = useCallback(
    async (vehicleId: number): Promise<boolean> => {
      try {
        // Close active MercadoLibre publications before deleting
        const { data: meliPosts } = await supabase
          .from('meli_post')
          .select('id, status')
          .eq('vehicle_id', vehicleId)
          .not('status', 'eq', 'closed');

        if (meliPosts && meliPosts.length > 0) {
          await Promise.allSettled(
            meliPosts.map((post) =>
              supabase.functions.invoke('update-mercadolibre-publication-status', {
                body: { publicationId: post.id, action: 'close' },
              })
            )
          );
        }

        // Despublicar de ChileAutos ANTES de borrar el vehículo (evita publicación zombi).
        // Solo si existe el aviso; si la API falla, abortamos el borrado para no dejar huérfana.
        const { data: caListing } = await supabase
          .from('chileautos_listing')
          .select('id')
          .eq('vehicle_id', vehicleId)
          .limit(1);
        if (caListing && caListing.length > 0) {
          const caResult = await removeFromChileautos(vehicleId, clientId);
          if (!caResult.success) {
            console.error('Error despublicando de ChileAutos:', caResult.error);
            toast({
              title: 'No se pudo despublicar de ChileAutos',
              description:
                caResult.error ||
                'No se eliminó el vehículo para no dejar la publicación activa. Reintenta.',
              variant: 'destructive',
            });
            return false;
          }
        }

        const { error } = await supabase
          .from('vehicles')
          .delete()
          .eq('id', vehicleId)
          .eq('client_id', clientId);

        if (error) {
          console.error('Error deleting vehicle:', error);
          toast({
            title: 'Error',
            description: 'No se pudo eliminar el vehículo',
            variant: 'destructive',
          });
          return false;
        }

        // Update local state
        setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
        setTotalCount((prev) => prev - 1);

        toast({
          title: 'Éxito',
          description: 'Vehículo eliminado correctamente',
        });
        return true;
      } catch (error) {
        console.error('Error in deleteVehicle:', error);
        return false;
      }
    },
    [clientId]
  );

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    vehicles,
    isLoading,
    totalCount,
    totalPages,
    currentPage,
    fetchVehicles,
    deleteVehicle,
    setPage,
  };
};
