import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DateFilter } from './useSellerPerformance';
import type { InventoryChartPoint } from '@/components/admin/InventoryPerformanceChart';

/**
 * Returns monthly series for the inventory performance chart:
 *  - inventoryValue: total stock value at end of each month
 *  - vehicleCount:   number of vehicles in stock at end of each month
 *  - avgProfit:      average margin per vehicle sold that month (sale_price − cost)
 */
export const useInventoryPerformance = (
  clientId: number | undefined,
  dateFilter?: DateFilter
) => {
  const [data, setData] = useState<InventoryChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    let stale = false;

    const run = async () => {
      setLoading(true);
      try {
        // 1. All vehicles
        const { data: allVehicles, error: vErr } = await supabase
          .from('vehicles')
          .select('id, price, created_at, is_consigned')
          .eq('client_id', clientId)
          .not('status_id', 'is', null);
        if (vErr) throw vErr;

        const vehicleIds = (allVehicles || []).map(v => v.id);
        if (vehicleIds.length === 0) {
          if (!stale) setData([]);
          return;
        }

        // 2. Purchases, consignments, sales, extras
        const [
          { data: purchases },
          { data: consignments },
          { data: sales },
          { data: extras },
        ] = await Promise.all([
          supabase
            .from('vehicles_purchases')
            .select('vehicle_id, purchase_price, purchase_date')
            .in('vehicle_id', vehicleIds),
          supabase
            .from('vehicles_consignments')
            .select('vehicle_id, agreed_price, created_at')
            .in('vehicle_id', vehicleIds),
          supabase
            .from('vehicles_sales')
            .select('vehicle_id, sale_date, sale_price, status')
            .in('vehicle_id', vehicleIds),
          supabase
            .from('vehicles_extras')
            .select('vehicle_id, amount, type')
            .in('vehicle_id', vehicleIds)
            .eq('type', 'expense'),
        ]);

        if (stale) return;

        // Cierre de negocio: para consignados vendidos, dealershipCommission es lo
        // que la automotora se quedó. Sin cierre cargado, asumimos 0.
        const closeDealMap = new Map<number, number>();
        const { data: closeDealDocs } = await supabase
          .from('vehicles_documents')
          .select('id, vehicle_id')
          .in('vehicle_id', vehicleIds)
          .eq('type', 'close_deal');
        if (closeDealDocs && closeDealDocs.length > 0) {
          const docIds = closeDealDocs.map((d: any) => d.id);
          const docVehicleMap = new Map(closeDealDocs.map((d: any) => [d.id, d.vehicle_id]));
          const { data: closeDeals } = await supabase
            .from('vehicles_close_deal')
            .select('document_id, dealershipCommission')
            .in('document_id', docIds);
          (closeDeals || []).forEach((deal: any) => {
            const vid = docVehicleMap.get(deal.document_id);
            const commission = Number(deal.dealershipCommission) || 0;
            if (vid != null) closeDealMap.set(vid as number, commission);
          });
        }

        if (stale) return;

        const isConsignedMap = new Map<number, boolean>();
        (allVehicles || []).forEach((v) => {
          isConsignedMap.set(v.id, !!v.is_consigned);
        });

        // Cost map: vehicle_id -> COSTO INVERTIDO (purchase_price > agreed_price).
        // SIN fallback a precio de lista (no inflar con autos sin costo, ver useInventoryValue).
        const costMap = new Map<number, number>();
        (consignments || []).forEach((c: any) => {
          const p = Number(c.agreed_price) || 0;
          if (p > 0) costMap.set(c.vehicle_id, p);
        });
        (purchases || []).forEach((p: any) => {
          const pr = Number(p.purchase_price) || 0;
          if (pr > 0) costMap.set(p.vehicle_id, pr);
        });

        // Extras map: vehicle_id -> total expenses
        const extrasMap = new Map<number, number>();
        (extras || []).forEach((e: any) => {
          const amt = Number(e.amount) || 0;
          extrasMap.set(e.vehicle_id, (extrasMap.get(e.vehicle_id) || 0) + amt);
        });

        // Entry date map: vehicle_id -> entry date (purchase_date > created_at)
        const entryMap = new Map<number, string>();
        (allVehicles || []).forEach(v => {
          if (v.created_at) entryMap.set(v.id, v.created_at);
        });
        (purchases || []).forEach((p: any) => {
          if (p.purchase_date) entryMap.set(p.vehicle_id, p.purchase_date);
        });

        // Sale map: vehicle_id -> { saleDate, salePrice }
        const saleMap = new Map<number, { date: string; price: number }>();
        (sales || []).forEach((s: any) => {
          if (s.sale_date && s.status === 'approved') {
            saleMap.set(s.vehicle_id, {
              date: s.sale_date,
              price: Number(s.sale_price) || 0,
            });
          }
        });

        // Consignment filter
        const cf = dateFilter?.consignmentFilter || 'all';
        const filteredIds = vehicleIds.filter(id => {
          const v = (allVehicles || []).find(veh => veh.id === id);
          if (!v) return false;
          if (cf === 'consigned') return v.is_consigned;
          if (cf === 'not_consigned') return !v.is_consigned;
          return true;
        });

        // Determine if we should group by day or by month
        const now = new Date();
        const monthAbbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const dayAbbr = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.'];

        let rangeStart: Date;
        const rangeEnd = dateFilter?.endDate || now;

        if (dateFilter?.startDate) {
          rangeStart = dateFilter.startDate;
        } else {
          rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        }

        const diffDays = (rangeEnd.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24);
        const useDaily = diffDays <= 31 && rangeStart.getMonth() === rangeEnd.getMonth() && rangeStart.getFullYear() === rangeEnd.getFullYear()
          || diffDays <= 7;

        type Period = { key: string; start: string; end: string };
        const periods: Period[] = [];

        if (useDaily) {
          // Generate daily periods
          const dayCursor = new Date(rangeStart);
          while (dayCursor <= rangeEnd) {
            const iso = dayCursor.toISOString().slice(0, 10);
            const dd = String(dayCursor.getDate()).padStart(2, '0');
            const mm = String(dayCursor.getMonth() + 1).padStart(2, '0');
            const label = `${dayAbbr[dayCursor.getDay()]} ${dd}/${mm}`;
            periods.push({ key: label, start: iso, end: iso });
            dayCursor.setDate(dayCursor.getDate() + 1);
          }
        } else {
          // Generate monthly periods
          const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
          const endMonth = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

          while (cursor <= endMonth) {
            const monthStart = new Date(cursor);
            const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
            const yr = String(cursor.getFullYear() % 100).padStart(2, '0');
            periods.push({
              key: `${monthAbbr[cursor.getMonth()]} ${yr}`,
              start: monthStart.toISOString().slice(0, 10),
              end: monthEnd.toISOString().slice(0, 10),
            });
            cursor.setMonth(cursor.getMonth() + 1);
          }
        }

        // Build series
        const series: InventoryChartPoint[] = periods.map(p => {
          // Vehicles in stock at end of period
          let invValue = 0;
          let invCount = 0;
          for (const id of filteredIds) {
            const entry = entryMap.get(id);
            if (!entry || entry.slice(0, 10) > p.end) continue;
            const sale = saleMap.get(id);
            if (sale && sale.date.slice(0, 10) <= p.end) continue;
            invValue += (costMap.get(id) || 0) + (extrasMap.get(id) || 0);
            invCount++;
          }

          // Sales in this period: avg profit
          // Owned: profit = sale_price - purchase_price - extras
          // Consigned: profit = dealershipCommission - extras (agreed_price NO es gasto;
          // sin cierre cargado, asume comisión 0).
          let totalProfit = 0;
          let soldCount = 0;
          for (const id of filteredIds) {
            const sale = saleMap.get(id);
            if (!sale) continue;
            const sd = sale.date.slice(0, 10);
            if (sd < p.start || sd > p.end) continue;
            const extras = extrasMap.get(id) || 0;
            const isConsigned = isConsignedMap.get(id) === true;
            if (isConsigned) {
              const commission = closeDealMap.get(id) || 0;
              totalProfit += commission - extras;
            } else {
              const cost = (costMap.get(id) || 0) + extras;
              totalProfit += sale.price - cost;
            }
            soldCount++;
          }

          return {
            month: p.key,
            inventoryValue: invValue,
            vehicleCount: invCount,
            avgProfit: soldCount > 0 ? Math.round(totalProfit / soldCount) : 0,
          };
        });

        if (!stale) setData(series);
      } catch (err) {
        console.error('[useInventoryPerformance]', err);
        if (!stale) setData([]);
      } finally {
        if (!stale) setLoading(false);
      }
    };

    run();
    return () => { stale = true; };
  }, [clientId, dateFilter?.startDate, dateFilter?.endDate, dateFilter?.consignmentFilter]);

  return { data, loading };
};
