import { supabase } from '@/integrations/supabase/client';
import { Vehicle } from '@/types/vehicle';

// Columns whose value is not on `vehicles` directly — they're joined or calculated.
// Sorting these requires fetching all candidates + computing values client-side.
export const SYNTHETIC_SORT_FIELDS = [
  'consignment_seller',
  'acquired_from',
  'net_profit_after_commission',
  'total_expenses',
  'checklist_status',
  'days_in_stock',
] as const;

export type SyntheticSortField = (typeof SYNTHETIC_SORT_FIELDS)[number];

export const isSyntheticSortField = (field?: string): field is SyntheticSortField =>
  !!field && (SYNTHETIC_SORT_FIELDS as readonly string[]).includes(field);

type SortKey = number | string | null;

const fullName = (first?: string | null, last?: string | null): string => {
  const f = (first || '').trim();
  const l = (last || '').trim();
  const name = `${f} ${l}`.trim().toLowerCase();
  return name;
};

export const buildSyntheticSortKeys = async (
  vehicles: Vehicle[],
  field: SyntheticSortField
): Promise<Map<number, SortKey>> => {
  const map = new Map<number, SortKey>();
  const ids = vehicles.map((v) => v.id as number).filter(Boolean);
  if (ids.length === 0) return map;

  if (field === 'consignment_seller') {
    const { data } = await supabase
      .from('vehicles_consignments')
      .select('vehicle_id, seller:consignment_seller_id(first_name, last_name)')
      .in('vehicle_id', ids);
    (data || []).forEach((row: any) => {
      const s = row.seller;
      map.set(row.vehicle_id, s ? fullName(s.first_name, s.last_name) || null : null);
    });
    return map;
  }

  if (field === 'acquired_from') {
    const consignedIds = vehicles.filter((v) => v.is_consigned).map((v) => v.id as number);
    const purchasedIds = vehicles.filter((v) => !v.is_consigned).map((v) => v.id as number);
    const [cons, purch] = await Promise.all([
      consignedIds.length
        ? supabase
            .from('vehicles_consignments')
            .select('vehicle_id, customers:customer_id(first_name, last_name)')
            .in('vehicle_id', consignedIds)
        : Promise.resolve({ data: [] as any[] }),
      purchasedIds.length
        ? supabase
            .from('vehicles_purchases')
            .select('vehicle_id, customers:customer_id(first_name, last_name)')
            .in('vehicle_id', purchasedIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    [...((cons.data as any[]) || []), ...((purch.data as any[]) || [])].forEach((row) => {
      const c = row.customers;
      map.set(row.vehicle_id, c ? fullName(c.first_name, c.last_name) || null : null);
    });
    return map;
  }

  if (field === 'total_expenses') {
    const [purch, cons, extras] = await Promise.all([
      supabase
        .from('vehicles_purchases')
        .select('vehicle_id, purchase_price')
        .in('vehicle_id', ids),
      supabase
        .from('vehicles_consignments')
        .select('vehicle_id, agreed_price')
        .in('vehicle_id', ids),
      supabase
        .from('vehicles_extras')
        .select('vehicle_id, type, amount')
        .in('vehicle_id', ids),
    ]);
    const purchMap = new Map<number, number>();
    ((purch.data as any[]) || []).forEach((r) =>
      purchMap.set(r.vehicle_id, Number(r.purchase_price) || 0)
    );
    const consMap = new Map<number, number>();
    ((cons.data as any[]) || []).forEach((r) =>
      consMap.set(r.vehicle_id, Number(r.agreed_price) || 0)
    );
    const extrasMap = new Map<number, number>();
    ((extras.data as any[]) || []).forEach((r) => {
      if (r.type !== 'expense') return;
      extrasMap.set(r.vehicle_id, (extrasMap.get(r.vehicle_id) || 0) + (Number(r.amount) || 0));
    });
    vehicles.forEach((v) => {
      const id = v.id as number;
      const base = v.is_consigned ? consMap.get(id) || 0 : purchMap.get(id) || 0;
      const transfer = Number((v as any).transfer_value) || 0;
      map.set(id, base + transfer + (extrasMap.get(id) || 0));
    });
    return map;
  }

  if (field === 'net_profit_after_commission') {
    // Only meaningful for sold vehicles. Non-sold get null (sorted last).
    const [sales, purch, cons, extras] = await Promise.all([
      supabase
        .from('vehicles_sales')
        .select('vehicle_id, sale_price, commission_amount, created_at')
        .in('vehicle_id', ids)
        .order('created_at', { ascending: false }),
      supabase
        .from('vehicles_purchases')
        .select('vehicle_id, purchase_price')
        .in('vehicle_id', ids),
      supabase
        .from('vehicles_consignments')
        .select('vehicle_id, agreed_price')
        .in('vehicle_id', ids),
      supabase
        .from('vehicles_extras')
        .select('vehicle_id, type, amount')
        .in('vehicle_id', ids),
    ]);
    const saleMap = new Map<number, { sale: number; commission: number }>();
    ((sales.data as any[]) || []).forEach((r) => {
      if (saleMap.has(r.vehicle_id)) return;
      saleMap.set(r.vehicle_id, {
        sale: Number(r.sale_price) || 0,
        commission: Number(r.commission_amount) || 0,
      });
    });
    const purchMap = new Map<number, number>();
    ((purch.data as any[]) || []).forEach((r) =>
      purchMap.set(r.vehicle_id, Number(r.purchase_price) || 0)
    );
    const consMap = new Map<number, number>();
    ((cons.data as any[]) || []).forEach((r) =>
      consMap.set(r.vehicle_id, Number(r.agreed_price) || 0)
    );
    const incMap = new Map<number, number>();
    const expMap = new Map<number, number>();
    ((extras.data as any[]) || []).forEach((r) => {
      const amt = Number(r.amount) || 0;
      if (r.type === 'income') incMap.set(r.vehicle_id, (incMap.get(r.vehicle_id) || 0) + amt);
      else if (r.type === 'expense') expMap.set(r.vehicle_id, (expMap.get(r.vehicle_id) || 0) + amt);
    });
    vehicles.forEach((v) => {
      const id = v.id as number;
      const sale = saleMap.get(id);
      if (!sale) {
        map.set(id, null);
        return;
      }
      const base = v.is_consigned ? consMap.get(id) || 0 : purchMap.get(id) || 0;
      const transfer = Number((v as any).transfer_value) || 0;
      const totalIncome = sale.sale + (incMap.get(id) || 0) + transfer;
      const totalExpenses = base + (expMap.get(id) || 0) + transfer;
      map.set(id, totalIncome - totalExpenses - sale.commission);
    });
    return map;
  }

  if (field === 'days_in_stock') {
    // Para vendidos, días = sale_date - created_at (congelado). Para los demás,
    // días = now - created_at. Ordenar server-side por created_at falla para
    // vendidos porque su día queda fijo al venderse.
    const { data } = await supabase
      .from('vehicles_sales')
      .select('vehicle_id, sale_date, created_at')
      .in('vehicle_id', ids)
      .order('created_at', { ascending: false });
    const saleDateMap = new Map<number, string>();
    ((data as any[]) || []).forEach((r) => {
      if (!saleDateMap.has(r.vehicle_id) && r.sale_date) {
        saleDateMap.set(r.vehicle_id, r.sale_date);
      }
    });
    const now = Date.now();
    vehicles.forEach((v) => {
      const id = v.id as number;
      if (!v.created_at) {
        map.set(id, 0);
        return;
      }
      const created = new Date(v.created_at).getTime();
      const saleDateStr = saleDateMap.get(id);
      const end = saleDateStr ? new Date(saleDateStr).getTime() : now;
      const days = Math.floor(Math.abs(end - created) / (1000 * 60 * 60 * 24));
      map.set(id, days);
    });
    return map;
  }

  if (field === 'checklist_status') {
    const { data } = await supabase
      .from('vehicle_checklist')
      .select('vehicle_id, is_completed')
      .in('vehicle_id', ids);
    const counts = new Map<number, { total: number; completed: number }>();
    ((data as any[]) || []).forEach((r) => {
      const c = counts.get(r.vehicle_id) || { total: 0, completed: 0 };
      c.total += 1;
      if (r.is_completed) c.completed += 1;
      counts.set(r.vehicle_id, c);
    });
    vehicles.forEach((v) => {
      const id = v.id as number;
      const c = counts.get(id);
      map.set(id, c && c.total > 0 ? c.completed / c.total : null);
    });
    return map;
  }

  return map;
};

export const sortVehiclesByKeys = <T extends { id?: number }>(
  vehicles: T[],
  keys: Map<number, SortKey>,
  direction: 'asc' | 'desc'
): T[] => {
  const dir = direction === 'asc' ? 1 : -1;
  return [...vehicles].sort((a, b) => {
    const ka = a.id != null ? keys.get(a.id) : undefined;
    const kb = b.id != null ? keys.get(b.id) : undefined;
    // Nulls last regardless of direction
    if (ka == null && kb == null) return 0;
    if (ka == null) return 1;
    if (kb == null) return -1;
    if (typeof ka === 'number' && typeof kb === 'number') return (ka - kb) * dir;
    const sa = String(ka);
    const sb = String(kb);
    if (sa < sb) return -1 * dir;
    if (sa > sb) return 1 * dir;
    return 0;
  });
};
