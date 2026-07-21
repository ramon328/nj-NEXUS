/**
 * Shared dashboard data hooks.
 *
 * Multiple dashboard hooks (useInventoryKpis, useVehicleStats, useSmartAlerts,
 * useBrandDistribution, etc.) all query the same Supabase tables independently.
 * These shared hooks wrap the common queries with React Query so that concurrent
 * callers share a single network request and benefit from caching.
 *
 * Usage: call these hooks from any dashboard hook that needs the data.
 * React Query automatically deduplicates identical queryKeys.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardVehicle {
  id: number;
  price: number | null;
  created_at: string;
  is_consigned: boolean;
  is_published: boolean;
  main_image: string | null;
  year: number | null;
  show_in_stock: boolean;
  seller_id: number | null;
  status_id: number | null;
  brand_id: number | null;
  model_id: number | null;
  brands: { name: string } | null;
  models: { name: string } | null;
  status: { id: number; name: string; color: string | null; order: number | null; show_in_web?: boolean } | null;
}

export interface DashboardState {
  id: number;
  name: string | null;
  order: number | null;
  show_in_web: boolean | null;
  color: string | null;
}

export interface AcquisitionCosts {
  purchaseMap: Map<number, number>;
  consignmentMap: Map<number, number>;
}

// ─── Fetch functions ─────────────────────────────────────────────────────────

async function fetchDashboardVehicles(clientId: number): Promise<DashboardVehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      id, price, created_at, is_consigned, is_published,
      main_image, year, show_in_stock, seller_id, status_id, brand_id, model_id,
      brands:brand_id(name),
      models:model_id(name),
      status:status_id(id, name, color, order, show_in_web)
    `)
    .eq('client_id', clientId)
    .not('status_id', 'is', null);

  if (error) {
    console.error('[useDashboardVehicles] Error:', error);
    throw error;
  }
  return (data || []) as unknown as DashboardVehicle[];
}

async function fetchDashboardStates(clientId: number): Promise<DashboardState[]> {
  const { data, error } = await supabase
    .from('clients_vehicles_states')
    .select('id, name, order, show_in_web, color')
    .eq('client_id', clientId)
    .order('order');

  if (error) {
    console.error('[useDashboardStates] Error:', error);
    throw error;
  }
  return (data || []) as DashboardState[];
}

async function fetchSoldVehicleIds(vehicleIds: number[]): Promise<Set<number>> {
  if (vehicleIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('vehicles_sales')
    .select('vehicle_id')
    .in('vehicle_id', vehicleIds)
    .eq('status', 'approved');

  if (error) {
    console.error('[useDashboardSoldIds] Error:', error);
    throw error;
  }
  return new Set((data || []).map((s) => s.vehicle_id));
}

async function fetchAcquisitionCosts(vehicleIds: number[]): Promise<AcquisitionCosts> {
  if (vehicleIds.length === 0) {
    return { purchaseMap: new Map(), consignmentMap: new Map() };
  }

  const [purchasesResult, consignmentsResult] = await Promise.all([
    supabase
      .from('vehicles_purchases')
      .select('vehicle_id, purchase_price')
      .in('vehicle_id', vehicleIds),
    supabase
      .from('vehicles_consignments')
      .select('vehicle_id, agreed_price')
      .in('vehicle_id', vehicleIds),
  ]);

  const purchaseMap = new Map<number, number>();
  (purchasesResult.data || []).forEach((p) => {
    const price = Number(p.purchase_price) || 0;
    if (price > 0) purchaseMap.set(p.vehicle_id, price);
  });

  const consignmentMap = new Map<number, number>();
  (consignmentsResult.data || []).forEach((c) => {
    const price = Number(c.agreed_price) || 0;
    if (price > 0) consignmentMap.set(c.vehicle_id, price);
  });

  return { purchaseMap, consignmentMap };
}

async function fetchStatusHistory(vehicleIds: number[]) {
  if (vehicleIds.length === 0) return [];

  const { data, error } = await supabase
    .from('vehicles_status_history')
    .select('vehicle_id, new_status_id, changed_at')
    .in('vehicle_id', vehicleIds)
    .order('changed_at', { ascending: true });

  if (error) {
    console.error('[useDashboardStatusHistory] Error:', error);
    throw error;
  }
  return data || [];
}

// ─── Shared React Query hooks ────────────────────────────────────────────────

/**
 * All vehicles for the client with common relations.
 * Shared by: useInventoryKpis, useVehicleStats, useSmartAlerts,
 * useBrandDistribution, useBusinessKpis, useAdminStats, etc.
 *
 * staleTime: 2 min — vehicles change infrequently during a dashboard session.
 */
