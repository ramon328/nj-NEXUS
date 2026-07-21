import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateFilter } from './useSellerPerformance';
import {
  useDashboardVehicles,
  useDashboardCosts,
} from './useDashboardData';

/**
 * Calcula el valor del inventario al cierre de cada mes (últimos 12 meses).
 *
 * Inventario de un mes = suma de valores de vehículos que:
 *   - Entraron antes del cierre de ese mes
 *   - NO se habían vendido al cierre de ese mes
 *
 * Incluye todos los vehículos (propios y consignados).
 * Prioridad de valor (consistente con useInventoryValue):
 *   1. purchase_price  (de vehicles_purchases)
 *   2. agreed_price    (de vehicles_consignments)
 *   3. price           (precio de lista, como fallback)
 */
export const useMonthlyInventoryValue = (
  clientId: number | undefined,
  dateFilter?: DateFilter
) => {
  // ── Shared data ──
  const { data: rawVehicles, isLoading: vehiclesLoading } = useDashboardVehicles(clientId);
  const allVehicleIds = useMemo(
    () => (rawVehicles || []).map((v) => v.id),
    [rawVehicles]
  );
  const { data: costs, isLoading: costsLoading } = useDashboardCosts(clientId, allVehicleIds);

  // ── Hook-specific query: sales with sale_date (needed for temporal filtering) ──
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['monthlyInventory-sales', clientId],
    queryFn: async () => {
      if (allVehicleIds.length === 0) return [];
      const { data, error } = await supabase
        .from('vehicles_sales')
        .select('vehicle_id, sale_date')
        .in('vehicle_id', allVehicleIds)
        .eq('status', 'approved');
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!clientId && allVehicleIds.length > 0,
    placeholderData: keepPreviousData,
  });

  // ── Hook-specific query: vehicle extras (expenses) ──
  const { data: extrasMap = new Map<number, number>(), isLoading: extrasLoading } = useQuery({
    queryKey: ['monthlyInventory-extras', clientId],
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

  // ── Hook-specific query: purchase dates (for accurate entry dates) ──
  const { data: purchaseDates } = useQuery({
    queryKey: ['monthlyInventory-purchaseDates', clientId],
    queryFn: async () => {
      if (allVehicleIds.length === 0) return new Map<number, string>();
      const { data } = await supabase
        .from('vehicles_purchases')
        .select('vehicle_id, purchase_date')
        .in('vehicle_id', allVehicleIds)
        .not('purchase_date', 'is', null);
      const map = new Map<number, string>();
      (data || []).forEach((p: any) => {
        if (p.purchase_date) map.set(p.vehicle_id, p.purchase_date);
      });
      return map;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!clientId && allVehicleIds.length > 0,
    placeholderData: keepPreviousData,
  });

  // ── Compute monthly inventory from shared data ──
  const monthlyInventory = useMemo((): Record<string, number> => {
    if (!rawVehicles || !costs || !salesData) return {};

    const { purchaseMap, consignmentMap } = costs;

    // Map vehicle_id -> sale_date (for temporal sold detection)
    const saleMap = new Map<number, string>();
    const soldWithoutDate = new Set<number>();
    salesData.forEach((s) => {
      if (s.sale_date) {
        saleMap.set(s.vehicle_id, s.sale_date);
      } else {
        soldWithoutDate.add(s.vehicle_id);
      }
    });

    // Vehicles with "vendido"/"sold" status but no sales record
    const soldByStatus = new Set<number>();
    rawVehicles.forEach((v) => {
      const statusName = (v.status as any)?.name?.toLowerCase() || '';
      if (statusName.includes('vendido') || statusName.includes('sold')) {
        if (!saleMap.has(v.id)) {
          soldByStatus.add(v.id);
        }
      }
    });

    // Build entries with value and entry date
    type Entry = { vehicleId: number; value: number; entryDate: string; isConsigned: boolean };
    const entryMap = new Map<number, Entry>();

    // COSTO INVERTIDO solamente. SIN fallback a precio de lista: los autos sin
    // costo registrado no entran al valor histórico (no inflan, ver useInventoryValue).
    // Las entradas se arman exclusivamente desde consignación/compra.

    // Consignment prices (from shared costs)
    consignmentMap.forEach((price, vehicleId) => {
      if (soldWithoutDate.has(vehicleId) || soldByStatus.has(vehicleId)) return;
      const vehicle = rawVehicles.find((v) => v.id === vehicleId);
      if (price > 0 && vehicle?.created_at) {
        entryMap.set(vehicleId, {
          vehicleId,
          value: price,
          entryDate: vehicle.created_at,
          isConsigned: true,
        });
      }
    });

    // Override: purchase prices (highest priority, from shared costs)
    purchaseMap.forEach((price, vehicleId) => {
      if (soldWithoutDate.has(vehicleId) || soldByStatus.has(vehicleId)) return;
      const vehicle = rawVehicles.find((v) => v.id === vehicleId);
      if (price > 0 && vehicle?.created_at) {
        entryMap.set(vehicleId, {
          vehicleId,
          value: price,
          entryDate: purchaseDates?.get(vehicleId) || vehicle.created_at,
          isConsigned: false,
        });
      }
    });

    const entries = Array.from(entryMap.values());

    // Consignment filter
    const cf = dateFilter?.consignmentFilter || 'all';
    const filtered = entries.filter((e) => {
      if (cf === 'consigned') return e.isConsigned;
      if (cf === 'not_consigned') return !e.isConsigned;
      return true;
    });

    // Generate months
    const now = new Date();
    const monthAbbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    let rangeStart: Date;
    const rangeEnd = dateFilter?.endDate || now;

    if (dateFilter?.startDate) {
      rangeStart = dateFilter.startDate;
    } else {
      rangeStart = now;
      for (const e of entries) {
        const d = new Date(e.entryDate);
        if (d < rangeStart) rangeStart = d;
      }
    }

    const months: { key: string; endDate: Date }[] = [];
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

    while (cursor <= endMonth) {
      const endOfMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      const yr = String(cursor.getFullYear() % 100).padStart(2, '0');
      months.push({ key: `${monthAbbr[cursor.getMonth()]} ${yr}`, endDate: endOfMonth });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // Helper: calculate inventory at a given date
    const inventoryAtDate = (dateStr: string) => {
      let total = 0;
      for (const e of filtered) {
        const entryDate = e.entryDate.slice(0, 10);
        if (entryDate > dateStr) continue;
        const saleDate = saleMap.get(e.vehicleId);
        if (saleDate && saleDate.slice(0, 10) <= dateStr) continue;
        total += e.value + (extrasMap.get(e.vehicleId) || 0);
      }
      return total;
    };

    // For each end of month: sum values of vehicles in stock
    const result: Record<string, number> = {};
    for (const m of months) {
      const endStr = m.endDate.toISOString().slice(0, 10);
      result[m.key] = inventoryAtDate(endStr);
    }

    // Also generate daily data (key ISO: "YYYY-MM-DD") for daily chart view
    if (dateFilter?.startDate && dateFilter?.endDate) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      const dailyEnd = rangeEnd > today ? today : rangeEnd;
      const dayCursor = new Date(rangeStart);
      while (dayCursor <= dailyEnd) {
        const isoKey = dayCursor.toISOString().slice(0, 10);
        result[isoKey] = inventoryAtDate(isoKey);
        dayCursor.setDate(dayCursor.getDate() + 1);
      }
    }

    return result;
  }, [rawVehicles, costs, salesData, extrasMap, purchaseDates, dateFilter?.consignmentFilter, dateFilter?.startDate, dateFilter?.endDate]);

  const loading = vehiclesLoading || costsLoading || salesLoading || extrasLoading;

  return { monthlyInventory, loading };
};
