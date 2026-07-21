import { create } from 'zustand';

interface KpiValues {
  // Comercial (resumen)
  totalSales: number;
  totalExpenses: number;
  grossMargin: number;
  inventoryValue: number;
  // Ventas
  vehiclesSold: number;
  newLeads: number;
  closingRate: number;
  // Inventario
  ownStock: number;
  consignedVehicles: number;
  publishedVehicles: number;
  avgDaysInStock: number;
  // Finance
  totalNetProfit: number;
  totalCommissions: number;
}

interface DashboardKpiStore {
  values: KpiValues;
  hasData: boolean;
  update: (partial: Partial<KpiValues>) => void;
}

const INITIAL_VALUES: KpiValues = {
  totalSales: 0,
  totalExpenses: 0,
  grossMargin: 0,
  inventoryValue: 0,
  vehiclesSold: 0,
  newLeads: 0,
  closingRate: 0,
  ownStock: 0,
  consignedVehicles: 0,
  publishedVehicles: 0,
  avgDaysInStock: 0,
  totalNetProfit: 0,
  totalCommissions: 0,
};

export const useDashboardKpiStore = create<DashboardKpiStore>((set) => ({
  values: INITIAL_VALUES,
  hasData: false,
  update: (partial) =>
    set((state) => ({
      values: { ...state.values, ...partial },
      hasData: true,
    })),
}));
