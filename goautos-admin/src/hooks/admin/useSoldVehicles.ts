import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SoldVehicleRow } from './types/soldVehicles';
import { DateRangeFilter } from './utils/salesDataFetchers';
import {
  type AssumedBy,
  type ConsignmentMethod,
  type VehicleExtra,
} from '@/utils/vehicleNetProfit';
import {
  normalizeSoldVehicle,
  type RawSoldVehicleBundle,
  type NormalizedSoldVehicle,
} from '@/utils/soldVehicleFinancials';

interface SaleRow {
  id: number;
  sale_price: number | null;
  commission_amount: number | null;
  financing_commission: number | null;
  transfer_value: number | null;
  transfer_value_charged: boolean | null;
  sale_date: string;
  vehicle_id: number;
  // Alias del embed de `vehicles` (FK hint `vehicles_sales_vehicle_id_fkey`).
  // `vehicles_sales` tiene DOS FKs a `vehicles` (vehicle_id + trade_in_vehicle_id),
  // así que el embed va aliaseado para poder filtrar la sede por `referencedTable`.
  veh: {
    id: number;
    client_id: number;
    is_consigned: boolean | null;
    seller_id: number | null;
    iva_exento: boolean | null;
  } | null;
}

interface PurchaseRow {
  vehicle_id: number | null;
  purchase_price: number | null;
  genera_credito_fiscal?: boolean | null;
  created_at: string;
}

interface ConsignmentRow {
  vehicle_id: number | null;
  agreed_price: number | null;
  agreed_price_final: number | null;
  metodo_consignacion: string | null;
  porcentaje_comision_consignacion: number | null;
  monto_fijo_comision_consignacion: number | null;
  document_id: number | null;
  created_at: string;
}

interface DocumentRow {
  id: number;
  vehicle_id: number | null;
  type: string;
}

interface CloseDealRow {
  document_id: number;
  dealershipCommission: number | null;
  discount: number | null;
}

interface ExtraRow {
  vehicle_id: number | null;
  amount: number | null;
  type: string;
  assumed_by: string | null;
  genera_credito_fiscal?: boolean | null;
  is_passthrough?: boolean | null;
}

interface SplitRow {
  sale_id: number | null;
  amount: number | null;
}

const COGS_SOURCE_MAP: Record<NormalizedSoldVehicle['cogsSource'], SoldVehicleRow['cogsSource']> = {
  purchase: 'purchase_price',
  close_deal: 'consignment_close_deal',
  agreed_price: 'consignment_agreed_price',
  commission: 'consignment_commission',
  none: 'unknown',
};

/**
 * FUENTE ÚNICA: una fila por (vehicle_id, venta) vendida (status='approved') en
 * el período, con sus números financieros CANÓNICOS calculados por el mapper
 * compartido (soldVehicleFinancials). KPIs, breakdown y charts reducen sobre
 * esto — sin cálculos paralelos. Garantiza Σ por-auto == total dashboard.
 *
 * Exportada como función para que el KPI (useTotalNetProfit) y los charts
 * (useVehicleNetProfitsByPeriod) consuman exactamente las mismas filas.
 */
