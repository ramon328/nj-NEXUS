/**
 * Helper unificado para cálculo de utilidad/margen de vehículos.
 *
 * Reemplaza las fórmulas duplicadas en useVehicleFinancialData, useTotalNetProfit,
 * salesCalculations, excelExport, VehicleFinancialSummary y DynamicTableCell.
 *
 * Implementa el árbol de decisión del PRD "GoAuto Utilities Commissions" v1.1:
 *
 *                              ¿Está vendido?
 *                            /                \
 *                          NO                   SI
 *                         /                       \
 *               ¿Está consignado?         ¿Está consignado?
 *                /          \                /          \
 *               NO           SI             NO           SI
 *               |          /  \             |          /  \
 *               |    comisión  garantizado  |    comisión  garantizado
 *
 * Reglas:
 * - extras con assumedBy='customer' NUNCA afectan netProfit (solo informativo).
 * - Consignado sin método explícito → asumir 'precio_garantizado' (default backfill).
 * - No vendido sin hypotheticalPrice → usar publishedPrice. Sin ninguno → 0.
 *
 * CONVENCIONES CANÓNICAS (fuente única de verdad — 2026-06-15):
 * - `grossProfit`: utilidad antes de comisión del vendedor. Incluye la comisión
 *   financiera (ingreso real), descuenta el `discount` de cierre, y NUNCA incluye
 *   el valor de transferencia (CRT) — es pass-through, no margen.
 * - `netProfitAfterSellerCommission`: grossProfit − comisión del vendedor.
 * - `netProfit`: alias retrocompatible de grossProfit (lectores viejos).
 * Los gastos operativos/fijos del mes NO entran acá — son capa de empresa.
 */
import { lineCostBasis } from './fiscalCredit';
// Re-export para que soldVehicleFinancials (que importa SOLO de este módulo, por
// bundling del harness headless) pueda netear el costo de compra con la misma regla.
export { lineCostBasis } from './fiscalCredit';

export type ConsignmentMethod = 'comision' | 'precio_garantizado';
// 3 partes de una venta consignada: 'dealership' (automotora, absorbe → gasto),
// 'customer' (cliente final comprador, paga → ingreso) y 'consignor' (consignador
// dueño del auto, se descuenta de su liquidación → NEUTRO en el margen).
export type AssumedBy = 'dealership' | 'customer' | 'consignor';

export type ProfitBranch =
  | 'vendido_stock'
  | 'vendido_consig_comision'
  | 'vendido_consig_garantizado'
  | 'no_vendido_stock'
  | 'no_vendido_consig_comision'
  | 'no_vendido_consig_garantizado'
  | 'sin_datos';

export interface VehicleExtra {
  amount: number;
  type: 'expense' | 'income' | 'sale_additional' | 'sale_income';
  assumedBy: AssumedBy;
  /**
   * Regla 3 (IVA por línea): si true, esta línea de GASTO carga su NETO (total−IVA
   * recuperable); si false/undefined, carga su TOTAL. Solo aplica a gastos de la
   * automotora. Ver fiscalCredit.ts.
   */
  generaCreditoFiscal?: boolean | null;
  /**
   * PASS-THROUGH: dinero que la automotora solo traspasa (ej. CRT / comisión de
   * tarjeta cobrada al cliente y pagada a un tercero). Si true, la línea es NEUTRA en
   * el margen (ni gasto ni ingreso real): se acumula en buckets informativos y no
   * suma/resta. false/undefined → comportamiento normal (retrocompatible).
   */
  isPassthrough?: boolean | null;
}

export interface VehicleNetProfitInput {
  isSold: boolean;
  isConsigned: boolean;
  consignmentMethod?: ConsignmentMethod;

  salePrice?: number | null;
  publishedPrice?: number | null;
  hypotheticalPrice?: number | null;

  purchasePrice?: number | null;
  agreedPrice?: number | null;

  /**
   * IVA de COMPRA (auto propio), independiente del régimen de venta. Si true, el
   * precio de compra entra por su NETO (total−IVA recuperable), igual que un gasto
   * con crédito fiscal; si false/null, entra bruto (comportamiento legacy). Ver
   * fiscalCredit.ts. NO aplica a consignación (agreedPrice entra siempre bruto).
   */
  purchaseGeneraCreditoFiscal?: boolean | null;

