/**
 * Capa pura (sin supabase/react) que normaliza un auto VENDIDO a sus números
 * financieros canónicos, vía el helper único `calculateVehicleNetProfit`.
 *
 * Es la ÚNICA fuente de verdad de:
 *  - costo de adquisición (compra | pago al consignante),
 *  - utilidad bruta y neta (c/comisión vendedor),
 *  - qué inputs entran (financiera DENTRO, transferencia FUERA, agreed_price_final).
 *
 * Todas las superficies (detalle, dashboard, resumen, charts, Excel) consumen
 * estas funciones para que Σ por-auto == total del dashboard por construcción.
 *
 * Importa SOLO `./vehicleNetProfit` (puro) → bundleable por esbuild/tsx sin
 * resolver el alias `@/`, así el harness de consistencia puede importarlo directo.
 */
import {
  calculateVehicleNetProfit,
  lineCostBasis,
  type ConsignmentMethod,
  type VehicleExtra,
  type VehicleNetProfitInput,
} from './vehicleNetProfit';
import { buildIvaBreakdown, type IvaExtraLine } from './ivaBreakdown';
import { getVehicleRegimen, regimenSaleHasIva } from './vehicleRegimen';

/** Datos crudos de un auto vendido, tal como vienen de las queries (normalizados). */
export interface RawSoldVehicleBundle {
  saleId: number;
  vehicleId: number;
  saleDate: string | null;
  sellerId: number | null;
  isConsigned: boolean;
  salePrice: number | null;
  /** vehicles_sales.commission_amount (legacy, fallback de comisión vendedor). */
  commissionAmount: number | null;
  /** vehicles_sales.financing_commission. */
  financingCommission: number | null;
  /** purchase_price más reciente no-nulo (autos propios). */
  purchasePrice: number | null;
  /** vehicles_purchases.genera_credito_fiscal (auto propio): si true, el costo de
   *  compra entra NETO. Independiente del régimen de venta. */
  purchaseGeneraCreditoFiscal?: boolean | null;
  consignment: {
    agreedPrice: number | null;
    agreedPriceFinal: number | null;
    method: ConsignmentMethod | undefined;
    commissionPercentage: number | null;
    commissionFixed: number | null;
  } | null;
  closeDeal: {
    dealershipCommission: number | null;
    discount: number | null;
  } | null;
  extras: VehicleExtra[];
  /** Σ sale_commission_splits.amount. `null` ⇒ no hay filas de splits → usar legacy. */
  splitsTotal: number | null;
  /** vehicles.iva_exento (régimen del auto). null ⇒ hereda el default del cliente. */
  ivaExento?: boolean | null;
  /** clients.ventas_exentas_iva (default de régimen del tenant, fallback de ivaExento). */
  clientExempt?: boolean | null;
  /** vehicles_sales.transfer_value (CRT de salida). Regla 4. */
  transferValue?: number | null;
  /** vehicles_sales.transfer_value_charged. true/undefined = la paga el comprador
   *  (pass-through); false = la absorbe la automotora (castiga margen en auto propio). */
  transferValueCharged?: boolean | null;
}

export interface NormalizedSoldVehicle {
  saleId: number;
  vehicleId: number;
  saleDate: string | null;
  sellerId: number | null;
  isConsigned: boolean;
  salePrice: number;
  discount: number;
  /** Costo de adquisición usado (compra o pago al consignante). */
  cogs: number;
  cogsSource: 'purchase' | 'agreed_price' | 'close_deal' | 'commission' | 'none';
  /** false cuando falta el costo (auto propio sin compra / consignado sin precio). */
  hasCostRegistered: boolean;
  financingCommission: number;
  dealershipExpenses: number;
  dealershipIncome: number;
  /** Comisión del vendedor canónica (splits con fallback legacy). */
  sellerCommission: number;
  /** Antes de comisión del vendedor (incluye financiera, excluye transferencia). */
  grossProfit: number;
  /** grossProfit − comisión del vendedor. */
  netProfitAfterSellerCommission: number;
  /** IVA débito del período por esta venta (venta afecta 19/119 del margen + ingresos con IVA). */
  ivaDebito: number;
  /** IVA crédito por esta venta (compra afecta + gastos de la automotora con factura). */
  ivaCredito: number;
  /** IVA neto = débito − crédito (positivo = a pagar al SII). */
  ivaNeto: number;
}

const num = (v: number | null | undefined): number => Number(v) || 0;

/** Comisión del vendedor canónica: splits si existen, si no el legacy. */
export function resolveSellerCommission(b: RawSoldVehicleBundle): number {
  return b.splitsTotal != null ? b.splitsTotal : num(b.commissionAmount);
}

