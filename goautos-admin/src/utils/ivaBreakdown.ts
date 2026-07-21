/**
 * Desglose de IVA por línea (Resumen IVA del detalle del vehículo) — regla 3 del
 * fundamento contable de GoAuto.
 *
 * Módulo PURO (sin React ni Supabase): consume solo helpers puros
 * (`lineCostBasis`, `regimenSaleHasIva`) para poder reutilizarse tanto en la UI
 * del detalle como en el harness headless del dashboard (PR-5).
 *
 * Construye las filas de origen del IVA bajo el RÉGIMEN DE MARGEN de autos usados que
 * usa el sistema (el débito se calcula sobre el MARGEN, sin recuperar por separado el
 * crédito de la compra del vehículo):
 *   - venta (débito)  → 19% incluido en el margen del sistema, solo régimen afecto.
 *                        Si la compra genera crédito fiscal el costo entró NETO al
 *                        margen, así que la base se corrige al MARGEN BRUTO
 *                        (venta − compra bruta) para no contar el IVA de compra dos veces.
 *   - gasto (crédito) → una fila por cada gasto de la automotora con IVA recuperable.
 *
 * NO se emite crédito por la compra del auto (régimen de margen: ya está en el débito
 * sobre el margen) ni débito por ingresos afectos (su IVA ya está dentro del débito de
 * la venta, porque el ingreso entra bruto al margen). Emitir esas filas duplicaba el IVA.
 *
 * Convención del neto: **neto = débito − crédito** (positivo = IVA a pagar al SII;
 * negativo = IVA a favor). Es la convención unificada que también usará el
 * dashboard; el label de la UI se alinea a esta.
 */

// Imports RELATIVOS (no alias `@/`): este módulo lo importa la capa pura
// `soldVehicleFinancials.ts`, que el harness de márgenes bundlea con esbuild sin
// resolver el alias. `./fiscalCredit` y `./vehicleRegimen` son leaf-modules puros.
import { lineCostBasis } from './fiscalCredit';
import { regimenSaleHasIva, type Regimen } from './vehicleRegimen';

const DEFAULT_IVA_PERCENTAGE = 19;

const n = (x: unknown): number => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};

/** IVA incluido en un monto BRUTO afecto (bruto − neto). */
const ivaFromLine = (amount: unknown, ivaPct: number): number => {
  const bruto = n(amount);
  return Math.round(bruto - lineCostBasis(bruto, true, ivaPct));
};

export type IvaRowSource = 'venta' | 'compra' | 'gasto' | 'ingreso';
export type IvaRowKind = 'debito' | 'credito';

/** Línea de gasto/ingreso tal como llega de `vehicles_extras`. */
export interface IvaExtraLine {
  id?: number | string;
  title?: string | null;
  amount?: number | null;
  genera_credito_fiscal?: boolean | null;
  created_at?: string | null;
}

/** Datos de la compra del auto propio (`vehicles_purchases`). */
export interface IvaPurchaseInput {
  purchasePrice?: number | null;
  generaCreditoFiscal?: boolean | null;
}

export interface IvaBreakdownInput {
  /** Régimen tributario resuelto del vehículo (afecto/exento/consignación). */
  regimen?: Regimen;
  /** Margen bruto del sistema — base del IVA débito de la venta (IVA incluido). */
  saleMargin?: number;
  /**
   * IVA débito de la venta YA calculado por el sistema (round(margen×19/119)).
   * Se pasa explícito para no duplicar la fórmula del hook y cuadrar con la
   * línea informativa histórica.
   */
  ivaVenta?: number;
  isConsigned?: boolean;
  /** Compra del auto propio (solo aplica a stock propio, no consignados). */
  purchase?: IvaPurchaseInput | null;
  /** Gastos de la automotora (crédito por línea con IVA recuperable). */
  expenseExtras?: IvaExtraLine[];
  /**
   * Ingresos extra de la automotora. INFORMATIVO: su IVA ya está incluido en el débito
   * de la venta (el ingreso entra bruto al margen), por eso NO genera fila de débito
   * propia — hacerlo lo contaría dos veces. Se conserva por compatibilidad de la firma.
   */
  incomeExtras?: IvaExtraLine[];
  /** % de IVA (default 19). */
  ivaPct?: number;
}