  commissionPercentage?: number | null;
  commissionFixed?: number | null;

  /**
   * Override de utilidad bruta para consignados vendidos. Si está seteado, el
   * helper lo usa como utilidad bruta antes de extras, ignorando el cálculo
   * por método. Sirve para respetar el `dealershipCommission` manual que el
   * usuario carga en el flujo de "cierre de negocio" (campo legacy).
   * En Fase 1+, cuando se elimine la entrada manual, este override deja de usarse.
   */
  consignmentGrossProfitOverride?: number | null;

  /** close_deal.discount — reduce el ingreso realizado en autos propios y
   *  consignados garantizados (la automotora absorbe el descuento). */
  discount?: number | null;

  /** vehicles_sales.financing_commission — ingreso de la automotora; SIEMPRE
   *  suma a la utilidad bruta de un auto vendido. */
  financingCommission?: number | null;

  /** Comisión del vendedor canónica (Σ sale_commission_splits, fallback
   *  commission_amount). Se resta SOLO en netProfitAfterSellerCommission. */
  sellerCommission?: number | null;

  /** transfer_value / CRT (transferencia de SALIDA). Regla 4 del fundamento contable:
   *  por defecto la asume el comprador (se suma sobre el precio → pass-through, NO margen).
   *  PERO si se negocia que el comprador no la pague (transferValueCharged === false) en un
   *  auto PROPIO, la absorbe la automotora y castiga el margen. En consignación la automotora
   *  no transfiere a su nombre → nunca castiga. */
  transferValue?: number | null;
  /** ¿El comprador paga la transferencia de salida? true/undefined = sí (pass-through);
   *  false = la absorbe la automotora (castiga el margen en auto propio). */
  transferValueCharged?: boolean | null;

  extras?: VehicleExtra[];
}

export interface VehicleNetProfitBreakdown {
  basePrice: number;
  acquisitionCost: number;
  consignmentCommission: number;
  dealershipExpenses: number;
  dealershipIncome: number;
  customerExpenses: number;
  customerIncome: number;
  /** Pass-through informativo: dinero que solo se traspasa, NEUTRO en el margen. */
  passthroughIncome: number;
  passthroughExpense: number;
  discount: number;
  financingCommission: number;
  sellerCommission: number;
}

export interface VehicleNetProfitResult {
  /** Antes de comisión del vendedor; incluye financiera; excluye transferencia y op. */
  grossProfit: number;
  /** grossProfit − comisión del vendedor. */
  netProfitAfterSellerCommission: number;
  /** @deprecated alias de grossProfit (retrocompat para lectores de .netProfit). */
  netProfit: number;
  isExpected: boolean;
  branch: ProfitBranch;
  breakdown: VehicleNetProfitBreakdown;
}

const n = (v: number | null | undefined): number => Number(v) || 0;

