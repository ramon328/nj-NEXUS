
export interface DashboardStats {
  totalVehicles: number;
  publishedVehicles: number;
  soldVehicles: number;
  totalVisits: number;
  totalSales: number;
  byStatusCount: Record<string, number>;
}

export interface MonthlyData {
  month: string;
  visits: number;
  sales: number;
}

export interface VehicleTypeData {
  name: string;
  value: number;
}