export interface IvaBreakdownRow {
  source: IvaRowSource;
  kind: IvaRowKind;
  label: string;
  /** Sub-label explicativo (ej. "19% incluido en el margen"). */
  subLabel?: string;
  /** Base imponible de la línea (monto bruto; para la venta = margen del sistema). */
  base: number;
  /** Monto de IVA de la línea. */
  iva: number;
  id?: number | string;
  date?: string | null;
  /**
   * La cifra deriva del precio de compra: la UI debe gatearla también por el
   * permiso VEHICLES_VIEW_PURCHASE_PRICE, no solo por el eye-toggle.
   */
  sensitivePurchase?: boolean;
}

export interface IvaBreakdownTotals {
  debito: number;
  credito: number;
  /** neto = débito − crédito (positivo = a pagar al SII). */
  neto: number;
}

export interface IvaBreakdownResult {
  rows: IvaBreakdownRow[];
  totals: IvaBreakdownTotals;
  /** Hay al menos una línea de crédito o débito. */
  hasData: boolean;
}

/**
 * Construye el desglose de IVA por línea + totales. Puro y determinista.
 */
export const buildIvaBreakdown = (
  input: IvaBreakdownInput
): IvaBreakdownResult => {
  const {
    regimen,
    saleMargin = 0,
    ivaVenta = 0,
    isConsigned = false,
    purchase,
    expenseExtras = [],
    ivaPct = DEFAULT_IVA_PERCENTAGE,
  } = input;

  const rows: IvaBreakdownRow[] = [];
  const saleHasIva = regimen ? regimenSaleHasIva(regimen) : false;

  // Auto propio afecto cuya compra tiene factura afecta (genera crédito fiscal): el
  // costo entra NETO al margen del sistema, así que grossProfit ya "recuperó" el IVA de
  // la compra dentro del margen.
  const purchasePrice = n(purchase?.purchasePrice);
  const purchaseGeneraCredito =
    !isConsigned && purchase?.generaCreditoFiscal === true && purchasePrice > 0;

  // — DÉBITO —
  // Venta: régimen de MARGEN de autos usados → 19% del margen (solo régimen afecto).
  // Caso normal: base = margen del sistema (mismo valor que el ivaVenta que pasa el hook).
  // Caso compra con crédito fiscal: como el costo entró NETO, el margen del sistema ya
  // descontó el IVA de compra; para no contarlo dos veces (y sin emitir además una fila
  // de crédito de compra) la base se corrige al MARGEN BRUTO = margen − IVA de la compra
  // (equivale a venta − compra bruta) y el débito se recalcula sobre esa base. El margen
  // del sistema NO se toca: la corrección vive solo dentro de esta tabla de IVA.
  let ventaBase = n(saleMargin);
  let ventaIva = n(ivaVenta);
  if (saleHasIva && purchaseGeneraCredito) {
    ventaBase = n(saleMargin) - ivaFromLine(purchasePrice, ivaPct);
    ventaIva = Math.round((ventaBase * ivaPct) / (100 + ivaPct));
  }
  if (saleHasIva && ventaIva > 0) {
    rows.push({
      source: 'venta',
      kind: 'debito',
      label: 'IVA venta',
      subLabel: '19% incluido en el margen',
      base: ventaBase,
      iva: ventaIva,
    });
  }

  // — CRÉDITO —
  // NO se emite crédito por la compra del auto propio: en régimen de margen el IVA de la
  // compra no se recupera por separado (ya está considerado en el débito sobre el margen
  // bruto de arriba). Emitir esa fila duplicaba el crédito e invertía el signo del neto.

  // Gastos de la automotora con IVA recuperable (una fila por línea).
  for (const e of expenseExtras) {
    if (e?.genera_credito_fiscal !== true) continue;
    const bruto = n(e.amount);
    if (bruto === 0) continue;
    rows.push({
      source: 'gasto',
      kind: 'credito',
      label: e.title || 'Gasto sin título',
      base: bruto,
      iva: ivaFromLine(bruto, ivaPct),
      id: e.id,
      date: e.created_at ?? null,
    });
  }

  // Ingresos extra afectos: NO generan fila de débito propia. El ingreso entra BRUTO al
  // margen, así que su IVA ya está dentro del débito de la venta (19/119 del margen);
  // emitir una fila por ingreso lo contaría dos veces. Se muestran informativos en el
  // detalle (fuera de esta tabla), no aquí.

  const debito = rows
    .filter((r) => r.kind === 'debito')
    .reduce((sum, r) => sum + r.iva, 0);
  const credito = rows
    .filter((r) => r.kind === 'credito')
    .reduce((sum, r) => sum + r.iva, 0);

  return {
    rows,
    totals: { debito, credito, neto: debito - credito },
    hasData: debito > 0 || credito > 0,
  };
};