/** Costo de adquisición consignado: agreed_price_final ?? agreed_price. */
function consignedAgreedPrice(b: RawSoldVehicleBundle): number | null {
  if (!b.consignment) return null;
  return b.consignment.agreedPriceFinal ?? b.consignment.agreedPrice;
}

/** Arma el input canónico para el helper desde un bundle crudo. */
export function toHelperInput(b: RawSoldVehicleBundle): VehicleNetProfitInput {
  const override =
    b.isConsigned && num(b.closeDeal?.dealershipCommission) > 0
      ? num(b.closeDeal?.dealershipCommission)
      : null;
  return {
    isSold: true,
    isConsigned: b.isConsigned,
    consignmentMethod: b.consignment?.method,
    salePrice: b.salePrice,
    purchasePrice: !b.isConsigned ? b.purchasePrice : undefined,
    purchaseGeneraCreditoFiscal: !b.isConsigned
      ? b.purchaseGeneraCreditoFiscal
      : undefined,
    agreedPrice: b.isConsigned ? consignedAgreedPrice(b) : undefined,
    commissionPercentage: b.consignment?.commissionPercentage ?? undefined,
    commissionFixed: b.consignment?.commissionFixed ?? undefined,
    consignmentGrossProfitOverride: override,
    discount: b.closeDeal?.discount ?? 0,
    financingCommission: b.financingCommission,
    sellerCommission: resolveSellerCommission(b),
    // Regla 4: la transferencia es pass-through SALVO que la automotora la absorba
    // (transferValueCharged === false) en un auto propio → ahí el helper la castiga.
    transferValue: b.transferValue,
    transferValueCharged: b.transferValueCharged,
    extras: b.extras,
  };
}

/** Determina costo registrado y su origen (para alertas de "auto sin costo").
 *  Reconcilia con la utilidad bruta: para el override de cierre, cogs se define
 *  como salePrice − discount − dealershipCommission (así salePrice − cogs == bruto). */
function resolveCogs(
  b: RawSoldVehicleBundle
): { cogs: number; source: NormalizedSoldVehicle['cogsSource']; has: boolean } {
  if (!b.isConsigned) {
    // cogs = costo de adquisición usado en el margen. Si la compra genera crédito
    // fiscal, entra NETO (consistente con el grossProfit del helper: venta − cogs).
    return b.purchasePrice != null
      ? {
          cogs: lineCostBasis(num(b.purchasePrice), b.purchaseGeneraCreditoFiscal),
          source: 'purchase',
          has: true,
        }
      : { cogs: 0, source: 'none', has: false };
  }
  // Consignado con cierre de negocio (override de comisión de la automotora):
  // el costo es lo que se le paga al consignante = venta − descuento − comisión.
  const override = num(b.closeDeal?.dealershipCommission);
  if (override > 0) {
    return {
      cogs: Math.max(0, num(b.salePrice) - num(b.closeDeal?.discount) - override),
      source: 'close_deal',
      has: true,
    };
  }
  if (b.consignment?.method === 'comision') {
    // Método comisión: la automotora no "compra" el auto, su costo es 0.
    return { cogs: 0, source: 'commission', has: true };
  }
  const agreed = consignedAgreedPrice(b);
  return agreed != null
    ? { cogs: num(agreed), source: 'agreed_price', has: true }
    : { cogs: 0, source: 'none', has: false };
}

/** % de IVA débito de la venta (mismo que useVehicleFinancialData / DEFAULT_IVA_PERCENTAGE). */
const IVA_PCT = 19;

/**
 * Reparte los extras de un bundle en las listas que consume el Resumen IVA,
 * replicando EXACTAMENTE el filtrado del detalle (useVehicleFinancialData:
 * dealershipExpenseExtras / dealershipIncomeExtras): excluye pass-through y clasifica
 * por tipo/assumed_by. Para el IVA solo importan `amount` y `genera_credito_fiscal`.
 *   - gasto de la automotora  → crédito por línea (expense/sale_additional 'dealership').
 *   - ingreso de la automotora → débito por línea (sale_income · income 'dealership' ·
 *                                sale_additional 'customer').
 *   - 'consignor' y 'customer'-expense quedan fuera (neutros), igual que en el margen.
 */
function ivaExtraLines(extras: VehicleExtra[]): {
  expenseLines: IvaExtraLine[];
  incomeLines: IvaExtraLine[];
} {
  const expenseLines: IvaExtraLine[] = [];
  const incomeLines: IvaExtraLine[] = [];
  for (const e of extras) {
    if (e.isPassthrough === true) continue;
    const line: IvaExtraLine = {
      amount: e.amount,
      genera_credito_fiscal: e.generaCreditoFiscal ?? null,
    };
    const ab = e.assumedBy ?? 'dealership';
    if (e.type === 'sale_income') {
      incomeLines.push(line);
    } else if (e.type === 'income') {
      if (ab === 'dealership') incomeLines.push(line);
    } else if (e.type === 'sale_additional') {
      if (ab === 'dealership') expenseLines.push(line);
      else if (ab === 'customer') incomeLines.push(line);
    } else if (e.type === 'expense') {
      if (ab === 'dealership') expenseLines.push(line);
    }
  }
  return { expenseLines, incomeLines };
}