export function partitionExtras(extras: VehicleExtra[] | undefined) {
  const acc = {
    dealershipExpenses: 0,
    dealershipIncome: 0,
    customerExpenses: 0,
    customerIncome: 0,
    passthroughIncome: 0,
    passthroughExpense: 0,
  };
  if (!extras) return acc;
  for (const e of extras) {
    const amount = n(e.amount);
    // PASS-THROUGH (short-circuit, ANTES de cualquier clasificación por assumed_by /
    // sale_income): dinero que la automotora solo traspasa (recargo cobrado al cliente
    // que cubre un costo equivalente pagado a un tercero, ej. CRT / comisión tarjeta).
    // NO es gasto ni ingreso real → NEUTRO en el margen. Se acumula en buckets
    // informativos y se corta acá. Sin el flag (default false) el comportamiento no cambia.
    if (e.isPassthrough) {
      const paysOut =
        e.type === 'expense' ||
        (e.type === 'sale_additional' && e.assumedBy === 'dealership');
      if (paysOut) acc.passthroughExpense += amount;
      else acc.passthroughIncome += amount;
      continue;
    }
    // Regla 3 (IVA por línea): una línea de GASTO que genera crédito fiscal recuperable
    // carga su NETO; si no (o sin especificar), carga su TOTAL. Solo afecta gastos —
    // los ingresos suman su monto tal cual.
    const expenseAmount = lineCostBasis(amount, e.generaCreditoFiscal);
    // sale_income: es INGRESO de la automotora por definición. assumed_by no
    // aplica (un sale_income con assumed_by='dealership' era un artefacto de datos
    // que lo restaba indebidamente de la utilidad). Siempre suma como ingreso.
    if (e.type === 'sale_income') {
      acc.dealershipIncome += amount;
      continue;
    }
    // 'consignor' (tercer valor de assumed_by): lo paga el CONSIGNADOR de su
    // liquidación y la automotora lo recupera del payout → NEUTRO en el margen de
    // la automotora (ni gasto ni ingreso). Se descuenta al consignador en el modal
    // de cierre (DealDetailsStep/SummaryStep), no acá. Aplica a cualquier tipo
    // salvo sale_income (ya resuelto arriba como ingreso puro por decisión).
    if (e.assumedBy === 'consignor') continue;
    // sale_additional: cargo registrado en el cierre de venta. assumed_by define
    // la dirección: 'customer' (default) → el cliente lo paga → ingreso de la
    // automotora; 'dealership' → la automotora lo absorbe → gasto.
    // Otros tipos (reservation_payment, document, status_change) son metadata y NO
    // afectan el cálculo de utilidad.
    if (e.type === 'sale_additional') {
      if (e.assumedBy === 'dealership') acc.dealershipExpenses += expenseAmount;
      else acc.dealershipIncome += amount;
      continue;
    }
    if (e.type !== 'expense' && e.type !== 'income') continue;
    if (e.assumedBy === 'dealership') {
      if (e.type === 'expense') acc.dealershipExpenses += expenseAmount;
      else acc.dealershipIncome += amount;
    } else {
      if (e.type === 'expense') acc.customerExpenses += expenseAmount;
      else acc.customerIncome += amount;
    }
  }
  return acc;
}

