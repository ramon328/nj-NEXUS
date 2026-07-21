import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminStats } from './types/adminDashboard';
import { InventoryKpis } from './useInventoryKpis';
import { SalesAnalytics } from './types/inventoryAnalytics';
import { BusinessKpis } from './useBusinessKpis';
import { useDashboardVehicles, useDashboardSoldIds, filterActiveVehicles } from './useDashboardData';
import {
  AlertOctagon,
  Flame,
  Clock,
  EyeOff,
  ImageOff,
  UserX,
  TrendingDown,
  TrendingUp,
  ShoppingCart,
  Target,
  Sparkles,
  BarChart3,
  LucideIcon,
} from 'lucide-react';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertKind = 'alert' | 'recommendation';

export interface SmartAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  icon: LucideIcon;
  message: string;
  href?: string;
  actionLabel?: string;
  priority: number;
}

// Status names considered as excluded from "active" inventory
// Must match the logic in useInventoryKpis exactly
const EXCLUDED_STATUS_NAMES = ['vendido', 'sold', 'reservado', 'archivado'];

function isExcludedStatus(statusName: string): boolean {
  const lower = statusName.toLowerCase();
  return EXCLUDED_STATUS_NAMES.some(s => lower.includes(s));
}

interface SupplementaryData {
  pendingLeadsCount: number;
  noPhotoCount: number;
}

