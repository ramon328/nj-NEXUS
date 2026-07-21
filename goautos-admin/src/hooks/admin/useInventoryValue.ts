import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateFilter } from './useSellerPerformance';
import {
  useDashboardVehicles,
  useDashboardSoldIds,
  useDashboardCosts,
  filterActiveVehicles,
} from './useDashboardData';

/**
 * Hook para calcular el valor total del inventario actual (vehículos NO vendidos).
 *
 * Incluye: todos los vehículos excepto vendidos (archivados SÍ se incluyen porque son stock).
 *
 * Valor por vehículo = COSTO INVERTIDO + gastos asociados (capital, no retail).
 *   Costo base (prioridad):
 *     1. purchase_price  (de vehicles_purchases)
 *     2. agreed_price    (de vehicles_consignments)
 *   Autos SIN costo registrado valen 0 — NO se usa el precio de lista como
 *   fallback (eso inflaba el inventario con autos incompletos, reportado por MOVEK).
 *   Gastos asociados: suma de vehicles_extras (type='expense') del vehículo.
 */
export const useInventoryValue = (clientId: number | undefined, dateFilter?: DateFilter) => {
  // ── Shared data (deduplicated across dashboard hooks) ──
  const { data: rawVehicles, isLoading: vehiclesLoading } = useDashboardVehicles(clientId);

  const allVehicleIds = useMemo(
    () => (rawVehicles || []).map((v) => v.id),
    [rawVehicles]
  );

  const { data: soldIds, isLoading: soldLoading } = useDashboardSoldIds(clientId, allVehicleIds);
  const { data: costs, isLoading: costsLoading } = useDashboardCosts(clientId, allVehicleIds);

  // ── Hook-specific query: vehicle extras (expenses) ──
  const { data: extrasMap = new Map<number, number>(), isLoading: extrasLoading } = useQuery({
    queryKey: ['inventoryValue-extras', clientId],
    queryFn: async () => {
      if (allVehicleIds.length === 0) return new Map<number, number>();

      const { data: extras } = await supabase
        .from('vehicles_extras')
        .select('vehicle_id, amount')
        .in('vehicle_id', allVehicleIds)
        .eq('type', 'expense');

      const map = new Map<number, number>();
      (extras || []).forEach((e) => {
        const current = map.get(e.vehicle_id) || 0;
        map.set(e.vehicle_id, current + (Number(e.amount) || 0));
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!clientId && allVehicleIds.length > 0,
    placeholderData: keepPreviousData,
  });

  // ── Compute inventory value from shared data ──
  const inventoryValue = useMemo((): number => {
    if (!rawVehicles || !soldIds || !costs) return 0;

    // Apply consignment filter
    let allVehicles = rawVehicles;
    if (dateFilter?.consignmentFilter === 'consigned') {
      allVehicles = allVehicles.filter((v) => v.is_consigned);
    } else if (dateFilter?.consignmentFilter === 'not_consigned') {
      allVehicles = allVehicles.filter((v) => !v.is_consigned);
    }

    // Filter: exclude sold/reserved/archived by status name AND by sales table
    const activeVehicles = filterActiveVehicles(allVehicles, soldIds);

    if (activeVehicles.length === 0) return 0;

    const { purchaseMap, consignmentMap } = costs;
    const activeIdSet = new Set(activeVehicles.map((v) => v.id));

    // Costo de adquisición por vehículo: agreed_price (consignación) y, con mayor
    // prioridad, purchase_price (compra). SIN fallback a precio de lista: un auto
    // sin costo registrado vale 0 (no infla el inventario con su precio retail).
    const priceMap = new Map<number, number>();
    consignmentMap.forEach((price, vehicleId) => {
      if (activeIdSet.has(vehicleId)) priceMap.set(vehicleId, price);
    });
    purchaseMap.forEach((price, vehicleId) => {
      if (activeIdSet.has(vehicleId)) priceMap.set(vehicleId, price);
    });

    // Total = costo de adquisición + gastos, sólo de autos CON costo registrado.
    // Los gastos de un auto sin costo no cuentan (no hay base de capital).
    let totalValue = 0;
    for (const v of activeVehicles) {
      const cost = priceMap.get(v.id);
      if (cost == null) continue;
      totalValue += cost + (extrasMap.get(v.id) || 0);
    }

    return totalValue;
  }, [rawVehicles, soldIds, costs, extrasMap, dateFilter?.consignmentFilter]);

  const loading = vehiclesLoading || soldLoading || costsLoading || extrasLoading;

  return { inventoryValue, loading };
};