export function calculateVehicleNetProfit(
  input: VehicleNetProfitInput
): VehicleNetProfitResult {
  const extras = partitionExtras(input.extras);
  // La comisión financiera es ingreso de la automotora en un auto vendido.
  // Se suma al canal dealershipIncome (igual que antes inyectaban un sale_income).
  const fin = n(input.financingCommission);
  extras.dealershipIncome += fin;
  const discount = n(input.discount);
  const sellerCommission = n(input.sellerCommission);
  const method: ConsignmentMethod =
    input.consignmentMethod ?? 'precio_garantizado';

  // Regla 4: la transferencia de salida solo castiga el margen cuando la automotora la
  // absorbe (transferValueCharged === false) en un auto PROPIO y con venta real. Si la
  // paga el comprador (default) o es consignación, es pass-through → no afecta el margen.
  const transferPenalty =
    input.isSold &&
    n(input.salePrice) > 0 &&
    !input.isConsigned &&
    input.transferValueCharged === false
      ? n(input.transferValue)
      : 0;

  // Constructor del resultado: centraliza grossProfit → net (− comisión vendedor)
  // y el armado del breakdown para que ningún branch lo arme a mano.
  const make = (
    grossProfit: number,
    branch: ProfitBranch,
    isExpected: boolean,
    bd: Partial<VehicleNetProfitBreakdown>
  ): VehicleNetProfitResult => ({
    grossProfit: grossProfit - transferPenalty,
    netProfitAfterSellerCommission: grossProfit - transferPenalty - sellerCommission,
    netProfit: grossProfit - transferPenalty,
    isExpected,
    branch,
    breakdown: {
      basePrice: 0,
      acquisitionCost: 0,
      consignmentCommission: 0,
      dealershipExpenses: extras.dealershipExpenses,
      dealershipIncome: extras.dealershipIncome,
      customerExpenses: extras.customerExpenses,
      customerIncome: extras.customerIncome,
      passthroughIncome: extras.passthroughIncome,
      passthroughExpense: extras.passthroughExpense,
      discount,
      financingCommission: fin,
      sellerCommission,
      ...bd,
    },
  });

  if (input.isSold) {
    const rawBase = n(input.salePrice);
    if (rawBase === 0) return make(0, 'sin_datos', false, {});

    // Override de utilidad bruta (consignados con close_deal manual).
    // 0 es un override VÁLIDO (significa "automotora se quedó con 0"). Solo
    // null/undefined cae al cálculo por método.
    if (input.isConsigned && input.consignmentGrossProfitOverride != null) {
      const override = n(input.consignmentGrossProfitOverride);
      const grossProfit =
        override - extras.dealershipExpenses + extras.dealershipIncome;
      return make(grossProfit, 'vendido_consig_garantizado', false, {
        basePrice: rawBase,
        consignmentCommission: override,
      });
    }

    if (!input.isConsigned) {
      const basePrice = rawBase - discount;
      // IVA de compra: si la compra tiene factura afecta (genera crédito fiscal), el
      // costo entra por su NETO; si no, bruto (legacy). Independiente del régimen de venta.
      const acquisitionCost = lineCostBasis(
        n(input.purchasePrice),
        input.purchaseGeneraCreditoFiscal
      );
      const grossProfit =
        basePrice -
        acquisitionCost -
        extras.dealershipExpenses +
        extras.dealershipIncome;
      return make(grossProfit, 'vendido_stock', false, {
        basePrice,
        acquisitionCost,
      });
    }

    if (method === 'comision') {
      // La comisión se calcula sobre el precio bruto de venta (sin descuento).
      const consignmentCommission =
        (rawBase * n(input.commissionPercentage)) / 100 +
        n(input.commissionFixed);
      const grossProfit =
        consignmentCommission -
        extras.dealershipExpenses +
        extras.dealershipIncome;
      return make(grossProfit, 'vendido_consig_comision', false, {
        basePrice: rawBase,
        consignmentCommission,
      });
    }

    const basePrice = rawBase - discount;
    const acquisitionCost = n(input.agreedPrice);
    // Red de seguridad: un consignado a precio garantizado SIN precio acordado y SIN
    // override de comisión = no sabemos cuánto se queda la automotora. Restar 0 daría
    // margen ≈ precio de venta completo (la automotora NUNCA es dueña de un consignado).
    // Devolvemos 0 (dato faltante) en vez de inflar la utilidad.
    if (acquisitionCost <= 0) {
      return make(0, 'sin_datos', false, { basePrice });
    }
    const grossProfit =
      basePrice -
      acquisitionCost -
      extras.dealershipExpenses +
      extras.dealershipIncome;
    return make(grossProfit, 'vendido_consig_garantizado', false, {
      basePrice,
      acquisitionCost,
    });
  }

  // No vendido (utilidad esperada/proyectada). Suma los ingresos/gastos YA registrados
  // del vehículo (extras → dealershipIncome/dealershipExpenses): ej. la transferencia que
  // pagó el cliente que nos vendió, cargada como ingreso. Antes solo restaba gastos y NO
  // sumaba esos ingresos → aparecían en "Total ingresos" pero no en el Resultado neto
  // (reportado por Sebastián, SsangYong MUSSO: ingreso de $415k que no impactaba el neto).
  // La financiera sí queda fuera porque fin=0 en un auto no vendido (ocurre al vender).
  const basePrice = n(input.hypotheticalPrice) || n(input.publishedPrice);
  if (basePrice === 0) return make(0, 'sin_datos', true, {});

  if (!input.isConsigned) {
    // IVA de compra (ver rama vendido_stock): neto si genera crédito fiscal, bruto si no.
    const acquisitionCost = lineCostBasis(
      n(input.purchasePrice),
      input.purchaseGeneraCreditoFiscal
    );
    const grossProfit =
      basePrice - acquisitionCost - extras.dealershipExpenses + extras.dealershipIncome;
    return make(grossProfit, 'no_vendido_stock', true, {
      basePrice,
      acquisitionCost,
    });
  }

  if (method === 'comision') {
    const consignmentCommission =
      (basePrice * n(input.commissionPercentage)) / 100 +
      n(input.commissionFixed);
    const grossProfit =
      consignmentCommission - extras.dealershipExpenses + extras.dealershipIncome;
    return make(grossProfit, 'no_vendido_consig_comision', true, {
      basePrice,
      consignmentCommission,
    });
  }

  const acquisitionCost = n(input.agreedPrice);
  // Igual que las otras ramas: los ingresos del dealership (sale_income, etc.) SUMAN
  // al margen esperado. Antes faltaba acá → un ingreso en un consignado garantizado no
  // vendido aparecía en "Total ingresos" pero no impactaba el margen (bug tipo MUSSO).
  const grossProfit =
    basePrice - acquisitionCost - extras.dealershipExpenses + extras.dealershipIncome;
  return make(grossProfit, 'no_vendido_consig_garantizado', true, {
    basePrice,
    acquisitionCost,
  });
}