export const useSmartAlerts = (
  clientId: number | undefined,
  stats: AdminStats,
  inventoryKpis: InventoryKpis,
  kpis: BusinessKpis,
  salesAnalytics: SalesAnalytics | null,
  loading: boolean
) => {
  const { t } = useTranslation('dashboard');

  // Use shared vehicle data (deduplicated with other dashboard hooks)
  const { data: allVehicles } = useDashboardVehicles(clientId);
  const vehicleIds = useMemo(() => (allVehicles || []).map(v => v.id), [allVehicles]);
  const { data: soldIds } = useDashboardSoldIds(clientId, vehicleIds);

  // Only query that's unique to smart alerts: pending leads count
  const { data: pendingLeadsCount = 0, isLoading: leadsCountLoading } = useQuery({
    queryKey: ['dashboard-pending-leads-count', clientId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId!)
        .eq('status', 'pending')
        .not('customer_id', 'is', null);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!clientId,
  });

  // Compute supplementary data from shared vehicle data
  const supplementary = useMemo((): SupplementaryData => {
    if (!allVehicles || !soldIds) return { pendingLeadsCount: 0, noPhotoCount: 0 };

    const activeVehicles = filterActiveVehicles(allVehicles, soldIds);
    const noPhotoCount = activeVehicles.filter(v => !v.main_image).length;

    return { pendingLeadsCount, noPhotoCount };
  }, [allVehicles, soldIds, pendingLeadsCount]);

  const supplementaryLoading = !allVehicles || !soldIds || leadsCountLoading;

  const alerts = useMemo<SmartAlert[]>(() => {
    if (loading || supplementaryLoading) return [];

    const result: SmartAlert[] = [];
    const { pendingLeadsCount, noPhotoCount } = supplementary;

    const sa = (key: string) => t(`smartAlerts.${key}`);
    const vWord = (n: number) => n === 1 ? sa('vehicle') : sa('vehicles');
    const lWord = (n: number) => n === 1 ? sa('lead') : sa('leads');

    // ═══════════════════════════════════════════════════
    // SECTION A: DATA-DRIVEN ALERTS (actionable problems)
    // ═══════════════════════════════════════════════════

    // A1. Pending sales — needs immediate attention
    if (stats.pendingSales > 0) {
      const n = stats.pendingSales;
      const salesWord = n === 1 ? sa('pendingSale') : sa('pendingSales_plural');
      result.push({
        id: 'pending-sales',
        kind: 'alert',
        severity: 'critical',
        priority: 1,
        icon: AlertOctagon,
        message: sa('pendingSales').replace('{{n}}', String(n)).replace('{{salesWord}}', salesWord),
        href: '/ventas?alertFilter=pending-sales',
        actionLabel: sa('viewSales'),
      });
    }

    // A2. Liquidate — vehicles with >= 300 days in stock
    const liquidateVehicles = (inventoryKpis.oldestVehicles || []).filter(
      v => v.daysInStock >= 300
    );
    if (liquidateVehicles.length > 0) {
      const top = liquidateVehicles.slice(0, 2);
      const names = top
        .map(v => {
          const brand = v.brands?.name || '';
          const model = v.models?.name || '';
          return `${brand} ${model}`.trim() || `#${v.id}`;
        })
        .join(', ');
      const extra = liquidateVehicles.length > 2
        ? sa('liquidateExtra').replace('{{count}}', String(liquidateVehicles.length - 2))
        : '';
      const maxDays = liquidateVehicles[0].daysInStock;
      result.push({
        id: 'liquidate',
        kind: 'alert',
        severity: 'critical',
        priority: 2,
        icon: Flame,
        message: sa('liquidate')
          .replace('{{names}}', names)
          .replace('{{extra}}', extra)
          .replace('{{days}}', String(maxDays)),
        href: '/vehiculos?alertFilter=liquidate',
        actionLabel: sa('viewInventory'),
      });
    }

    // A3. Old stock — vehicles between 90 and 299 days
    const oldStockVehicles = (inventoryKpis.oldestVehicles || []).filter(
      v => v.daysInStock >= 90 && v.daysInStock < 300
    );
    if (oldStockVehicles.length > 0) {
      const count = oldStockVehicles.length;
      const avgDays = Math.round(
        oldStockVehicles.reduce((s, v) => s + v.daysInStock, 0) / count
      );
      result.push({
        id: 'old-stock',
        kind: 'alert',
        severity: 'warning',
        priority: 3,
        icon: Clock,
        message: sa('oldStock')
          .replace('{{count}}', String(count))
          .replace('{{vehicleWord}}', vWord(count))
          .replace('{{avg}}', String(avgDays)),
        href: '/vehiculos?alertFilter=old-stock',
        actionLabel: sa('viewVehicles'),
      });
    }

    // A4. Unpublished vehicles — sourced directly from inventoryKpis
    if (inventoryKpis.vehiclesNeverPublished > 0) {
      const n = inventoryKpis.vehiclesNeverPublished;
      const pct = inventoryKpis.totalActiveVehicles > 0
        ? Math.round((n / inventoryKpis.totalActiveVehicles) * 100)
        : 0;
      result.push({
        id: 'unpublished',
        kind: 'alert',
        severity: 'warning',
        priority: 4,
        icon: EyeOff,
        message: sa('unpublished')
          .replace('{{n}}', String(n))
          .replace('{{vehicleWord}}', vWord(n))
          .replace('{{pct}}', String(pct)),
        href: '/vehiculos?alertFilter=unpublished',
        actionLabel: sa('publishNow'),
      });
    }

    // A5. No-photo vehicles — uses corrected supplementary count
    if (noPhotoCount > 0) {
      result.push({
        id: 'no-photo',
        kind: 'alert',
        severity: 'warning',
        priority: 5,
        icon: ImageOff,
        message: sa('noPhoto')
          .replace('{{n}}', String(noPhotoCount))
          .replace('{{vehicleWord}}', vWord(noPhotoCount)),
        href: '/vehiculos?alertFilter=no-photo',
        actionLabel: sa('addPhotos'),
      });
    }

    // A6. Pending leads — ALL pending, regardless of date filter
    if (pendingLeadsCount > 0) {
      result.push({
        id: 'pending-leads',
        kind: 'alert',
        severity: 'warning',
        priority: 6,
        icon: UserX,
        message: sa('pendingLeads')
          .replace('{{n}}', String(pendingLeadsCount))
          .replace('{{leadWord}}', lWord(pendingLeadsCount)),
        href: '/leads?alertFilter=pending-leads',
        actionLabel: sa('contactLeads'),
      });
    }

    // A7. Low turnover — only if there's enough inventory to matter
    if (
      inventoryKpis.inventoryTurnoverRate < 2 &&
      inventoryKpis.totalActiveVehicles > 5
    ) {
      const rate = inventoryKpis.inventoryTurnoverRate.toFixed(1);
      result.push({
        id: 'low-turnover',
        kind: 'alert',
        severity: 'info',
        priority: 7,
        icon: TrendingDown,
        message: sa('lowTurnover').replace('{{rate}}', rate),
        href: '/vehiculos?alertFilter=low-turnover',
        actionLabel: sa('reviewPrices'),
      });
    }

    // ═══════════════════════════════════════════════════
    // SECTION B: SMART RECOMMENDATIONS (proactive suggestions)
    // ═══════════════════════════════════════════════════

    // B1. Best brand to stock
    if (salesAnalytics && salesAnalytics.recommendations.bestOverall.length > 0) {
      const best = salesAnalytics.recommendations.bestOverall[0];
      const parts: string[] = [];
      if (best.avgDaysToSale > 0) parts.push(sa('recBestBrandSells').replace('{{days}}', String(best.avgDaysToSale)));
      if (best.avgMargin > 0) parts.push(sa('recBestBrandMargin').replace('{{margin}}', best.avgMargin.toFixed(0)));
      const detail = parts.length > 0 ? ` — ${parts.join(', ')}` : '';
      result.push({
        id: 'rec-best-brand',
        kind: 'recommendation',
        severity: 'info',
        priority: 10,
        icon: ShoppingCart,
        message: sa('recBestBrand').replace('{{brand}}', best.brandName).replace('{{detail}}', detail),
      });
    }

    // B2. Fastest selling brand (if different from bestOverall)
    if (salesAnalytics && salesAnalytics.recommendations.fastestSelling.length > 0) {
      const fastest = salesAnalytics.recommendations.fastestSelling[0];
      const bestOverallId = salesAnalytics.recommendations.bestOverall[0]?.brandId;
      if (fastest.brandId !== bestOverallId && fastest.avgDaysToSale > 0 && fastest.volumeSold >= 2) {
        result.push({
          id: 'rec-fast-brand',
          kind: 'recommendation',
          severity: 'info',
          priority: 11,
          icon: TrendingUp,
          message: sa('recFastBrand')
            .replace('{{brand}}', fastest.brandName)
            .replace('{{days}}', String(fastest.avgDaysToSale)),
        });
      }
    }

    // B3. High margin opportunity
    if (salesAnalytics && salesAnalytics.recommendations.mostProfitable.length > 0) {
      const profitable = salesAnalytics.recommendations.mostProfitable[0];
      const usedIds = new Set([
        salesAnalytics.recommendations.bestOverall[0]?.brandId,
        salesAnalytics.recommendations.fastestSelling[0]?.brandId,
      ]);
      if (!usedIds.has(profitable.brandId) && profitable.avgMargin > 10 && profitable.volumeSold >= 2) {
        result.push({
          id: 'rec-profitable-brand',
          kind: 'recommendation',
          severity: 'info',
          priority: 12,
          icon: Target,
          message: sa('recProfitableBrand')
            .replace('{{brand}}', profitable.brandName)
            .replace('{{margin}}', profitable.avgMargin.toFixed(0)),
        });
      }
    }

    // B4. Closing rate insight
    const closingRate = kpis.closingRate.value;
    const prevClosingRate = kpis.closingRate.prevValue;
    if (closingRate > 0) {
      const pct = (closingRate * 100).toFixed(0);
      if (closingRate < 0.05 && kpis.newLeads.value > 5) {
        result.push({
          id: 'rec-closing-rate-low',
          kind: 'recommendation',
          severity: 'warning',
          priority: 8,
          icon: BarChart3,
          message: sa('recClosingRateLow').replace('{{pct}}', pct),
          href: '/leads?alertFilter=pending-leads',
          actionLabel: sa('viewLeads'),
        });
      } else if (prevClosingRate != null && prevClosingRate > 0 && closingRate > prevClosingRate * 1.2) {
        const improvement = Math.round(((closingRate - prevClosingRate) / prevClosingRate) * 100);
        result.push({
          id: 'rec-closing-rate-up',
          kind: 'recommendation',
          severity: 'info',
          priority: 13,
          icon: Sparkles,
          message: sa('recClosingRateUp').replace('{{improvement}}', String(improvement)),
        });
      }
    }

    // B5. Slow-selling brand
    if (inventoryKpis.totalActiveVehicles > 8 && salesAnalytics && salesAnalytics.byBrand.length > 0) {
      const slowBrands = salesAnalytics.byBrand.filter(
        b => b.avgDaysFromCreation > 60 && b.totalSold >= 2
      );
      if (slowBrands.length > 0) {
        const slowest = slowBrands.sort((a, b) => b.avgDaysFromCreation - a.avgDaysFromCreation)[0];
        if (slowest.avgDaysFromCreation > 90) {
          result.push({
            id: 'rec-slow-brand',
            kind: 'recommendation',
            severity: 'info',
            priority: 14,
            icon: Clock,
            message: sa('recSlowBrand')
              .replace('{{brand}}', slowest.brandName)
              .replace('{{days}}', String(slowest.avgDaysFromCreation)),
            href: `/vehiculos?alertFilter=slow-brand&brandId=${slowest.brandId}&brandName=${encodeURIComponent(slowest.brandName)}`,
            actionLabel: sa('viewInventory'),
          });
        }
      }
    }

    return result.sort((a, b) => a.priority - b.priority);
  }, [loading, supplementaryLoading, stats, inventoryKpis, supplementary, salesAnalytics, kpis, t]);

  return {
    alerts,
    loading: loading || supplementaryLoading,
  };
};
