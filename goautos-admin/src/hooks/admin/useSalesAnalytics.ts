import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DateFilter } from './useSellerPerformance';
import {
  SalesAnalytics,
  BrandModelMetrics,
  StockRecommendation,
  SoldVehicleData,
} from './types/inventoryAnalytics';
import {
  useDashboardStates,
  useDashboardStatusHistory,
  useDashboardCosts,
  useDashboardVehicles,
} from './useDashboardData';

const EMPTY_ANALYTICS: SalesAnalytics = {
  byBrand: [],
  byModel: [],
  overall: {
    totalSold: 0,
    avgDaysFromCreation: 0,
    avgDaysFromPublication: null,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    avgMargin: 0,
  },
  recommendations: {
    fastestSelling: [],
    mostProfitable: [],
    bestOverall: [],
  },
};

export const useSalesAnalytics = (
  clientId: number | undefined,
  range?: DateFilter
) => {
  // ── Shared data (deduplicated across dashboard hooks) ──
  const { data: rawVehicles } = useDashboardVehicles(clientId);
  const { data: states } = useDashboardStates(clientId);
  const allVehicleIds = useMemo(() => (rawVehicles || []).map((v) => v.id), [rawVehicles]);
  const { data: costs } = useDashboardCosts(clientId, allVehicleIds);
  const { data: statusHistory } = useDashboardStatusHistory(clientId, allVehicleIds);

  // ── Hook-specific query: approved sales with vehicle data ──
  const { data: clientSales, isLoading: salesLoading } = useQuery({
    queryKey: [
      'salesAnalytics-sales',
      clientId,
      range?.startDate?.getTime(),
      range?.endDate?.getTime(),
    ],
    queryFn: async () => {
      let salesQuery = supabase
        .from('vehicles_sales')
        .select(`
            id,
            vehicle_id,
            sale_date,
            sale_price,
            commission_amount,
            vehicles!vehicle_id(
              id,
              created_at,
              brand_id,
              model_id,
              is_consigned,
              client_id,
              brands:brand_id(id, name),
              models:model_id(id, name)
            )
          `)
        .eq('status', 'approved');

      if (range?.startDate) {
        salesQuery = salesQuery.gte('sale_date', range.startDate.toISOString());
      }
      if (range?.endDate) {
        salesQuery = salesQuery.lte('sale_date', range.endDate.toISOString());
      }

      const { data: salesData } = await salesQuery;

      // Filter by client_id
      return (salesData || []).filter(
        s => (s.vehicles as any)?.client_id === clientId
      );
    },
    enabled: !!clientId,
    placeholderData: keepPreviousData,
  });

  // ── Compute analytics from shared + sales data ──
  const analytics = useMemo((): SalesAnalytics => {
    if (!clientSales || !costs || !states || !statusHistory) return EMPTY_ANALYTICS;

    // Apply consignment filter
    let filteredSales = clientSales;
    if (range?.consignmentFilter === 'consigned') {
      filteredSales = clientSales.filter(s => (s.vehicles as any)?.is_consigned === true);
    } else if (range?.consignmentFilter === 'not_consigned') {
      filteredSales = clientSales.filter(s => (s.vehicles as any)?.is_consigned === false);
    }

    if (filteredSales.length === 0) return EMPTY_ANALYTICS;

    const vehicleIds = filteredSales.map(s => s.vehicle_id);

    // Use shared costs (already has purchaseMap + consignmentMap)
    const { purchaseMap, consignmentMap } = costs;
    const acquisitionPriceMap = new Map<number, number>();
    // Consignment first (lower priority)
    consignmentMap.forEach((price, vid) => {
      if (vehicleIds.includes(vid)) acquisitionPriceMap.set(vid, price);
    });
    // Purchase overrides (higher priority)
    purchaseMap.forEach((price, vid) => {
      if (vehicleIds.includes(vid)) acquisitionPriceMap.set(vid, price);
    });

    // Use shared states for web state IDs
    const webStateIds = states.filter(s => s.show_in_web).map(s => s.id);

    // Use shared status history for first publication dates
    const firstPublicationMap = new Map<number, string>();
    if (webStateIds.length > 0) {
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

    // Fallback: use created_at for vehicles without publication history
    filteredSales.forEach(sale => {
      const vehicle = sale.vehicles as any;
      if (!firstPublicationMap.has(sale.vehicle_id) && vehicle?.created_at) {
        firstPublicationMap.set(sale.vehicle_id, vehicle.created_at);
      }
    });

    // Build sold vehicle data array
    const soldVehicles: SoldVehicleData[] = filteredSales.map(sale => {
      const vehicle = sale.vehicles as any;
      const saleDate = new Date(sale.sale_date).getTime();
      const createdAt = new Date(vehicle.created_at).getTime();
      const firstPublishedAt = firstPublicationMap.get(sale.vehicle_id) || null;

      const daysFromCreation = Math.floor((saleDate - createdAt) / (1000 * 60 * 60 * 24));
      let daysFromPublication: number | null = null;
      if (firstPublishedAt) {
        const publishedTime = new Date(firstPublishedAt).getTime();
        daysFromPublication = Math.floor((saleDate - publishedTime) / (1000 * 60 * 60 * 24));
      }

      const acquisitionPrice = acquisitionPriceMap.get(sale.vehicle_id) || 0;
      const salePrice = Number(sale.sale_price) || 0;
      const commission = Number(sale.commission_amount) || 0;
      const profit = salePrice - acquisitionPrice - commission;
      const rawMargin = acquisitionPrice > 0 ? (profit / acquisitionPrice) * 100 : 0;
      const margin = Math.min(Math.max(rawMargin, -100), 500);

      return {
        saleId: sale.id,
        vehicleId: sale.vehicle_id,
        saleDate: sale.sale_date,
        salePrice,
        commissionAmount: commission,
        createdAt: vehicle.created_at,
        firstPublishedAt,
        brandId: vehicle.brand_id || '',
        brandName: vehicle.brands?.name || 'Sin marca',
        modelId: vehicle.model_id,
        modelName: vehicle.models?.name || null,
        isConsigned: vehicle.is_consigned,
        acquisitionPrice,
        daysFromCreation: Math.max(0, daysFromCreation),
        daysFromPublication: daysFromPublication !== null ? Math.max(0, daysFromPublication) : null,
        profit,
        margin,
      };
    });

    // Calculate metrics by brand
    const brandMap = new Map<string, SoldVehicleData[]>();
    soldVehicles.forEach(v => {
      const key = v.brandId || 'unknown';
      if (!brandMap.has(key)) brandMap.set(key, []);
      brandMap.get(key)!.push(v);
    });

    const totalSold = soldVehicles.length;

    const byBrand: BrandModelMetrics[] = Array.from(brandMap.entries())
      .map(([brandId, vehicles]) => calculateMetrics(brandId, vehicles[0].brandName, vehicles, totalSold))
      .sort((a, b) => b.totalSold - a.totalSold);

    // Calculate metrics by model (top 15)
    const modelMap = new Map<string, SoldVehicleData[]>();
    soldVehicles.forEach(v => {
      if (v.modelId) {
        const key = `${v.brandId}-${v.modelId}`;
        if (!modelMap.has(key)) modelMap.set(key, []);
        modelMap.get(key)!.push(v);
      }
    });

    const byModel: BrandModelMetrics[] = Array.from(modelMap.entries())
      .map(([key, vehicles]) => {
        const first = vehicles[0];
        return calculateMetrics(
          first.brandId,
          first.brandName,
          vehicles,
          totalSold,
          first.modelId || undefined,
          first.modelName || undefined
        );
      })
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 15);

    // Calculate overall metrics
    const totalRevenue = soldVehicles.reduce((sum, v) => sum + v.salePrice, 0);
    const totalCost = soldVehicles.reduce((sum, v) => sum + v.acquisitionPrice, 0);
    const totalProfit = soldVehicles.reduce((sum, v) => sum + v.profit, 0);
    const avgDaysFromCreation = soldVehicles.reduce((sum, v) => sum + v.daysFromCreation, 0) / totalSold;

    const vehiclesWithPublication = soldVehicles.filter(v => v.daysFromPublication !== null);
    const avgDaysFromPublication = vehiclesWithPublication.length > 0
      ? vehiclesWithPublication.reduce((sum, v) => sum + (v.daysFromPublication || 0), 0) / vehiclesWithPublication.length
      : null;

    const rawAvgMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
    const avgMargin = Math.min(Math.max(rawAvgMargin, -100), 500);

    const recommendations = generateRecommendations(byBrand);

    return {
      byBrand,
      byModel,
      overall: {
        totalSold,
        avgDaysFromCreation: Math.round(avgDaysFromCreation),
        avgDaysFromPublication: avgDaysFromPublication !== null ? Math.round(avgDaysFromPublication) : null,
        totalRevenue,
        totalCost,
        totalProfit,
        avgMargin,
      },
      recommendations,
    };
  }, [clientSales, costs, states, statusHistory, range?.consignmentFilter]);

  return { analytics, loading: salesLoading };
};

