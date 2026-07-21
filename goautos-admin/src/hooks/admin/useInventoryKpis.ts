import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateFilter } from './useSellerPerformance';
import {
  useDashboardVehicles,
  useDashboardStates,
  useDashboardSoldIds,
  useDashboardCosts,
  useDashboardStatusHistory,
  filterActiveVehicles,
  DashboardVehicle,
} from './useDashboardData';

export interface OldestVehicle {
  id: number;
  created_at: string;
  main_image: string | null;
  year: number | null;
  is_consigned: boolean;
  brands: { name: string } | null;
  models: { name: string } | null;
  daysInStock: number;
  daysPublished: number | null;
  firstPublishedAt: string | null;
}

export interface InventoryKpis {
  totalInventoryValue: number;
  averageVehiclePrice: number;
  inventoryTurnoverRate: number;
  vehiclesByStatus: Array<{ status: string; count: number; percentage: number }>;
  oldestVehicleDays: number;
  newestVehicleDays: number;
  avgPurchasePrice: number;
  totalActiveVehicles: number;
  /** Autos en stock SIN costo registrado (no entran al valor; hay que cargarles compra/consignación). */
  vehiclesWithoutCostInStock: number;
  oldestVehicles: OldestVehicle[];
  ownStockCount: number;
  ownStockValue: number;
  consignedStockCount: number;
  consignedStockValue: number;
  publishedStockCount: number;
  publishedStockValue: number;
  oldestPublishedDays: number;
  avgDaysPublished: number;
  vehiclesNeverPublished: number;
  oldestVehiclesByPublication: OldestVehicle[];
}

const DEFAULT_KPIS: InventoryKpis = {
  totalInventoryValue: 0,
  averageVehiclePrice: 0,
  inventoryTurnoverRate: 0,
  vehiclesByStatus: [],
  oldestVehicleDays: 0,
  newestVehicleDays: 0,
  avgPurchasePrice: 0,
  totalActiveVehicles: 0,
  vehiclesWithoutCostInStock: 0,
  oldestVehicles: [],
  ownStockCount: 0,
  ownStockValue: 0,
  consignedStockCount: 0,
  consignedStockValue: 0,
  publishedStockCount: 0,
  publishedStockValue: 0,
  oldestPublishedDays: 0,
  avgDaysPublished: 0,
  vehiclesNeverPublished: 0,
  oldestVehiclesByPublication: [],
};

