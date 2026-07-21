import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAdminStats } from './hooks/useAdminStats';
import { useSellerPerformance, DateFilter } from './useSellerPerformance';
import { useBrandDistribution } from './useBrandDistribution';
import { useLoadingState } from './hooks/useLoadingState';
import { useSalesStats } from './useSalesStats';
import { useBusinessKpis } from './useBusinessKpis';
import { buildPerformanceSeries } from './utils/deltaAndMerge';

export const useAdminDashboardData = (dateFilter?: DateFilter) => {
  const { clientId } = useAuth();
  const { toast } = useToast();
  const clientIdNumber = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;

  let groupByDay = false;
  if (dateFilter?.startDate && dateFilter?.endDate) {
    const start = dateFilter.startDate, end = dateFilter.endDate;
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 31 && start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) groupByDay = true;
    else if (diff <= 7) groupByDay = true;
  }

  const { stats, loading: statsLoading, monthlyVisits, topVehicles, oldestVehicles } =
    useAdminStats(clientIdNumber, dateFilter);

  const { sellerPerformance, loading: sellerLoading } =
    useSellerPerformance(clientIdNumber, dateFilter);

  const { brandDistribution, loading: brandLoading } =
    useBrandDistribution(clientIdNumber);

  const { monthlyData, totalSales, totalExpenses, totalCommissions, totalCogs, totalExtras, totalSellerCommissions, vehiclesSoldCount, soldVehicles, loading: salesLoading } =
    useSalesStats(clientIdNumber, dateFilter, false, groupByDay);

  const { kpis, loading: kpisLoading } = useBusinessKpis(clientIdNumber, dateFilter);

  const performanceSeries = buildPerformanceSeries(monthlyData || [], monthlyVisits || []);

  const loading = useLoadingState([statsLoading, sellerLoading, brandLoading, salesLoading, kpisLoading]);

  return {
    stats,
    loading,
    monthlyData,
    performanceSeries, // ventas, costos, visitas
    brandDistribution,
    sellerPerformance,
    monthlyVisits,
    topVehicles,
    oldestVehicles,
    totals: { sales: totalSales, expenses: totalExpenses, commissions: totalCommissions, cogs: totalCogs, extras: totalExtras, sellerCommissions: totalSellerCommissions, vehiclesSoldCount },
    soldVehicles,
    kpis, // vehiclesSold, newLeads, closingRate, avgDaysInStock, totalCommissions
  };
};