// Helper function to calculate metrics for a group
function calculateMetrics(
  brandId: string,
  brandName: string,
  vehicles: SoldVehicleData[],
  totalSold: number,
  modelId?: number,
  modelName?: string
): BrandModelMetrics {
  const count = vehicles.length;
  const totalRevenue = vehicles.reduce((sum, v) => sum + v.salePrice, 0);
  const totalCost = vehicles.reduce((sum, v) => sum + v.acquisitionPrice, 0);
  const totalProfit = vehicles.reduce((sum, v) => sum + v.profit, 0);

  const daysFromCreation = vehicles.map(v => v.daysFromCreation);
  const daysFromPublication = vehicles
    .filter(v => v.daysFromPublication !== null)
    .map(v => v.daysFromPublication!);

  const rawMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  const avgMargin = Math.min(Math.max(rawMargin, -100), 500);

  return {
    brandId,
    brandName,
    modelId,
    modelName,
    totalSold: count,
    percentageOfTotal: totalSold > 0 ? (count / totalSold) * 100 : 0,
    avgDaysFromCreation: daysFromCreation.length > 0
      ? Math.round(daysFromCreation.reduce((a, b) => a + b, 0) / daysFromCreation.length)
      : 0,
    avgDaysFromPublication: daysFromPublication.length > 0
      ? Math.round(daysFromPublication.reduce((a, b) => a + b, 0) / daysFromPublication.length)
      : null,
    minDaysToSale: daysFromCreation.length > 0 ? Math.min(...daysFromCreation) : 0,
    maxDaysToSale: daysFromCreation.length > 0 ? Math.max(...daysFromCreation) : 0,
    totalRevenue,
    totalCost,
    totalProfit,
    avgMargin,
    avgProfitPerUnit: count > 0 ? totalProfit / count : 0,
  };
}