export function useDashboardVehicles(clientId: number | undefined) {
  return useQuery({
    queryKey: ['dashboard-vehicles', clientId],
    queryFn: () => fetchDashboardVehicles(clientId!),
    staleTime: 2 * 60 * 1000,
    enabled: !!clientId,
  });
}

/**
 * All vehicle workflow states for the client.
 * Shared by: useInventoryKpis, useSalesAnalytics, useBusinessKpis.
 *
 * staleTime: 10 min — states rarely change.
 */
export function useDashboardStates(clientId: number | undefined) {
  return useQuery({
    queryKey: ['dashboard-states', clientId],
    queryFn: () => fetchDashboardStates(clientId!),
    staleTime: 10 * 60 * 1000,
    enabled: !!clientId,
  });
}

/**
 * Set of vehicle IDs that have an approved sale.
 * Shared by: useInventoryKpis, useVehicleStats, useSmartAlerts, etc.
 *
 * Depends on vehicle IDs from useDashboardVehicles.
 */
export function useDashboardSoldIds(clientId: number | undefined, vehicleIds: number[]) {
  return useQuery({
    queryKey: ['dashboard-sold-ids', clientId, vehicleIds.length],
    queryFn: () => fetchSoldVehicleIds(vehicleIds),
    staleTime: 2 * 60 * 1000,
    enabled: !!clientId && vehicleIds.length > 0,
  });
}

/**
 * Acquisition cost maps (purchase prices + consignment agreed prices).
 * Shared by: useInventoryKpis, useSalesAnalytics, useInventoryValue, etc.
 */
export function useDashboardCosts(clientId: number | undefined, vehicleIds: number[]) {
  return useQuery({
    queryKey: ['dashboard-costs', clientId, vehicleIds.length],
    queryFn: () => fetchAcquisitionCosts(vehicleIds),
    staleTime: 5 * 60 * 1000,
    enabled: !!clientId && vehicleIds.length > 0,
  });
}

/**
 * Vehicle status history (for publication date tracking).
 * Shared by: useInventoryKpis, useSalesAnalytics.
 */
export function useDashboardStatusHistory(clientId: number | undefined, vehicleIds: number[]) {
  return useQuery({
    queryKey: ['dashboard-status-history', clientId],
    queryFn: () => fetchStatusHistory(vehicleIds),
    staleTime: 5 * 60 * 1000,
    enabled: !!clientId && vehicleIds.length > 0,
  });
}

// ─── Utility: filter to active vehicles ──────────────────────────────────────

const EXCLUDED_STATUS_KEYWORDS = ['vendido', 'sold', 'reservado', 'reserved', 'archivado', 'archived'];

/**
 * Filter vehicles to only active ones (exclude sold/reserved/archived by status name
 * AND by sales table records).
 */
export function filterActiveVehicles(
  vehicles: DashboardVehicle[],
  soldIds: Set<number>
): DashboardVehicle[] {
  return vehicles.filter((v) => {
    const statusName = (v.status as any)?.name?.toLowerCase() || '';
    const isExcludedStatus = EXCLUDED_STATUS_KEYWORDS.some((kw) => statusName.includes(kw));
    return !isExcludedStatus && !soldIds.has(v.id);
  });
}