/**
 * IVA por venta reutilizando el MISMO helper puro (`buildIvaBreakdown`) que el
 * Resumen IVA del detalle → dashboard y detalle cuadran por construcción.
 * `grossProfit` es el margen canónico ya calculado (base del IVA débito de la venta).
 */
function computeSoldVehicleIva(
  b: RawSoldVehicleBundle,
  grossProfit: number
): { ivaDebito: number; ivaCredito: number; ivaNeto: number } {
  const regimen = getVehicleRegimen(
    { is_consigned: b.isConsigned, iva_exento: b.ivaExento ?? null },
    !!b.clientExempt
  );
  // IVA débito de la venta = 19% incluido en el margen (solo régimen afecto). Misma
  // fórmula que useVehicleFinancialData.ivaDebitoFiscal.
  const ivaVenta =
    regimenSaleHasIva(regimen) && grossProfit > 0
      ? Math.round((grossProfit * IVA_PCT) / (100 + IVA_PCT))
      : 0;
  const { expenseLines, incomeLines } = ivaExtraLines(b.extras);
  const { totals } = buildIvaBreakdown({
    regimen,
    saleMargin: grossProfit,
    ivaVenta,
    isConsigned: b.isConsigned,
    purchase: b.isConsigned
      ? null
      : {
          purchasePrice: b.purchasePrice,
          generaCreditoFiscal: b.purchaseGeneraCreditoFiscal,
        },
    expenseExtras: expenseLines,
    incomeExtras: incomeLines,
  });
  return { ivaDebito: totals.debito, ivaCredito: totals.credito, ivaNeto: totals.neto };
}

/** Normaliza un bundle a sus números financieros canónicos. */
export function normalizeSoldVehicle(b: RawSoldVehicleBundle): NormalizedSoldVehicle {
  const result = calculateVehicleNetProfit(toHelperInput(b));
  const { cogs, source, has } = resolveCogs(b);
  const sellerCommission = resolveSellerCommission(b);
  const iva = computeSoldVehicleIva(b, result.grossProfit);
  return {
    saleId: b.saleId,
    vehicleId: b.vehicleId,
    saleDate: b.saleDate,
    sellerId: b.sellerId,
    isConsigned: b.isConsigned,
    salePrice: num(b.salePrice),
    discount: num(b.closeDeal?.discount),
    cogs,
    cogsSource: source,
    hasCostRegistered: has,
    financingCommission: num(b.financingCommission),
    dealershipExpenses: result.breakdown.dealershipExpenses,
    dealershipIncome: result.breakdown.dealershipIncome,
    sellerCommission,
    grossProfit: result.grossProfit,
    netProfitAfterSellerCommission: result.netProfitAfterSellerCommission,
    ivaDebito: iva.ivaDebito,
    ivaCredito: iva.ivaCredito,
    ivaNeto: iva.ivaNeto,
  };
}

export function buildNormalizedRows(
  bundles: RawSoldVehicleBundle[]
): NormalizedSoldVehicle[] {
  return bundles.map(normalizeSoldVehicle);
}

/** Totales del dashboard a partir de filas normalizadas (Σ por-auto). */
export function aggregateSoldVehicles(
  rows: NormalizedSoldVehicle[],
  operationalExpenses = 0
) {
  const grossMargin = rows.reduce((s, r) => s + r.grossProfit, 0);
  const totalSellerCommission = rows.reduce((s, r) => s + r.sellerCommission, 0);
  const utilidadNeta = rows.reduce(
    (s, r) => s + r.netProfitAfterSellerCommission,
    0
  );
  // IVA agregado del período: Σ por-auto (débito, crédito, neto=débito−crédito).
  const ivaDebito = rows.reduce((s, r) => s + r.ivaDebito, 0);
  const ivaCredito = rows.reduce((s, r) => s + r.ivaCredito, 0);
  return {
    grossMargin,
    totalSellerCommission,
    /** Σ neta c/comisión vendedor (== KPI "Utilidad Neta"). */
    utilidadNeta,
    /** Utilidad neta − gastos operativos del período (resultado de la empresa). */
    resultadoEmpresa: utilidadNeta - operationalExpenses,
    ivaDebito,
    ivaCredito,
    /** IVA neto del período = débito − crédito (positivo = a pagar al SII). */
    ivaNeto: ivaDebito - ivaCredito,
    count: rows.length,
  };
}
