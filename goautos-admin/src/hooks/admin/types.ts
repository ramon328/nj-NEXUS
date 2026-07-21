export interface AdminDashboardStats {
  // Sales / margin (PRD §5)
  totalSales: number;
  totalDiscount: number;
  totalCogs: number;
  totalDirectExpenses: number;
  costOfSales: number;
  grossMargin: number;
  grossMarginPct: number;
  totalSellerCommissions: number;
  operationalExpenses: number;
  netMargin: number;
  netMarginPct: number;
  vehiclesSoldCount: number;
  vehiclesWithoutCost: number;

  // Inventory
  totalVehicles: number;
  publishedVehicles: number;
  consignedVehicles: number;

  // Other
  totalVisits: number;

  // Legacy
  totalExpenses: number;
  totalCommissions: number;
}

export interface MonthlyAdminData {
  month: string;
  sales: number;
  vehicleExpenses: number;
  commonExpenses: number;
  commissions: number;
}

export interface BrandDistribution {
  name: string;
  value: number;
}

export interface SellerPerformance {
  id: number;
  name: string;
  sales: number;
  commissions: number;
  vehiclesSold: number;
}
