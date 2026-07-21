import { useMemo } from 'react';
import { DateFilter } from './useSellerPerformance';
import { VehicleWithPublicationDays, PublicationDaysData } from './types/inventoryAnalytics';
import {
  useDashboardVehicles,
  useDashboardStates,
  useDashboardSoldIds,
  useDashboardStatusHistory,
  filterActiveVehicles,
} from './useDashboardData';

const EMPTY_DATA: PublicationDaysData = {
  vehicles: [],
  oldestByCreation: [],
  oldestByPublication: [],
  criticalByPublication: [],
  stats: {
    avgDaysInSystem: 0,
    avgDaysPublished: 0,
    maxDaysPublished: 0,
    vehiclesNeverPublished: 0,
    totalActiveVehicles: 0,
  },
};

export const usePublicationDays = (
  clientId: number | undefined,
  range?: DateFilter
) => {
  // ── Shared data (deduplicated across dashboard hooks) ──
  const { data: rawVehicles, isLoading: vehiclesLoading } = useDashboardVehicles(clientId);
  const { data: states, isLoading: statesLoading } = useDashboardStates(clientId);

  const allVehicleIds = useMemo(
    () => (rawVehicles || []).map((v) => v.id),
    [rawVehicles]
  );

  const { data: soldIds, isLoading: soldLoading } = useDashboardSoldIds(clientId, allVehicleIds);
  const { data: statusHistory, isLoading: historyLoading } = useDashboardStatusHistory(clientId, allVehicleIds);

  // ── Compute publication days from shared data ──
  const data = useMemo((): PublicationDaysData => {
    if (!rawVehicles || !states || !soldIds) return EMPTY_DATA;

    // Apply consignment filter
    let allVehicles = rawVehicles;
    if (range?.consignmentFilter === 'consigned') {
      allVehicles = allVehicles.filter((v) => v.is_consigned);
    } else if (range?.consignmentFilter === 'not_consigned') {
      allVehicles = allVehicles.filter((v) => !v.is_consigned);
    }

    // Filter to active vehicles
    const activeVehicles = filterActiveVehicles(allVehicles, soldIds);

    if (activeVehicles.length === 0) return EMPTY_DATA;

    const vehicleIds = activeVehicles.map((v) => v.id);

    // Get web state IDs for publication date tracking
    const webStateIds = states.filter((s) => s.show_in_web).map((s) => s.id);

    // Build first publication map from status history
    const firstPublicationMap = new Map<number, string>();
    if (statusHistory && webStateIds.length > 0) {
      for (const record of statusHistory) {
        if (
          vehicleIds.includes(record.vehicle_id) &&
          webStateIds.includes(record.new_status_id) &&
          !firstPublicationMap.has(record.vehicle_id)
        ) {
          firstPublicationMap.set(record.vehicle_id, record.changed_at);
        }
      }
    }

    // Calculate days for each vehicle
    const now = Date.now();
    const vehiclesWithDays: VehicleWithPublicationDays[] = activeVehicles.map((v) => {
      const createdAt = new Date(v.created_at).getTime();
      const daysInSystem = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

      const firstPublishedAt = firstPublicationMap.get(v.id) || null;
      let daysPublished: number | null = null;
      if (firstPublishedAt) {
        const publishedTime = new Date(firstPublishedAt).getTime();
        daysPublished = Math.floor((now - publishedTime) / (1000 * 60 * 60 * 24));
      }

      return {
        id: v.id,
        created_at: v.created_at,
        main_image: v.main_image || null,
        year: v.year || null,
        is_consigned: v.is_consigned,
        price: Number(v.price) || 0,
        brands: v.brands as { name: string } | null,
        models: v.models as { name: string } | null,
        daysInSystem,
        daysPublished,
        firstPublishedAt,
      };
    });

    // Sort and slice for different views
    const sortedByCreation = [...vehiclesWithDays].sort(
      (a, b) => b.daysInSystem - a.daysInSystem
    );

    const sortedByPublication = [...vehiclesWithDays]
      .filter((v) => v.daysPublished !== null)
      .sort((a, b) => (b.daysPublished || 0) - (a.daysPublished || 0));

    const criticalByPublication = sortedByPublication.filter(
      (v) => (v.daysPublished || 0) >= 90
    );

    // Calculate stats
    const publishedVehicles = vehiclesWithDays.filter((v) => v.daysPublished !== null);
    const neverPublished = vehiclesWithDays.filter((v) => v.daysPublished === null);

    const avgDaysInSystem =
      vehiclesWithDays.length > 0
        ? vehiclesWithDays.reduce((sum, v) => sum + v.daysInSystem, 0) / vehiclesWithDays.length
        : 0;

    const avgDaysPublished =
      publishedVehicles.length > 0
        ? publishedVehicles.reduce((sum, v) => sum + (v.daysPublished || 0), 0) /
          publishedVehicles.length
        : 0;

    const maxDaysPublished =
      publishedVehicles.length > 0
        ? Math.max(...publishedVehicles.map((v) => v.daysPublished || 0))
        : 0;

    return {
      vehicles: vehiclesWithDays,
      oldestByCreation: sortedByCreation.slice(0, 10),
      oldestByPublication: sortedByPublication.slice(0, 10),
      criticalByPublication: criticalByPublication.slice(0, 10),
      stats: {
        avgDaysInSystem: Math.round(avgDaysInSystem),
        avgDaysPublished: Math.round(avgDaysPublished),
        maxDaysPublished,
        vehiclesNeverPublished: neverPublished.length,
        totalActiveVehicles: vehiclesWithDays.length,
      },
    };
  }, [rawVehicles, states, soldIds, statusHistory, range?.consignmentFilter]);

  const loading = vehiclesLoading || statesLoading || soldLoading || historyLoading;

  return { data, loading };
};