export async function fetchSoldVehicleRows(
  clientId: number,
  dateFilter?: DateRangeFilter,
  // Default de régimen del tenant (clients.ventas_exentas_iva): fallback cuando el
  // auto tiene iva_exento=null. Necesario para resolver el IVA débito de la venta.
  clientExempt = false
): Promise<SoldVehicleRow[]> {
  const sellerIds = dateFilter?.sellerIds;

  // 1. Ventas aprobadas del período para este cliente.
  let salesQuery = supabase
    .from('vehicles_sales')
    .select(`
      id,
      sale_price,
      commission_amount,
      financing_commission,
      transfer_value,
      transfer_value_charged,
      sale_date,
      vehicle_id,
      veh:vehicles!inner!vehicles_sales_vehicle_id_fkey(
        id,
        client_id,
        is_consigned,
        seller_id,
        iva_exento
      )
    `)
    .eq('veh.client_id', clientId)
    .eq('status', 'approved');

  if (dateFilter?.startDate) {
    salesQuery = salesQuery.gte('sale_date', dateFilter.startDate.toISOString());
  }
  if (dateFilter?.endDate) {
    salesQuery = salesQuery.lte('sale_date', dateFilter.endDate.toISOString());
  }
  if (dateFilter?.consignmentFilter === 'consigned') {
    salesQuery = salesQuery.eq('veh.is_consigned', true);
  } else if (dateFilter?.consignmentFilter === 'not_consigned') {
    salesQuery = salesQuery.eq('veh.is_consigned', false);
  }
  if (sellerIds && sellerIds.length > 0) {
    salesQuery = salesQuery.in('veh.seller_id', sellerIds);
  }

  // División de sedes (Slice 4, decisión 4): la venta pertenece a la sede del AUTO.
  // Filtramos por la sede del vehículo embebido (mismo criterio que el inventario):
  // el auto se incluye si su dealership_id está en las sedes visibles O es NULL
  // (visible para todas). `dealershipIds` nulo/vacío => sin filtro (retrocompatible).
  // Al filtrar acá, TODAS las métricas que cuelgan de estas filas (ventas, márgenes,
  // IVA, utilidad neta, resúmenes) heredan el filtro sin recalcular nada.
  const dealershipIds = dateFilter?.dealershipIds;
  if (dealershipIds && dealershipIds.length > 0) {
    salesQuery = salesQuery.or(
      `dealership_id.in.(${dealershipIds.join(',')}),dealership_id.is.null`,
      { referencedTable: 'veh' }
    );
  }

  const { data: salesRaw, error: salesError } = await salesQuery;
  if (salesError) throw salesError;
  const sales = (salesRaw || []) as unknown as SaleRow[];

  const vehicleIds = Array.from(
    new Set(sales.map((s) => s.vehicle_id).filter(Boolean))
  );
  if (vehicleIds.length === 0) return [];
  const saleIds = sales.map((s) => s.id);

  // 2. Precio de compra (autos propios): el más reciente no-nulo. Capturamos también
  //    genera_credito_fiscal (IVA de compra) DE LA MISMA fila que aporta el precio.
  const { data: purchasesRaw } = await supabase
    .from('vehicles_purchases')
    .select('vehicle_id, purchase_price, genera_credito_fiscal, created_at')
    .in('vehicle_id', vehicleIds)
    .order('created_at', { ascending: false });

  const purchasePriceByVehicle = new Map<number, number>();
  const purchaseCreditByVehicle = new Map<number, boolean | null>();
  for (const p of (purchasesRaw || []) as PurchaseRow[]) {
    if (p.vehicle_id == null || purchasePriceByVehicle.has(p.vehicle_id)) continue;
    if (p.purchase_price != null && Number(p.purchase_price) > 0) {
      purchasePriceByVehicle.set(p.vehicle_id, Number(p.purchase_price));
      purchaseCreditByVehicle.set(p.vehicle_id, p.genera_credito_fiscal ?? null);
    }
  }

  // 3. Consignación (fila más reciente): precio acordado/final, método y comisión.
  const { data: consignmentsRaw } = await supabase
    .from('vehicles_consignments')
    .select(
      'vehicle_id, agreed_price, agreed_price_final, metodo_consignacion, porcentaje_comision_consignacion, monto_fijo_comision_consignacion, document_id, created_at'
    )
    .in('vehicle_id', vehicleIds)
    .order('created_at', { ascending: false });

  const consignmentByVehicle = new Map<number, RawSoldVehicleBundle['consignment']>();
  for (const c of (consignmentsRaw || []) as ConsignmentRow[]) {
    if (c.vehicle_id == null || consignmentByVehicle.has(c.vehicle_id)) continue;
    consignmentByVehicle.set(c.vehicle_id, {
      agreedPrice: c.agreed_price != null ? Number(c.agreed_price) : null,
      agreedPriceFinal: c.agreed_price_final != null ? Number(c.agreed_price_final) : null,
      method: (c.metodo_consignacion as ConsignmentMethod) ?? undefined,
      commissionPercentage:
        c.porcentaje_comision_consignacion != null
          ? Number(c.porcentaje_comision_consignacion)
          : null,
      commissionFixed:
        c.monto_fijo_comision_consignacion != null
          ? Number(c.monto_fijo_comision_consignacion)
          : null,
    });
  }

  // 4. close_deal por vehículo (vía vehicles_documents).
  const { data: documentsRaw } = await supabase
    .from('vehicles_documents')
    .select('id, vehicle_id, type')
    .in('vehicle_id', vehicleIds)
    .eq('type', 'close_deal')
    .order('id', { ascending: false });

  const docToVehicle = new Map<number, number>();
  for (const d of (documentsRaw || []) as DocumentRow[]) {
    if (d.vehicle_id != null) docToVehicle.set(d.id, d.vehicle_id);
  }

  const closeDealByVehicle = new Map<number, RawSoldVehicleBundle['closeDeal']>();
  if (docToVehicle.size > 0) {
    const docIds = Array.from(docToVehicle.keys());
    const { data: closeDealsRaw } = await supabase
      .from('vehicles_close_deal')
      .select('document_id, dealershipCommission, discount')
      .in('document_id', docIds);

    for (const cd of (closeDealsRaw || []) as CloseDealRow[]) {
      const vid = docToVehicle.get(cd.document_id);
      if (!vid || closeDealByVehicle.has(vid)) continue;
      closeDealByVehicle.set(vid, {
        dealershipCommission: cd.dealershipCommission != null ? Number(cd.dealershipCommission) : null,
        discount: cd.discount != null ? Number(cd.discount) : null,
      });
    }
  }

  // 5. Extras (gastos/ingresos/adicionales) por vehículo.
  // '*' (no columnas fijas) para leer genera_credito_fiscal de forma defensiva: si la
  // migración 20260618000000 aún no se aplicó, la columna simplemente no viene (undefined
  // → se trata como TOTAL, sin cambio de comportamiento).
  const { data: extrasRaw } = await supabase
    .from('vehicles_extras')
    .select('*')
    .in('vehicle_id', vehicleIds)
    .in('type', ['expense', 'income', 'sale_additional', 'sale_income']);

  const extrasByVehicle = new Map<number, VehicleExtra[]>();
  for (const e of (extrasRaw || []) as ExtraRow[]) {
    if (e.vehicle_id == null) continue;
    const list = extrasByVehicle.get(e.vehicle_id) ?? [];
    list.push({
      amount: Number(e.amount) || 0,
      type: e.type as VehicleExtra['type'],
      assumedBy: (e.assumed_by ?? 'dealership') as AssumedBy,
      generaCreditoFiscal: e.genera_credito_fiscal ?? null,
      // Pass-through: la línea queda fuera del margen (informativa). '*' en el select
      // trae la columna cuando la migración está aplicada; si no, undefined → normal.
      isPassthrough: e.is_passthrough ?? null,
    });
    extrasByVehicle.set(e.vehicle_id, list);
  }

  // 6. Comisión del vendedor (canónica): Σ sale_commission_splits por venta.
  //    `null` cuando no hay filas → el mapper cae al legacy commission_amount.
  const splitsTotalBySale = new Map<number, number>();
  const salesWithSplits = new Set<number>();
  if (saleIds.length > 0) {
    const { data: splitsRaw } = await supabase
      .from('sale_commission_splits')
      .select('sale_id, amount')
      .in('sale_id', saleIds);
    for (const sp of (splitsRaw || []) as SplitRow[]) {
      if (sp.sale_id == null) continue;
      salesWithSplits.add(sp.sale_id);
      splitsTotalBySale.set(
        sp.sale_id,
        (splitsTotalBySale.get(sp.sale_id) || 0) + (Number(sp.amount) || 0)
      );
    }
  }

  // 7. Armar bundles crudos → normalizar vía el mapper canónico.
  return sales.map((s) => {
    const isConsigned = !!s.veh?.is_consigned;
    const bundle: RawSoldVehicleBundle = {
      saleId: s.id,
      vehicleId: s.vehicle_id,
      saleDate: s.sale_date,
      sellerId: s.veh?.seller_id ?? null,
      isConsigned,
      salePrice: s.sale_price,
      commissionAmount: s.commission_amount,
      financingCommission: s.financing_commission,
      transferValue: s.transfer_value,
      transferValueCharged: s.transfer_value_charged,
      purchasePrice: purchasePriceByVehicle.get(s.vehicle_id) ?? null,
      purchaseGeneraCreditoFiscal: purchaseCreditByVehicle.get(s.vehicle_id) ?? null,
      consignment: isConsigned ? consignmentByVehicle.get(s.vehicle_id) ?? null : null,
      closeDeal: closeDealByVehicle.get(s.vehicle_id) ?? null,
      extras: extrasByVehicle.get(s.vehicle_id) ?? [],
      splitsTotal: salesWithSplits.has(s.id)
        ? splitsTotalBySale.get(s.id) || 0
        : null,
      // Régimen del auto (IVA): iva_exento propio con fallback al default del cliente.
      ivaExento: s.veh?.iva_exento ?? null,
      clientExempt,
    };

    const norm = normalizeSoldVehicle(bundle);
    // directExpenses = gastos del dealership netos de ingresos de EXTRAS (sin financiera).
    const directExpenses =
      norm.dealershipExpenses - (norm.dealershipIncome - norm.financingCommission);

    return {
      saleId: norm.saleId,
      vehicleId: norm.vehicleId,
      isConsigned: norm.isConsigned,
      saleDate: norm.saleDate ?? s.sale_date,
      sellerId: norm.sellerId,
      salePrice: norm.salePrice,
      discount: norm.discount,
      netSalePrice: Math.max(0, norm.salePrice - norm.discount),
      cogs: norm.cogs,
      hasCostRegistered: norm.hasCostRegistered,
      cogsSource: COGS_SOURCE_MAP[norm.cogsSource],
      directExpenses,
      sellerCommission: norm.sellerCommission,
      financingCommission: norm.financingCommission,
      grossProfit: norm.grossProfit,
      netProfitAfterSellerCommission: norm.netProfitAfterSellerCommission,
      ivaDebito: norm.ivaDebito,
      ivaCredito: norm.ivaCredito,
      ivaNeto: norm.ivaNeto,
    } satisfies SoldVehicleRow;
  });
}

export const useSoldVehicles = (
  clientId: number | undefined,
  dateFilter?: DateRangeFilter
) => {
  const sellerIds = dateFilter?.sellerIds;
  // Default de régimen del tenant (para el IVA débito de autos con iva_exento=null).
  const { client } = useAuth();
  const clientExempt = !!(client as any)?.ventas_exentas_iva;
  const { data = [], isLoading } = useQuery({
    queryKey: [
      'soldVehicles',
      clientId,
      dateFilter?.startDate?.getTime(),
      dateFilter?.endDate?.getTime(),
      dateFilter?.consignmentFilter,
      sellerIds?.slice().sort().join(','),
      // Sede activa (Slice 4): sin esto el dashboard no se recalcula al cambiar de sede.
      dateFilter?.dealershipIds?.slice().sort().join(','),
      // Sin esto el IVA no se recalcula al togglear "Ventas exentas de IVA" (FiscalConfig).
      clientExempt,
    ],
    queryFn: async (): Promise<SoldVehicleRow[]> => {
      if (!clientId) return [];
      return fetchSoldVehicleRows(clientId, dateFilter, clientExempt);
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });

  return { rows: data, loading: isLoading };
};
