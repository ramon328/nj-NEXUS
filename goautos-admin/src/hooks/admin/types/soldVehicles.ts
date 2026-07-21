/**
 * Single source of truth for "what was sold in this period".
 * Every KPI, breakdown and chart on the comercial dashboard derives from
 * arrays of this type — no parallel calculations elsewhere.
 */
export interface SoldVehicleRow {
  saleId: number;
  vehicleId: number;
  isConsigned: boolean;
  saleDate: string;          // ISO
  sellerId: number | null;

  salePrice: number;         // vehicles_sales.sale_price (gross)
  discount: number;          // vehicles_close_deal.discount (0 if no close_deal)
  netSalePrice: number;      // salePrice - discount

  cogs: number;
  hasCostRegistered: boolean; // false → trigger "auto sin costo" alert
  cogsSource:
    | 'purchase_price'
    | 'consignment_close_deal'
    | 'consignment_agreed_price'
    | 'consignment_commission'
    | 'unknown';

  directExpenses: number;    // net dealership extras (sin financiera), per vehicleNetProfit.partitionExtras
  /** Comisión del vendedor CANÓNICA: Σ sale_commission_splits, fallback commission_amount. */
  sellerCommission: number;
  /** vehicles_sales.financing_commission — ingreso de la automotora, DENTRO del bruto. */
  financingCommission: number;
  /** Utilidad bruta canónica (incluye financiera, excluye transferencia, neto de descuento). */
  grossProfit: number;
  /** grossProfit − comisión del vendedor. */
  netProfitAfterSellerCommission: number;

  /** IVA débito de la venta (afecta 19/119 del margen + ingresos con IVA). Informativo. */
  ivaDebito: number;
  /** IVA crédito (compra afecta + gastos de la automotora con factura). Informativo. */
  ivaCredito: number;
  /** IVA neto = débito − crédito (positivo = a pagar al SII). Informativo. */
  ivaNeto: number;
}
