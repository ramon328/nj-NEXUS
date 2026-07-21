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

export const useVehicles = () => {
  const { clientId, user, userRole } = useAuth();
  const { hasPermission } = usePermissions();
  const { data: clientConfig } = useClientConfig();
  // Sedes visibles (restricción por rol/asignación + selección del TopBar), ya
  // resueltas: null = sin filtro de sede.
  const { visibleDealershipIds } = useActiveDealership();
  const [rawVehicles, setRawVehicles] = useState<Vehicle[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnce = useRef(false);
  const lastFiltersRef = useRef<VehiculosFilters | undefined>();

  const applyClientSideFilters = useCallback(
    (vehicles: Vehicle[], filters?: VehiculosFilters) => {
      if (!filters) return vehicles;

      let result = [...vehicles];

      // Apply search filter (multi-token, searches across all fields)
      if (filters.search && filters.search.trim()) {
        result = filterVehiclesBySearch(result, filters.search);
      }

      // Apply status filter
      if (filters.status && filters.status.length > 0) {
        result = result.filter(
          (vehicle) =>
            vehicle.status_id &&
            filters.status.includes(vehicle.status_id.toString())
        );
      }

      // Apply seller filter
      if (filters.seller && filters.seller !== 'all') {
        result = result.filter(
          (vehicle) => vehicle.seller_id?.toString() === filters.seller
        );
      }

      // Apply consigned filter
      if (filters.consigned && filters.consigned !== 'all') {
        const isConsigned = filters.consigned === 'true';
        result = result.filter(
          (vehicle) => vehicle.is_consigned === isConsigned
        );
      }

      // Apply stock type filter
      if (filters.stockType && filters.stockType !== 'all') {
        result = result.filter(
          (vehicle) => (vehicle.stock_type || 'online') === filters.stockType
        );
      }

      // Apply dealership filter
      if (filters.dealershipId && filters.dealershipId !== 'all') {
        result = result.filter(
          (vehicle) => vehicle.dealership_id?.toString() === filters.dealershipId
        );
      }

      return result;
    },
    []
  );

  const fetchVehicles = useCallback(
    async (filters?: VehiculosFilters) => {
      if (!clientId) return;

      try {
        // Only show loading spinner on first fetch — subsequent fetches
        // update data silently so tab switches don't flash a loader
        if (!hasLoadedOnce.current) {
          setIsLoading(true);
        }

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
      `
          )
          .eq('client_id', clientId)
          .eq('show_in_stock', true);

        // Apply server-side filters
        if (filters) {
          const { search, status, seller, consigned } = filters;

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

          // Stock type filter
          const { stockType, dealershipId } = filters as any;
          if (stockType && stockType !== 'all') {
            query = query.eq('stock_type', stockType);
          }

          // Dealership filter
          if (dealershipId && dealershipId !== 'all') {
            query = query.eq('dealership_id', parseInt(dealershipId));
          }

          // Alert filter (deep-link from smart alerts)
          if ((filters as any).alertFilter) {
            switch ((filters as any).alertFilter) {
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
                const brandId = (filters as any).alertFilterBrandId;
                if (brandId) query = query.eq('brand_id', parseInt(brandId));
                break;
              }
            }
          }
        }

        // Apply seller restrictions: only show own vehicles when client config
        // restricts sellers AND user doesn't have the vehicles.view permission
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

          if (userData?.id) {
            query = query.eq('seller_id', userData.id);
          }
        }

        // Restricción por sede: autos de las sedes visibles O visibles-para-todas
        // (dealership_id NULL). Compone con AND sobre el resto de filtros.
        if (visibleDealershipIds && visibleDealershipIds.length > 0) {
          query = query.or(
            `dealership_id.in.(${visibleDealershipIds.join(',')}),dealership_id.is.null`
          );
        }

        // Default sorting
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching vehicles:', error);
          toast({
            title: 'Error',
            description: 'No se pudieron cargar los vehículos',
            variant: 'destructive',
          });
          return;
        }

        // Store raw data and apply client-side filters
        setRawVehicles(data || []);
        lastFiltersRef.current = filters;
        const filteredData = applyClientSideFilters(data || [], filters);
        setVehicles(filteredData);
      } catch (error) {
        console.error('Error in fetchVehicles:', error);
        toast({
          title: 'Error',
          description: 'Error inesperado al cargar vehículos',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        hasLoadedOnce.current = true;
      }
    },
    [clientId, user, hasPermission, applyClientSideFilters, visibleDealershipIds]
  );

  // Re-apply client-side filters without re-fetching from Supabase
  const refilter = useCallback(
    (filters?: VehiculosFilters) => {
      if (rawVehicles.length > 0) {
        setVehicles(applyClientSideFilters(rawVehicles, filters));
      }
    },
    [rawVehicles, applyClientSideFilters]
  );

  // Patch a single vehicle in the local cache without re-fetching.
  // Used after a CONFIRMED drag-drop status change in the board so that a later
  // client-side refilter (e.g. clearing the search box) rebuilds the visible
  // list from an up-to-date `rawVehicles` instead of reverting the card to its
  // old column. The DB write happens separately in useStatusUpdate; this only
  // keeps the in-memory cache in sync. Both arrays are mapped so the patch
  // survives a refilter and reflects immediately in the current view.
  const patchVehicle = useCallback(
    (vehicleId: number, patch: Partial<Vehicle>) => {
      const apply = (list: Vehicle[]) =>
        list.map((v) => (v.id === vehicleId ? { ...v, ...patch } : v));
      setRawVehicles((prev) => apply(prev));
      setVehicles((prev) => apply(prev));
    },
    []
  );

  const deleteVehicle = async (vehicleId: number) => {
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

      setVehicles(vehicles.filter((v) => v.id !== vehicleId));
      toast({
        title: 'Éxito',
        description: 'Vehículo eliminado correctamente',
      });
      return true;
    } catch (error) {
      console.error('Error in deleteVehicle:', error);
      return false;
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    if (clientId) {
      fetchVehicles();
    }
  }, [clientId]);

  return {
    vehicles,
    isLoading,
    fetchVehicles,
    refilter,
    patchVehicle,
    deleteVehicle,
  };
};
