import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AdminStats } from '../types/adminDashboard';
import { useVehicleStats } from '../useVehicleStats';
import { useSalesStats } from '../useSalesStats';
import { useVisitStats, DateRangeFilter } from '../useVisitStats';
import { supabase } from '@/integrations/supabase/client';

export interface OldestVehicle {
  vehicleId: number;
  daysInStock: number;
}

export const useAdminStats = (
  clientId: number,
  dateFilter?: DateRangeFilter
) => {
  const {
    totalVehicles,
    publishedVehicles,
    consignedVehicles,
    loading: vehiclesLoading,
  } = useVehicleStats(clientId, dateFilter);
  const {
    totalSales,
    totalDiscount,
    totalCogs,
    totalDirectExpenses,
    costOfSales,
    grossMargin,
    grossMarginPct,
    totalSellerCommissions,
    operationalExpenses,
    netMargin,
    netMarginPct,
    vehiclesSoldCount,
    vehiclesWithoutCost,
    ivaDebito,
    ivaCredito,
    ivaNeto,
    totalExpenses,
    totalCommissions,
    loading: salesLoading,
  } = useSalesStats(clientId, dateFilter);
  const { totalVisits: totalVisitsHistorico } = useVisitStats(clientId);
  const {
    monthlyVisits,
    topVehicles,
    loading: visitsLoading,
  } = useVisitStats(clientId, dateFilter);

  const { data: pendingSales = 0, isLoading: pendingLoading } = useQuery({
    queryKey: ['pendingSales', clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_pending_sales_count', {
        p_client_id: Number(clientId),
      });
      if (error) throw error;
      return data || 0;
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });

  const { data: oldestVehicles = [], isLoading: oldestLoading } = useQuery({
    queryKey: ['oldestVehicles', clientId],
    queryFn: async (): Promise<OldestVehicle[]> => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, created_at')
        .eq('client_id', clientId)
        .eq('show_in_stock', true)
        .order('created_at', { ascending: true })
        .limit(6);

      if (error) throw error;

      const now = new Date();
      return (data || []).map((vehicle) => {
        const createdAt = new Date(vehicle.created_at);
        const diffTime = Math.abs(now.getTime() - createdAt.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { vehicleId: vehicle.id, daysInStock: diffDays };
      });
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });

  const loading =
    vehiclesLoading || salesLoading || visitsLoading || pendingLoading || oldestLoading;

  const stats: AdminStats = {
    totalSales,
    totalDiscount,
    totalCogs,
    totalDirectExpenses,
    costOfSales,
    grossMargin,
    grossMarginPct,
    totalSellerCommissions,
    operationalExpenses,
    netMargin,
    netMarginPct,
    vehiclesSoldCount,
    vehiclesWithoutCost,
    ivaDebito,
    ivaCredito,
    ivaNeto,
    totalVehicles,
    publishedVehicles,
    consignedVehicles,
    totalVisits: totalVisitsHistorico,
    pendingSales,
    totalExpenses,
    totalCommissions,
  };

  return { stats, loading, monthlyVisits, topVehicles, oldestVehicles };
};
