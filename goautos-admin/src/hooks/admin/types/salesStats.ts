
export interface SalesData {
  id: number;
  sale_price: number;
  commission_amount: number;
  sale_date: string;
  vehicles: {
    client_id: number;
  };
}

export interface PurchasesData {
  id: number;
  purchase_price: number;
  purchase_date: string;
  sale_date?: string; // Fecha de venta del vehículo (para agrupar gastos correctamente)
  vehicles: {
    client_id: number;
  };
}

export interface ConsignmentsData {
  id: number;
  agreed_price: number;
  vehicle_id: number;
  sale_date?: string;
  sale_price?: number;
  dealership_commission?: number;
  vehicles: {
    client_id: number;
  };
}

export interface ExtrasData {
  id: number;
  amount: number;
  created_at: string;
  type: string;
  /**
   * Quién asume el gasto/ingreso. Sólo los marcados como 'dealership' impactan
   * la utilidad de la automotora. Los del cliente no debería contarlos en los
   * KPIs ni en los charts (eran un bug del modelo bucket original).
   */
  assumed_by?: 'dealership' | 'customer' | null;
  vehicle_id?: number;
  vehicles: {
    client_id: number;
    is_consigned?: boolean;
  };
}

export interface MonthlySalesData {
  month: string;
  sales: number;
  vehicleExpenses: number;
  commonExpenses: number;
  commissions: number;
}

export interface SalesStats {
  // PRD §5 canonical fields
  totalSales: number;             // sum of netSalePrice (salePrice - discount)
  totalDiscount: number;          // sum of discounts/permutas
  totalCogs: number;              // pure cost of goods (no direct expenses)
  totalDirectExpenses: number;    // vehicles_extras attributed to sold vehicles
  costOfSales: number;            // totalCogs + totalDirectExpenses
  grossMargin: number;            // totalSales - costOfSales
  grossMarginPct: number;         // % of totalSales
  totalSellerCommissions: number; // vehicles_sales.commission_amount sum
  operationalExpenses: number;    // unattributed extras + fixed prorated
  netMargin: number;              // grossMargin - sellerCommissions - operationalExpenses
  netMarginPct: number;           // % of totalSales
  vehiclesSoldCount: number;
  vehiclesWithoutCost: number;    // for "auto sin costo registrado" alert

  // IVA agregado del período (Σ por-auto). Informativo, atribuido a las ventas del período.
  ivaDebito: number;              // IVA débito (ventas afectas + ingresos con IVA)
  ivaCredito: number;             // IVA crédito (compras/gastos con factura)
  ivaNeto: number;                // débito − crédito (positivo = a pagar al SII)

  // Legacy/back-compat (consumed by AdminStats, usePreviousPeriodTotals, etc.)
  totalExpenses: number;          // mirrors costOfSales
  totalCommissions: number;       // mirrors totalSellerCommissions
  totalExtras: number;            // mirrors totalDirectExpenses

  monthlyData: MonthlySalesData[];
}