// Generate stock recommendations based on metrics
function generateRecommendations(byBrand: BrandModelMetrics[]): SalesAnalytics['recommendations'] {
  if (byBrand.length === 0) {
    return { fastestSelling: [], mostProfitable: [], bestOverall: [] };
  }

  const significantBrands = byBrand.filter(b => b.totalSold >= 2);

  if (significantBrands.length === 0) {
    return { fastestSelling: [], mostProfitable: [], bestOverall: [] };
  }

  const maxDays = Math.max(...significantBrands.map(b => b.avgDaysFromCreation)) || 1;
  const maxMargin = Math.max(...significantBrands.map(b => b.avgMargin)) || 1;
  const maxVolume = Math.max(...significantBrands.map(b => b.totalSold)) || 1;

  const withScores: StockRecommendation[] = significantBrands.map(brand => {
    const velocityScore = 100 - (brand.avgDaysFromCreation / maxDays) * 100;
    const profitabilityScore = brand.avgMargin > 0
      ? (brand.avgMargin / maxMargin) * 100
      : 0;
    const volumeScore = (brand.totalSold / maxVolume) * 100;
    const overallScore = (velocityScore * 0.4) + (profitabilityScore * 0.4) + (volumeScore * 0.2);

    const reasons: string[] = [];
    if (velocityScore >= 70) reasons.push('Venta rápida');
    if (profitabilityScore >= 70) reasons.push('Alta rentabilidad');
    if (volumeScore >= 70) reasons.push('Alto volumen');
    if (brand.avgMargin > 15) reasons.push(`Margen ${brand.avgMargin.toFixed(0)}%`);
    if (brand.avgDaysFromCreation < 30) reasons.push(`${brand.avgDaysFromCreation} días promedio`);

    return {
      brandId: brand.brandId,
      brandName: brand.brandName,
      overallScore: Math.round(overallScore),
      velocityScore: Math.round(velocityScore),
      profitabilityScore: Math.round(profitabilityScore),
      volumeScore: Math.round(volumeScore),
      avgDaysToSale: brand.avgDaysFromCreation,
      avgMargin: brand.avgMargin,
      volumeSold: brand.totalSold,
      reasons: reasons.length > 0 ? reasons : ['Datos históricos'],
    };
  });

  const fastestSelling = [...withScores]
    .sort((a, b) => a.avgDaysToSale - b.avgDaysToSale)
    .slice(0, 5);

  const mostProfitable = [...withScores]
    .sort((a, b) => b.avgMargin - a.avgMargin)
    .slice(0, 5);

  const bestOverall = [...withScores]
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 5);

  return { fastestSelling, mostProfitable, bestOverall };
}
