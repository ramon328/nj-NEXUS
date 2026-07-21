
import { useMemo } from 'react';
import {
  useDashboardVehicles,
  useDashboardSoldIds,
  filterActiveVehicles,
} from './useDashboardData';

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

const defaultStats = { totalVehicles: 0, publishedVehicles: 0, consignedVehicles: 0 };

export const useVehicleStats = (clientId: number | undefined, dateFilter?: DateRangeFilter) => {
  const { data: allVehicles, isLoading: vehiclesLoading } = useDashboardVehicles(clientId);

  const vehicleIds = useMemo(
    () => (allVehicles || []).map((v) => v.id),
    [allVehicles]
  );

  const { data: soldIds, isLoading: soldLoading } = useDashboardSoldIds(clientId, vehicleIds);

  const stats = useMemo(() => {
    if (!allVehicles || !soldIds) return defaultStats;

    // Apply date filter: only vehicles created up to end date
    let vehicles = allVehicles;
    if (dateFilter?.startDate) {
      const endDate = (dateFilter.endDate ?? new Date()).toISOString();
      vehicles = vehicles.filter((v) => v.created_at <= endDate);
    }

    const activeVehicles = filterActiveVehicles(vehicles, soldIds);

    const totalVehicles = activeVehicles.length;
    const consignedVehicles = activeVehicles.filter((v) => v.is_consigned).length;
    const publishedVehicles = activeVehicles.filter((v) => {
      return (v.status as any)?.show_in_web === true || v.is_published;
    }).length;

    return { totalVehicles, publishedVehicles, consignedVehicles };
  }, [allVehicles, soldIds, dateFilter?.startDate?.getTime(), dateFilter?.endDate?.getTime()]);

  const loading = vehiclesLoading || soldLoading;

  return { ...stats, loading };
};
