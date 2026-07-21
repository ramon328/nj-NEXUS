import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getComparableRange, DateFilter } from './utils/compareRange';
import {
  useDashboardVehicles,
  useDashboardStates,
  useDashboardSoldIds,
  filterActiveVehicles,
} from './useDashboardData';

export interface Kpi { value: number; prevValue?: number | null; }
export interface BusinessKpis {
  vehiclesSold: Kpi;
  newLeads: Kpi;
  closingRate: Kpi;          // 0..1
  avgDaysInStock: Kpi;       // días
  totalCommissions: Kpi;     // $
}

async function countRows(from: string, filters: Record<string, any>, start?: Date, end?: Date, dateCol = 'created_at') {
  let q = supabase.from(from).select('*', { count: 'exact', head: true });
  Object.entries(filters).forEach(([k, v]) => (q = q.eq(k, v)));
  if (start) q = q.gte(dateCol, start.toISOString());
  if (end)   q = q.lte(dateCol, end.toISOString());
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

const defaultKpis: BusinessKpis = {
  vehiclesSold: { value: 0, prevValue: 0 },
  newLeads: { value: 0, prevValue: 0 },
  closingRate: { value: 0, prevValue: 0 },
  avgDaysInStock: { value: 0, prevValue: 0 },
  totalCommissions: { value: 0, prevValue: 0 },
};

export const useBusinessKpis = (clientId: number | undefined, range?: DateFilter) => {
  const prevRange = useMemo(() => getComparableRange(range), [range?.startDate, range?.endDate]);

  // ── Shared data (deduplicated across dashboard hooks) ──
  const { data: rawVehicles } = useDashboardVehicles(clientId);
  const { data: states } = useDashboardStates(clientId);
  const allVehicleIds = useMemo(() => (rawVehicles || []).map((v) => v.id), [rawVehicles]);
  const { data: soldIds } = useDashboardSoldIds(clientId, allVehicleIds);

  // ── Avg days in stock: computed from shared data (no query needed) ──
  const avgDaysInStock = useMemo(() => {
    if (!rawVehicles || !soldIds) return 0;
    const active = filterActiveVehicles(rawVehicles, soldIds);
    const refDate = range?.endDate || new Date();
    const toDays = (ms: number) => ms / (1000 * 60 * 60 * 24);
    const arr = active
      .map((v) => {
        const start = v.created_at ? new Date(v.created_at) : null;
        if (!start) return null;
        if (range?.startDate && start < range.startDate) return null;
        if (range?.endDate && start > range.endDate) return null;
        return Math.max(0, toDays(refDate.getTime() - start.getTime()));
      })
      .filter((n): n is number => typeof n === 'number' && isFinite(n));
    return arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;
  }, [rawVehicles, soldIds, range?.startDate, range?.endDate]);

  // ── Hook-specific queries: sales-related data that can't be shared ──
  const { data: kpis = defaultKpis, isLoading: loading } = useQuery({
    queryKey: [
      'businessKpis', clientId,
      range?.startDate?.getTime(), range?.endDate?.getTime(),
      range?.consignmentFilter,
      prevRange?.startDate?.getTime(), prevRange?.endDate?.getTime(),
    ],
    queryFn: async (): Promise<BusinessKpis> => {
      const st = range?.startDate, en = range?.endDate;
      const pst = prevRange?.startDate, pen = prevRange?.endDate;

      // Use shared states to get sold status IDs
      const soldStatusIds = (states || [])
        .filter(s => {
          const name = (s.name || '').toLowerCase();
          return name.includes('vendido') || name.includes('sold');
        })
        .map(s => s.id);

      // Get sold vehicles by status
      let soldVehiclesQuery = supabase
        .from('vehicles')
        .select('id, is_consigned')
        .eq('client_id', clientId!)
        .in('status_id', soldStatusIds);

      if (range?.consignmentFilter === 'consigned') {
        soldVehiclesQuery = soldVehiclesQuery.eq('is_consigned', true);
      } else if (range?.consignmentFilter === 'not_consigned') {
        soldVehiclesQuery = soldVehiclesQuery.eq('is_consigned', false);
      }

      const { data: soldVehicles } = await soldVehiclesQuery;
      const soldVehicleIds = (soldVehicles || []).map(v => v.id);
      const totalSoldVehicles = soldVehicleIds.length;

      let vehiclesSold: number;
      let vehiclesSoldPrev: number | null = null;

      if (!st && !en) {
        vehiclesSold = totalSoldVehicles;
      } else {
        const { data: salesData, error: salesError } = await supabase
          .from('vehicles_sales')
          .select('vehicle_id, sale_date, created_at')
          .in('vehicle_id', soldVehicleIds);

        if (salesError) console.error('[useBusinessKpis] Error fetching sales:', salesError);

        const filteredSales = (salesData || []).filter(sale => {
          const saleDate = sale.sale_date || sale.created_at;
          if (!saleDate) return false;
          const date = new Date(saleDate);
          if (st && date < st) return false;
          if (en && date > en) return false;
          return true;
        });

        const uniqueVehicleIds = new Set(filteredSales.map(s => s.vehicle_id));
        vehiclesSold = uniqueVehicleIds.size;

        if (prevRange && pst && pen) {
          const filteredSalesPrev = (salesData || []).filter(sale => {
            const saleDate = sale.sale_date || sale.created_at;
            if (!saleDate) return false;
            const date = new Date(saleDate);
            if (pst && date < pst) return false;
            if (pen && date > pen) return false;
            return true;
          });
          const uniqueVehicleIdsPrev = new Set(filteredSalesPrev.map(s => s.vehicle_id));
          vehiclesSoldPrev = uniqueVehicleIdsPrev.size;
        }
      }

      // Commissions
      let commissionsQuery = supabase
        .from('vehicles_sales')
        .select('commission_amount, vehicle_id, vehicles!vehicle_id(client_id, is_consigned)')
        .eq('vehicles.client_id', clientId!)
        .eq('status', 'approved');
      if (st) commissionsQuery = commissionsQuery.gte('sale_date', st.toISOString());
      if (en) commissionsQuery = commissionsQuery.lte('sale_date', en.toISOString());
      if (range?.consignmentFilter === 'consigned') {
        commissionsQuery = commissionsQuery.eq('vehicles.is_consigned', true);
      } else if (range?.consignmentFilter === 'not_consigned') {
        commissionsQuery = commissionsQuery.eq('vehicles.is_consigned', false);
      }
      const { data: commissionsData, error: commissionsError } = await commissionsQuery;
      if (commissionsError) console.error('[useBusinessKpis] Error fetching commissions:', commissionsError);

      // Dealership commissions for consigned vehicles
      const consignedSoldIds = (soldVehicles || [])
        .filter((v: any) => v.is_consigned === true)
        .map((v: any) => v.id);

      let dealershipCommissionsTotal = 0;
      if (consignedSoldIds.length > 0) {
        const { data: closeDealsData } = await supabase
          .from('vehicles_documents')
          .select(`vehicle_id, vehicles_close_deal(dealershipCommission)`)
          .in('vehicle_id', consignedSoldIds)
          .eq('type', 'close_deal');

        dealershipCommissionsTotal = (closeDealsData || []).reduce((s, r: any) => {
          const cd = r.vehicles_close_deal;
          if (Array.isArray(cd)) {
            return s + cd.reduce((acc: number, d: any) => acc + (Number(d.dealershipCommission) || 0), 0);
          }
          return s + (Number(cd?.dealershipCommission) || 0);
        }, 0);
      }

      const sellerCommissions = (commissionsData || [])
        .filter((r: any) => r.vehicles?.is_consigned !== true)
        .reduce((s, r) => s + (Number(r.commission_amount) || 0), 0);
      const commissions = sellerCommissions + dealershipCommissionsTotal;

      let commissionsQueryPrev = prevRange ? supabase
        .from('vehicles_sales')
        .select('commission_amount, vehicles!vehicle_id(client_id)')
        .eq('vehicles.client_id', clientId!)
        .eq('status', 'approved') : null;
      if (commissionsQueryPrev && pst) commissionsQueryPrev = commissionsQueryPrev.gte('sale_date', pst.toISOString());
      if (commissionsQueryPrev && pen) commissionsQueryPrev = commissionsQueryPrev.lte('sale_date', pen.toISOString());
      const commissionsPrev = commissionsQueryPrev ? (await commissionsQueryPrev).data?.reduce((s, r) => s + (Number(r.commission_amount) || 0), 0) : null;

      // Leads
      const leads = await countRows('leads', { client_id: clientId! }, st, en, 'created_at');
      const leadsPrev = prevRange ? await countRows('leads', { client_id: clientId! }, pst, pen, 'created_at') : null;

      const closing = leads > 0 ? (vehiclesSold || 0) / leads : 0;
      const closingPrev = (leadsPrev && leadsPrev > 0) ? (vehiclesSoldPrev || 0) / leadsPrev : 0;

      return {
        vehiclesSold: { value: vehiclesSold, prevValue: vehiclesSoldPrev },
        newLeads: { value: leads, prevValue: leadsPrev },
        closingRate: { value: closing, prevValue: closingPrev },
        avgDaysInStock: { value: 0, prevValue: null },
        totalCommissions: { value: commissions, prevValue: commissionsPrev },
      };
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });

  // avgDaysInStock comes from shared memos (rawVehicles + soldIds) that resolve after the
  // query runs — merging here ensures the value is always fresh instead of the stale 0
  // captured by the closure when queryFn first executed.
  return {
    kpis: kpis ? { ...kpis, avgDaysInStock: { value: avgDaysInStock, prevValue: null } } : kpis,
    loading,
  };
};
