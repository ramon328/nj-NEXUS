
import { useMemo } from 'react';
import { useDashboardVehicles } from './useDashboardData';
import { BrandDistribution } from './types';

export const useBrandDistribution = (clientId: number | undefined) => {
  const { data: allVehicles, isLoading: loading } = useDashboardVehicles(clientId);

  const brandDistribution = useMemo((): BrandDistribution[] => {
    if (!allVehicles) return [];

    // Group vehicles by brand
    const brandCounts: Record<string, number> = {};
    allVehicles.forEach((vehicle) => {
      const brandName = vehicle.brands?.name || 'Sin marca';
      brandCounts[brandName] = (brandCounts[brandName] || 0) + 1;
    });

    // Convert to chart data format and sort by count
    const distributionData = Object.entries(brandCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Take top 5 brands and group the rest as "Otros"
    if (distributionData.length > 5) {
      const topBrands = distributionData.slice(0, 5);
      const otherBrands = distributionData.slice(5);
      const otherCount = otherBrands.reduce((sum, item) => sum + item.value, 0);
      return [...topBrands, { name: 'Otros', value: otherCount }];
    }
    return distributionData;
  }, [allVehicles]);

  return { brandDistribution, loading };
};