export const useInventoryKpis = (clientId: number | undefined, range?: DateFilter) => {
  // ── Shared data (deduplicated across dashboard hooks) ──
  const { data: rawVehicles, isLoading: vehiclesLoading } = useDashboardVehicles(clientId);
  const { data: states, isLoading: statesLoading } = useDashboardStates(clientId);

  const allVehicleIds = useMemo(
    () => (rawVehicles || []).map((v) => v.id),
    [rawVehicles]
  );

  const { data: soldIds, isLoading: soldLoading } = useDashboardSoldIds(clientId, allVehicleIds);
  const { data: costs, isLoading: costsLoading } = useDashboardCosts(clientId, allVehicleIds);
  const { data: statusHistory, isLoading: historyLoading } = useDashboardStatusHistory(clientId, allVehicleIds);

  // ── Hook-specific query: vehicle extras (expenses) ──
  const { data: extrasMap = new Map<number, number>(), isLoading: extrasLoading } = useQuery({
    queryKey: ['inventoryKpis-extras', clientId],
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

  // ── Hook-specific query: turnover rate needs date-filtered sold count ──
  const { data: soldCountInPeriod = 0 } = useQuery({
    queryKey: [
      'inventoryKpis-turnover',
      clientId,
      range?.startDate?.getTime(),
      range?.endDate?.getTime(),
    ],
    queryFn: async () => {
      if (allVehicleIds.length === 0) return 0;

      let salesQuery = supabase
        .from('vehicles_sales')
        .select('vehicle_id', { count: 'exact', head: true })
        .in('vehicle_id', allVehicleIds)
        .eq('status', 'approved');

      if (range?.startDate) salesQuery = salesQuery.gte('created_at', range.startDate.toISOString());
      if (range?.endDate) salesQuery = salesQuery.lte('created_at', range.endDate.toISOString());

      const { count } = await salesQuery;
      return count || 0;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!clientId && allVehicleIds.length > 0,
    placeholderData: keepPreviousData,
  });

  // ── Compute KPIs from shared data ──
  const kpis = useMemo((): InventoryKpis => {
    if (!rawVehicles || !soldIds || !costs || !states) return DEFAULT_KPIS;

    // Apply date filter: only vehicles created up to end date
    let allVehicles = rawVehicles;
    if (range?.startDate) {
      const endDate = (range.endDate ?? new Date()).toISOString();
      allVehicles = allVehicles.filter((v) => v.created_at <= endDate);
    }

    // Apply consignment filter
    if (range?.consignmentFilter === 'consigned') {
      allVehicles = allVehicles.filter((v) => v.is_consigned);
    } else if (range?.consignmentFilter === 'not_consigned') {
      allVehicles = allVehicles.filter((v) => !v.is_consigned);
    }

    // Filter to active vehicles
    const filteredVehicles = filterActiveVehicles(allVehicles, soldIds);
    const totalActiveVehicles = filteredVehicles.length;
    const vehicleIds = filteredVehicles.map((v) => v.id);

    // ── Valoración del inventario (para "Valor Inventario") ──
    // COSTO INVERTIDO: purchase_price > agreed_price. SIN fallback a precio de
    // lista (eso inflaba con autos incompletos sin costo, reportado por MOVEK).
    // Para consignados, agreed_price es el costo proyectado (lo que se pagará al consignante).
    const { purchaseMap, consignmentMap } = costs;
    const vehicleIdSet = new Set(vehicleIds);
    const valuationMap = new Map<number, number>();
    consignmentMap.forEach((price, vehicleId) => {
      if (vehicleIdSet.has(vehicleId)) valuationMap.set(vehicleId, price);
    });
    purchaseMap.forEach((price, vehicleId) => {
      if (vehicleIdSet.has(vehicleId)) valuationMap.set(vehicleId, price);
    });
    const totalInventoryValue = Array.from(valuationMap.entries()).reduce(
      (sum, [id, v]) => sum + v + (extrasMap.get(id) || 0), 0
    );

    // Autos en stock sin costo registrado (no entran al valor) → avisar para cargarlo.
    const vehiclesWithoutCostInStock = filteredVehicles.filter(
      (v) => !valuationMap.has(v.id)
    ).length;

    // ── "Prom. Compra": promedio de costo real de adquisición (sólo owned). ──
    // Consignados no entran porque no hubo desembolso real — agreed_price es promesa.
    const ownedPurchaseValues = Array.from(purchaseMap.entries())
      .filter(([id]) => vehicleIds.includes(id))
      .map(([, price]) => price);
    const avgPurchasePrice = ownedPurchaseValues.length > 0
      ? ownedPurchaseValues.reduce((sum, p) => sum + p, 0) / ownedPurchaseValues.length
      : 0;

    // ── "Prom. Venta": promedio del precio de lista de los vehículos activos. ──
    const listPrices = filteredVehicles
      .map((v) => Number(v.price) || 0)
      .filter((p) => p > 0);
    const averageVehiclePrice = listPrices.length > 0
      ? listPrices.reduce((sum, p) => sum + p, 0) / listPrices.length
      : 0;

    // Per-category counts & values
    let ownStockCount = 0, ownStockValue = 0;
    let consignedStockCount = 0, consignedStockValue = 0;
    let publishedStockCount = 0, publishedStockValue = 0;
    filteredVehicles.forEach((v) => {
      const val = valuationMap.get(v.id) || 0;
      if (v.is_consigned) { consignedStockCount++; consignedStockValue += val; }
      else { ownStockCount++; ownStockValue += val; }
      // Use status.show_in_web (real-time) instead of is_published (stale flag)
      const isPublished = (v.status as any)?.show_in_web === true || v.is_published;
      if (isPublished) { publishedStockCount++; publishedStockValue += val; }
    });

    // ── Status distribution ──
    const statusCountMap = new Map<string, number>();
    const statusOrderMap = new Map<string, number>();

    states.forEach((s) => {
      const n = (s.name || '').toLowerCase();
      if (!n.includes('vendido') && !n.includes('sold') && !n.includes('reservado') && !n.includes('archivado')) {
        statusCountMap.set(s.name || '', 0);
        statusOrderMap.set(s.name || '', s.order ?? 999);
      }
    });

    filteredVehicles.forEach((v) => {
      const statusName = (v.status as any)?.name || 'Sin estado';
      statusCountMap.set(statusName, (statusCountMap.get(statusName) || 0) + 1);
    });

    const vehiclesByStatus = Array.from(statusCountMap.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: totalActiveVehicles > 0 ? (count / totalActiveVehicles) * 100 : 0,
      }))
      .sort((a, b) => (statusOrderMap.get(a.status) ?? 999) - (statusOrderMap.get(b.status) ?? 999));

    // ── Publication dates ──
    const webStateIds = states.filter((s) => s.show_in_web).map((s) => s.id);
    const firstPublicationMap = new Map<number, string>();

    if (statusHistory && webStateIds.length > 0) {
      for (const record of statusHistory) {
        if (
          vehicleIds.includes(record.vehicle_id) &&
          webStateIds.includes(record.new_status_id) &&
          !firstPublicationMap.has(record.vehicle_id)
        ) {
          firstPublicationMap.set(record.vehicle_id, record.changed_at);
        }
      }
    }

    // Fallback: if vehicle is published (by status or flag) but no history, use created_at
    filteredVehicles.forEach((v) => {
      const isPublished = (v.status as any)?.show_in_web === true || v.is_published;
      if (isPublished && !firstPublicationMap.has(v.id)) {
        firstPublicationMap.set(v.id, v.created_at);
      }
    });

    // ── Days in stock ──
    const now = Date.now();

    const vehiclesWithDays = filteredVehicles
      .map((v) => {
        const start = v.created_at ? new Date(v.created_at).getTime() : null;
        if (!start) return null;
        const daysInStock = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        if (daysInStock < 0 || !isFinite(daysInStock)) return null;

        const firstPublishedAt = firstPublicationMap.get(v.id) || null;
        let daysPublished: number | null = null;
        if (firstPublishedAt) {
          const publishedTime = new Date(firstPublishedAt).getTime();
          daysPublished = Math.floor((now - publishedTime) / (1000 * 60 * 60 * 24));
        }

        return {
          id: v.id,
          created_at: v.created_at,
          main_image: v.main_image,
          year: v.year,
          is_consigned: v.is_consigned,
          brands: v.brands,
          models: v.models,
          daysInStock,
          daysPublished,
          firstPublishedAt,
        };
      })
      .filter((v): v is OldestVehicle => v !== null)
      .sort((a, b) => b.daysInStock - a.daysInStock);

    const daysInStock = vehiclesWithDays.map((v) => v.daysInStock);
    const oldestVehicleDays = daysInStock.length > 0 ? daysInStock[0] : 0;
    const newestVehicleDays = daysInStock.length > 0 ? daysInStock[daysInStock.length - 1] : 0;
    const oldestVehicles = vehiclesWithDays.slice(0, 10);

    // Publication metrics
    const publishedVehicles = vehiclesWithDays.filter((v) => v.daysPublished !== null);
    const neverPublishedVehicles = vehiclesWithDays.filter((v) => v.daysPublished === null);

    const oldestPublishedDays = publishedVehicles.length > 0
      ? Math.max(...publishedVehicles.map((v) => v.daysPublished || 0))
      : 0;

    const avgDaysPublished = publishedVehicles.length > 0
      ? Math.round(publishedVehicles.reduce((sum, v) => sum + (v.daysPublished || 0), 0) / publishedVehicles.length)
      : 0;

    const oldestVehiclesByPublication = [...publishedVehicles]
      .sort((a, b) => (b.daysPublished || 0) - (a.daysPublished || 0))
      .slice(0, 10);

    // ── Turnover rate ──
    const st = range?.startDate;
    const en = range?.endDate;
    const toDays = (ms: number) => ms / (1000 * 60 * 60 * 24);
    const periodDays = st && en
      ? Math.max(1, toDays(en.getTime() - st.getTime()))
      : allVehicles.length > 0
        ? Math.max(1, toDays(Date.now() - Math.min(...allVehicles.map(v => new Date(v.created_at).getTime()))))
        : 365;
    const dailySalesRate = soldCountInPeriod / periodDays;
    const annualizedSales = dailySalesRate * 365;
    const inventoryTurnoverRate = totalActiveVehicles > 0 ? annualizedSales / totalActiveVehicles : 0;

    return {
      totalInventoryValue,
      averageVehiclePrice,
      inventoryTurnoverRate,
      vehiclesByStatus,
      oldestVehicleDays,
      newestVehicleDays,
      avgPurchasePrice,
      totalActiveVehicles,
      vehiclesWithoutCostInStock,
      oldestVehicles,
      ownStockCount,
      ownStockValue,
      consignedStockCount,
      consignedStockValue,
      publishedStockCount,
      publishedStockValue,
      oldestPublishedDays,
      avgDaysPublished,
      vehiclesNeverPublished: neverPublishedVehicles.length,
      oldestVehiclesByPublication,
    };
  }, [
    rawVehicles, soldIds, costs, states, statusHistory, soldCountInPeriod, extrasMap,
    range?.startDate?.getTime(), range?.endDate?.getTime(), range?.consignmentFilter,
  ]);

  const loading = vehiclesLoading || statesLoading || soldLoading || costsLoading || historyLoading || extrasLoading;

  return { kpis, loading };
};
