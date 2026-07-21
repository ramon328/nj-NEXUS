// Extend existing types with more specific ones for dashboard
import { BrandDistribution, MonthlyAdminData, SellerPerformance } from '../types';

export interface AdminStats {
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

  // IVA agregado del período (informativo, atribuido a las ventas del período).
  ivaDebito: number;
  ivaCredito: number;
  ivaNeto: number;

  // Inventory
  totalVehicles: number;
  publishedVehicles: number;
  consignedVehicles: number;

  // Other
  totalVisits: number;
  pendingSales: number;

  // Legacy (kept for back-compat with consumers that still read these)
  totalExpenses: number;
  totalCommissions: number;
}

export interface AdminDashboardData {
  stats: AdminStats;
  loading: boolean;
  monthlyData: MonthlyAdminData[];
  brandDistribution: BrandDistribution[];
  sellerPerformance: SellerPerformance[];
}
