'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import { DateFilter, ConsignmentFilter } from '@/hooks/admin/useSellerPerformance';
import { useAdminDashboardData } from '@/hooks/admin/useAdminDashboardData';
import { useTotalNetProfit } from '@/hooks/useTotalNetProfit';
import { useVehicleNetProfitsByPeriod } from '@/hooks/admin/useVehicleNetProfitsByPeriod';
import { useActiveDealership } from '@/hooks/useActiveDealership';
import { useInventoryKpis } from '@/hooks/admin/useInventoryKpis';
import { useInventoryValue } from '@/hooks/admin/useInventoryValue';
import { useMonthlyInventoryValue } from '@/hooks/admin/useMonthlyInventoryValue';
import { useSellersData } from '@/hooks/admin/useSellersData';
import { useSellersList } from '@/hooks/admin/useSellersList';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { useLatestLeads } from '@/hooks/admin/useLatestLeads';
import { useSalesAnalytics } from '@/hooks/admin/useSalesAnalytics';
import { usePreparationMetrics } from '@/hooks/admin/usePreparationMetrics';
import { useInventoryPerformance } from '@/hooks/admin/useInventoryPerformance';
import { useStatuses } from '@/hooks/useStatuses';

import { useSmartAlerts } from '@/hooks/admin/useSmartAlerts';
import { usePreviousPeriodTotals } from '@/hooks/admin/usePreviousPeriodTotals';
import { useRegisterLoader } from '@/contexts/PageLoadingContext';

import AdminStats from './AdminStats';
import type { ComercialKpiKey } from './AdminStats';
import MargenBreakdown from './MargenBreakdown';
import IvaSummaryCard from './IvaSummaryCard';
import MissingCostsAlert from './MissingCostsAlert';
import { useDashboardKpiStore } from '@/stores/dashboardKpiStore';
import { usePermissions } from '@/hooks/usePermissions';
import ImplementationBanner from '@/components/dashboard/ImplementationBanner';
import { PermissionCode } from '@/types/permissions';
import AdminSalesChart from './charts/AdminSalesChart';
import AdminExpensesChart from './charts/AdminExpensesChart';
import AdminVehiclesBrandChart from './charts/AdminVehiclesBrandChart';
import AdminSellerVehiclesChart from './charts/AdminSellerVehiclesChart';
import AdminSellerCommissionsChart from './charts/AdminSellerCommissionsChart';
import BrandSalesRanking from './charts/BrandSalesRanking';
import VisitsChart from '@/components/dashboard/VisitsChart';
import TopVehiclesCard from './TopVehiclesCard';
import CriticalVehiclesCard from './CriticalVehiclesCard';
import InventoryHealthCard from './InventoryHealthCard';
import BusinessPerformanceChart from './BusinessPerformanceChart';
import BusinessPerformanceSection from './BusinessPerformanceSection';
import SmartAlerts from './SmartAlerts';
import ProfitMarginChart from './charts/ProfitMarginChart';
import FinancialMetricsCard from './FinancialMetricsCard';
import ExpensesBreakdownCard from './ExpensesBreakdownCard';
import VehiclesByStatusChart from './charts/VehiclesByStatusChart';
import InventoryPerformanceChart from './InventoryPerformanceChart';
import InventoryPerformanceSection from './InventoryPerformanceSection';
import OldestVehiclesCard from './OldestVehiclesCard';
import OldestByPublicationCard from './OldestByPublicationCard';
import { SalesSummaryTable } from './sales/SalesSummaryTable';
import PreparationMetricsCard from './PreparationMetricsCard';
import { CostsSummaryTable } from './sales/CostsSummaryTable';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SellersLeaderboard } from './sellers/SellersLeaderboard';
import { SellersVehiclesTable } from './sellers/SellersVehiclesTable';
import { SellersSalesTable } from './sellers/SellersSalesTable';
import { SellersSalesChart } from './sellers/SellersSalesChart';
import { SellersCommissionsChart } from './sellers/SellersCommissionsChart';
import { LatestLeadsTable } from './web/LatestLeadsTable';
import WebVisitsSection from './web/WebVisitsSection';
import WebsiteCard from './WebsiteCard';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { exportResumenAutomotora } from '@/utils/excelExport';
import {
  Calendar,
  BarChart2,
  Layers,
  TrendingUp,
  ShoppingBag,
  Users,
  DollarSign,
  Clock,
  Globe,
  Download,
  Eye,
  Target,
  AlertTriangle,
} from 'lucide-react';

type View = 'comercial' | 'inventario' | 'web' | 'finance' | 'vendedores';
type TimeKey = 'all' | 'year' | 'month' | 'last7' | 'custom';

/* ── KPI Carousel: swipeable cards with pagination dots (mobile only, grid on sm+) ── */
function KpiCarousel({
  children,
  count = 4,
  ...rest
}: {
  children: React.ReactNode;
  count?: number;
} & React.HTMLAttributes<HTMLDivElement>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.children.length === 0) return;
    const child = el.children[0] as HTMLElement;
    const step = child.offsetWidth + 12; // 12px = gap-3
    const idx = Math.round(el.scrollLeft / step);
    setActiveIndex(Math.min(Math.max(idx, 0), count - 1));
  };

  return (
    <div {...rest}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className={`flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4
                   sm:grid sm:gap-4 sm:overflow-visible ${
                     count <= 1
                       ? 'sm:grid-cols-1'
                       : count === 2
                         ? 'sm:grid-cols-2'
                         : count === 3
                           ? 'sm:grid-cols-2 lg:grid-cols-3'
                           : 'sm:grid-cols-2 lg:grid-cols-4'
                   }`}
      >
        {children}
      </div>
      {/* Pagination dots — mobile only */}
      <div className='flex justify-center gap-2 pt-3 sm:hidden'>
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            aria-label={`Card ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              activeIndex === i
                ? 'h-2 w-6 bg-slate-400'
                : 'h-2 w-2 bg-slate-200'
            }`}
            onClick={() => {
              const el = scrollRef.current;
              if (!el) return;
              const child = el.children[i] as HTMLElement;
              if (!child) return;
              el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t: tDashboard, i18n } = useTranslation('dashboard');
  const { clientId } = useAuth();
  // División de sedes (Slice 4): sedes visibles del usuario. Se inyectan en el
  // `dateFilter` único que alimenta a TODOS los sub-hooks del dashboard, de modo
  // que las métricas financieras (que cuelgan de fetchSoldVehicleRows) se filtran
  // por la sede del auto. `null` = sin filtro (retrocompatible).
  const { visibleDealershipIds } = useActiveDealership();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  const [timeFilter, setTimeFilter] = useState<TimeKey>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [dateRange, setDateRange] = useState<[Date, Date] | null>(null);
  const [consignmentFilter, setConsignmentFilter] = useState<ConsignmentFilter>('all');
  const [selectedSellerIds, setSelectedSellerIds] = useState<string[]>([]);

  const { hasPermission } = usePermissions();

  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);

  const consignmentOptions: { key: ConsignmentFilter; label: string }[] = [
    { key: 'all', label: dv('Todos los vehículos', 'All vehicles') },
    { key: 'not_consigned', label: dv('Propios', 'Own') },
    { key: 'consigned', label: dv('Consignados', 'Consigned') },
  ];

  const timeOptions: { key: TimeKey; shortLabel: string }[] = [
    { key: 'last7',  shortLabel: '7d' },
    { key: 'month',  shortLabel: dv('Mes', 'Mo') },
    { key: 'year',   shortLabel: dv('Año', 'Yr') },
    { key: 'all',    shortLabel: dv('Todo', 'All') },
  ];

  const timeLabel =
    timeFilter === 'all'
      ? dv('Todo', 'All')
      : timeFilter === 'year'
      ? dv('Este año', 'This year')
      : timeFilter === 'last7'
      ? dv('1 semana', '1 week')
      : timeFilter === 'custom'
      ? dv('Personalizado', 'Custom')
      : dv('Este mes', 'This month');

  useEffect(() => {
    const now = new Date();
    const sellerIds = selectedSellerIds.length > 0 ? selectedSellerIds : undefined;
    // Sede activa: null = sin filtro. Se agrega a cada variante del dateFilter.
    const dealershipIds = visibleDealershipIds ?? undefined;

    if (timeFilter === 'custom') {
      if (dateRange && dateRange[0] && dateRange[1]) {
        // Normalizar a día local completo: inicio 00:00 y fin 23:59:59, así un mes
        // anterior se captura entero y no se pierden ventas de borde por timezone.
        const startDate = new Date(dateRange[0]);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange[1]);
        endDate.setHours(23, 59, 59, 999);
        setDateFilter({ startDate, endDate, consignmentFilter, sellerIds, dealershipIds });
      } else {
        setDateFilter({ consignmentFilter, sellerIds, dealershipIds });
      }
    } else {
      const map: Record<Exclude<TimeKey, 'custom'>, Omit<DateFilter, 'consignmentFilter'>> = {
        all: {},
        year: { startDate: new Date(now.getFullYear(), 0, 1), endDate: now },
        last7: {
          startDate: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
          endDate: now,
        },
        month: {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: now,
        },
      };
      setDateFilter({ ...map[timeFilter], consignmentFilter, sellerIds, dealershipIds });
    }
  }, [timeFilter, dateRange, consignmentFilter, selectedSellerIds, visibleDealershipIds]);

  const { monthlyInventory: monthlyInv } = useMonthlyInventoryValue(
    typeof clientId === 'string' ? parseInt(clientId, 10) : clientId,
    dateFilter
  );

  const { sellers: sellersList } = useSellersList(
    typeof clientId === 'string' ? parseInt(clientId, 10) : clientId
  );
  const sellerOptions = sellersList.map((s) => ({ value: s.id, label: s.label }));

  const {
    stats,
    loading,
    monthlyData,
    performanceSeries, // ventas/costos/visitas para el gráfico combinado
    brandDistribution,
    sellerPerformance,
    monthlyVisits,
    topVehicles,
    oldestVehicles,
    totals, // { sales, expenses, commissions, cogs, vehiclesSoldCount }
    soldVehicles,
    kpis, // { vehiclesSold, newLeads, closingRate, avgDaysInStock, totalCommissions }
  } = useAdminDashboardData(dateFilter);

  const { totalNetProfit, loading: netProfitLoading } =
    useTotalNetProfit(dateFilter);

  // Utilidad neta por período (vía helper unificado) — alimenta ProfitMarginChart
  // para que el "Ganancia/Pérdida Mensual" coincida con el KPI dashboard.
  const { data: netProfitByPeriodData } = useVehicleNetProfitsByPeriod(
    'month',
    dateFilter
  );
  const { kpis: inventoryKpis, loading: inventoryKpisLoading } =
    useInventoryKpis(
      typeof clientId === 'string' ? parseInt(clientId, 10) : clientId,
      dateFilter
    );
  const { inventoryValue, loading: inventoryValueLoading } = useInventoryValue(
    typeof clientId === 'string' ? parseInt(clientId, 10) : clientId,
    dateFilter
  );

  // Merge inventario mensual en performanceSeries solo para el gráfico.
  // En vista mensual las keys coinciden directamente ("Ene 25", "Feb 25", etc.).
  // En vista diaria las keys son labels como "lun. 03/03" que no matchean con monthlyInv.
  // Para ese caso: reconstruimos la fecha de cada punto desde el dateFilter
  // y buscamos el month key correspondiente.
  const performanceWithInventory = (() => {
    const series = performanceSeries || [];
    if (series.length === 0) return [];

    // Si el primer punto matchea directamente, estamos en vista mensual
    if (monthlyInv[series[0].month] !== undefined) {
      return series.map(p => ({
        ...p,
        inventory: monthlyInv[p.month] ?? inventoryValue ?? 0,
      }));
    }

    // Vista diaria/semanal: usar key ISO (YYYY-MM-DD) para inventario diario
    const start = dateFilter?.startDate;
    return series.map((p, i) => {
      let inv = inventoryValue ?? 0;
      if (start) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const isoKey = d.toISOString().slice(0, 10);
        inv = monthlyInv[isoKey] ?? inventoryValue ?? 0;
      }
      return { ...p, inventory: inv };
    });
  })();
  const { sellersStats, loading: sellersLoading } = useSellersData(
    typeof clientId === 'string' ? parseInt(clientId, 10) : clientId,
    dateFilter
  );
  const { leads: latestLeads, loading: leadsLoading } = useLatestLeads(
    typeof clientId === 'string' ? parseInt(clientId, 10) : clientId,
    dateFilter,
    15 // Mostrar los últimos 15 leads
  );
  const { analytics: salesAnalytics, loading: salesAnalyticsLoading } = useSalesAnalytics(
    typeof clientId === 'string' ? parseInt(clientId, 10) : clientId,
    dateFilter
  );
  const { data: inventoryPerfData, loading: inventoryPerfLoading } = useInventoryPerformance(
    typeof clientId === 'string' ? parseInt(clientId, 10) : clientId,
    dateFilter
  );
  const { statuses: availableStates, isLoading: statesLoading } = useStatuses();
  const { metrics: stateMetrics, loading: stateMetricsLoading } = usePreparationMetrics(
    typeof clientId === 'string' ? parseInt(clientId, 10) : clientId,
    dateFilter,
    selectedStateId
  );

  // Keep the loading screen visible until main dashboard data is ready
  useRegisterLoader(loading || inventoryKpisLoading);

  const { alerts: smartAlerts, loading: smartAlertsLoading } = useSmartAlerts(
    typeof clientId === 'string' ? parseInt(clientId, 10) : clientId,
    stats,
    inventoryKpis,
    kpis,
    salesAnalytics,
    loading || inventoryKpisLoading || salesAnalyticsLoading
  );

  const { prevSales, prevExpenses, prevMargin } = usePreviousPeriodTotals(dateFilter);

  const comparisonLabel = (() => {
    if (timeFilter === 'all') return undefined;
    if (timeFilter === 'last7') return dv('vs semana ant.', 'vs prev week');
    if (timeFilter === 'month') return dv('vs mes ant.', 'vs prev month');
    if (timeFilter === 'year') return dv('vs año ant.', 'vs prev year');
    if (timeFilter === 'custom') return dv('vs período ant.', 'vs prev period');
    return undefined;
  })();

  // Seleccionar el primer estado disponible por defecto
  useEffect(() => {
    if (!selectedStateId && availableStates.length > 0) {
      // Buscar primero "Preparación", si no existe usar el primero
      const preparacionState = availableStates.find(s =>
        s.name?.toLowerCase().includes('preparación') || s.name?.toLowerCase().includes('preparacion')
      );
      setSelectedStateId(preparacionState?.id || availableStates[0].id);
    }
  }, [availableStates, selectedStateId]);
  const filtroLabel = timeLabel;

  /* ── Sync KPI values to Zustand store for caching ── */
  const updateKpiCache = useDashboardKpiStore((s) => s.update);

  useEffect(() => {
    if (loading) return;
    updateKpiCache({
      totalSales: totals.sales,
      totalExpenses: totals.expenses,
      grossMargin: totals.sales - totals.expenses,
      vehiclesSold: kpis?.vehiclesSold.value ?? 0,
      newLeads: kpis?.newLeads.value ?? 0,
      closingRate: kpis?.closingRate.value ?? 0,
      ownStock: stats.totalVehicles - stats.consignedVehicles,
      consignedVehicles: stats.consignedVehicles,
      publishedVehicles: stats.publishedVehicles,
      avgDaysInStock: kpis?.avgDaysInStock.value ?? 0,
      totalCommissions: totals.commissions,
    });
  }, [loading, totals, kpis, stats, updateKpiCache]);

  useEffect(() => {
    if (!inventoryValueLoading) {
      updateKpiCache({ inventoryValue });
    }
  }, [inventoryValueLoading, inventoryValue, updateKpiCache]);

  useEffect(() => {
    if (!netProfitLoading) {
      updateKpiCache({ totalNetProfit });
    }
  }, [netProfitLoading, totalNetProfit, updateKpiCache]);

  const TAB_PERMISSIONS: Record<View, PermissionCode> = {
    comercial: PermissionCode.DASHBOARD_TAB_COMERCIAL,
    inventario: PermissionCode.DASHBOARD_TAB_INVENTARIO,
    web: PermissionCode.DASHBOARD_TAB_WEB,
    finance: PermissionCode.DASHBOARD_TAB_COMERCIAL, // finance is hidden, map to comercial as fallback
    vendedores: PermissionCode.DASHBOARD_TAB_VENDEDORES,
  };

  const allViewTabs = [
    { key: 'comercial' as View, icon: ShoppingBag, label: dv('Comercial', 'Commercial') },
    { key: 'inventario' as View, icon: Layers, label: dv('Inventario', 'Inventory') },
    // { key: 'finance' as View, icon: TrendingUp, label: dv('Finanzas', 'Finance') },
    { key: 'vendedores' as View, icon: Users, label: dv('Vendedores', 'Sellers') },
    { key: 'web' as View, icon: BarChart2, label: 'Web' },
  ];

  const viewTabs = allViewTabs.filter(({ key }) => hasPermission(TAB_PERMISSIONS[key]));

  const [view, setView] = useState<View>(viewTabs[0]?.key ?? 'comercial');

  const changeView = useCallback((tab: View) => {
    setView(tab);
  }, []);

  // If the current view is no longer permitted, reset to first available tab
  useEffect(() => {
    if (viewTabs.length > 0 && !viewTabs.some((t) => t.key === view)) {
      setView(viewTabs[0].key);
    }
  }, [viewTabs, view]);

  /* Desktop pills — igual que antes */
  const Pills = (
    <div className='overflow-x-auto hide-scrollbar -mx-1 px-1'>
      <div className='flex flex-nowrap gap-2'>
        {viewTabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => changeView(key)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
              view === key
                ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Icon className='h-4 w-4 shrink-0' />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  /* Mobile tabs — segmented control nativo */
  const mobileGridCols = viewTabs.length <= 2 ? 'grid-cols-2' : viewTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
  const MobilePills = (
    <div className={`bg-slate-100/60 rounded-2xl p-1.5 grid ${mobileGridCols} gap-1`}>
      {viewTabs.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => changeView(key)}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-center transition-all ${
            view === key
              ? 'bg-white text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06),0_0_0_0.5px_rgba(0,0,0,0.04)] font-semibold'
              : 'text-slate-400 active:bg-white/50'
          }`}
        >
          <Icon className={`h-5 w-5 shrink-0 transition-colors ${view === key ? 'text-primary' : 'text-slate-400'}`} />
          <span className='text-[10px] font-medium leading-tight'>{label}</span>
        </button>
      ))}
    </div>
  );

  const defaultCommercialTab = hasPermission(PermissionCode.DASHBOARD_COMERCIAL_RESUMEN_VENTAS) ? 'sales' : 'costs';
  const [commercialTab, setCommercialTab] = useState<'sales' | 'costs'>(defaultCommercialTab);
  const exportFnRef = useRef<(() => void) | null>(null);
  const [exportDisabled, setExportDisabled] = useState(true);
  const [resumenAutomotoraLoading, setResumenAutomotoraLoading] = useState(false);

  // Descargable "Resumen Automotora" (formato del contador Joaquín / Mallorca): libro
  // con hoja de transacciones + dashboard con IVA en régimen general. Gate financiero
  // (mismo que el margen/IVA). Toma el período actual del dashboard como filtro inicial.
  const handleExportResumenAutomotora = async () => {
    if (resumenAutomotoraLoading) return;
    const cid = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;
    if (!cid) return;
    setResumenAutomotoraLoading(true);
    try {
      await exportResumenAutomotora({
        clientId: cid,
        startDate: dateFilter?.startDate ?? null,
        endDate: dateFilter?.endDate ?? null,
        isAdminOrSuperadmin: true,
      });
    } catch (err) {
      console.error('Error exportando Resumen Automotora:', err);
    } finally {
      setResumenAutomotoraLoading(false);
    }
  };
  const [oldestVehiclesTab, setOldestVehiclesTab] = useState<'creation' | 'publication'>('creation');

  // Compute visible KPI keys based on permissions
  const KPI_PERMISSION_MAP: { key: ComercialKpiKey; perm: PermissionCode }[] = [
    { key: 'ventas_totales', perm: PermissionCode.DASHBOARD_COMERCIAL_VENTAS },
    { key: 'gastos_totales', perm: PermissionCode.DASHBOARD_COMERCIAL_GASTOS },
    { key: 'margen_bruto', perm: PermissionCode.DASHBOARD_COMERCIAL_MARGEN },
    { key: 'valor_inventario', perm: PermissionCode.DASHBOARD_COMERCIAL_INVENTARIO },
  ];
  const visibleKpis = KPI_PERMISSION_MAP.filter(({ perm }) => hasPermission(perm)).map(({ key }) => key);
  const showRendimiento = hasPermission(PermissionCode.DASHBOARD_COMERCIAL_RENDIMIENTO);
  const showAlertas = hasPermission(PermissionCode.DASHBOARD_COMERCIAL_ALERTAS);
  const showResumenVentas = hasPermission(PermissionCode.DASHBOARD_COMERCIAL_RESUMEN_VENTAS);
  const showResumenCostos = hasPermission(PermissionCode.DASHBOARD_COMERCIAL_RESUMEN_COSTOS);

  const SectionVentas = (
    <>
      {/* 4 KPI - Carousel en mobile, grid en desktop */}
      {visibleKpis.length > 0 && (
        <KpiCarousel count={visibleKpis.length} data-tour="dashboard-kpis">
          <AdminStats
            mode='resumen'
            stats={stats}
            kpis={kpis}
            totals={totals}
            loading={loading}
            totalNetProfit={totalNetProfit}
            netProfitLoading={netProfitLoading}
            inventoryValue={inventoryValue}
            inventoryValueLoading={inventoryValueLoading}
            visibleKpis={visibleKpis}
            prevTotals={{ prevSales, prevExpenses, prevMargin }}
            comparisonLabel={comparisonLabel}
          />
        </KpiCarousel>
      )}

      {/* Rendimiento del Negocio + Alertas */}
      {(showRendimiento || showAlertas) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" data-tour="dashboard-performance">
          {showRendimiento && (
            <div className={showAlertas ? "lg:col-span-2 lg:order-2" : "lg:col-span-3"} data-tour="dashboard-chart">
              <BusinessPerformanceSection
                globalDateFilter={dateFilter}
                globalData={performanceWithInventory}
                globalLoading={loading}
                title={dv('Rendimiento del Negocio', 'Business Performance')}
                subtitle={`${filtroLabel}`}
              />
            </div>
          )}
          {showAlertas && (
            <div className={showRendimiento ? "lg:col-span-1 lg:order-1 relative" : "lg:col-span-3"} data-tour="dashboard-alerts">
              <div className={showRendimiento ? "lg:absolute lg:inset-0" : ""}>
                <SmartAlerts alerts={smartAlerts} loading={smartAlertsLoading} />
              </div>
            </div>
          )}
        </div>
      )}

      <MargenBreakdown
        grossMargin={stats.grossMargin}
        grossMarginPct={stats.grossMarginPct}
        sellerCommissions={stats.totalSellerCommissions}
        operationalExpenses={stats.operationalExpenses}
        netMargin={stats.netMargin}
        netMarginPct={stats.netMarginPct}
        loading={loading}
      />

      {/* Resumen IVA del período: mismo gate que el margen bruto (el IVA deriva del
          margen) → sin migración de permisos. Reutiliza los totales del dashboard. */}
      {hasPermission(PermissionCode.DASHBOARD_COMERCIAL_MARGEN) && (
        <IvaSummaryCard
          ivaDebito={stats.ivaDebito}
          ivaCredito={stats.ivaCredito}
          ivaNeto={stats.ivaNeto}
          filtroLabel={filtroLabel}
          loading={loading}
        />
      )}

      {/* Tabs para Resumen de Ventas y Costos */}
      {(showResumenVentas || showResumenCostos) && (
        <Card className="rounded-2xl border border-slate-200/60" data-tour="dashboard-sales-summary">
          <CardHeader className="pb-0 pt-4 px-4">
            <div className="flex items-end justify-between border-b border-slate-200/60">
              <div className="flex gap-4">
                {showResumenVentas && (
                  <button
                    onClick={() => setCommercialTab('sales')}
                    className={`pb-2.5 sm:pb-2 px-2 text-sm sm:text-[13px] font-semibold sm:font-medium transition-colors relative ${
                      commercialTab === 'sales'
                        ? 'text-primary'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {dv('Resumen de Ventas', 'Sales Summary')}
                    {commercialTab === 'sales' && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                    )}
                  </button>
                )}
                {showResumenCostos && (
                  <button
                    onClick={() => setCommercialTab('costs')}
                    className={`pb-2.5 sm:pb-2 px-2 text-sm sm:text-[13px] font-semibold sm:font-medium transition-colors relative ${
                      commercialTab === 'costs'
                        ? 'text-primary'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {dv('Resumen de Costos', 'Costs Summary')}
                    {commercialTab === 'costs' && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mb-2">
                {hasPermission(PermissionCode.DASHBOARD_COMERCIAL_MARGEN) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden lg:flex"
                    onClick={handleExportResumenAutomotora}
                    disabled={resumenAutomotoraLoading}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {resumenAutomotoraLoading
                      ? dv('Generando…', 'Generating…')
                      : dv('Resumen Automotora', 'Dealership Summary')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden lg:flex"
                  onClick={() => exportFnRef.current?.()}
                  disabled={exportDisabled}
                >
                  <Download className="h-4 w-4 mr-1" />
                  {dv('Exportar Excel', 'Export Excel')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-3 px-4">
            {commercialTab === 'sales' && showResumenVentas ? (
              <SalesSummaryTable
                clientId={
                  typeof clientId === 'string' ? parseInt(clientId, 10) : clientId
                }
                dateFilter={dateFilter}
                onExportReady={(fn, disabled) => { exportFnRef.current = fn; setExportDisabled(disabled); }}
                viewMode="table"
              />
            ) : showResumenCostos ? (
              <CostsSummaryTable
                clientId={
                  typeof clientId === 'string' ? parseInt(clientId, 10) : clientId
                }
                dateFilter={dateFilter}
                onExportReady={(fn, disabled) => { exportFnRef.current = fn; setExportDisabled(disabled); }}
                viewMode="table"
              />
            ) : null}
          </CardContent>
        </Card>
      )}
    </>
  );

  const SectionInventario = (
    <>
      {/* KPI Cards */}
      <KpiCarousel>
        <AdminStats
          mode='inventario'
          stats={stats}
          kpis={kpis}
          loading={loading || inventoryKpisLoading}
          ownStockCount={inventoryKpis.ownStockCount}
          ownStockValue={inventoryKpis.ownStockValue}
          consignedStockCount={inventoryKpis.consignedStockCount}
          consignedStockValue={inventoryKpis.consignedStockValue}
          publishedStockCount={inventoryKpis.publishedStockCount}
          publishedStockValue={inventoryKpis.publishedStockValue}
        />
      </KpiCarousel>

      <MissingCostsAlert soldVehicles={soldVehicles || []} />

      {inventoryKpis.vehiclesWithoutCostInStock > 0 && (
        <div className='rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:px-5 sm:py-4 flex items-start gap-3'>
          <AlertTriangle className='h-5 w-5 text-amber-600 shrink-0 mt-0.5' />
          <div className='min-w-0'>
            <p className='text-sm font-medium text-amber-900'>
              {inventoryKpis.vehiclesWithoutCostInStock}{' '}
              {inventoryKpis.vehiclesWithoutCostInStock === 1
                ? 'auto en stock sin costo cargado'
                : 'autos en stock sin costo cargado'}
            </p>
            <p className='text-xs text-amber-800 mt-0.5'>
              No suman al valor del inventario. Cargales el precio de compra o
              consignación para que el valor y los promedios sean reales.
            </p>
          </div>
        </div>
      )}

      {/* Vehículos Críticos (1/3) + Salud + Análisis por Marca (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-1 relative">
          <div className="lg:absolute lg:inset-0">
            <CriticalVehiclesCard
              mode="creation"
              preloadedVehicles={inventoryKpis.oldestVehicles}
              preloadedLoading={inventoryKpisLoading}
            />
          </div>
        </div>
        <div className="lg:col-span-2 flex flex-col gap-3">
          <InventoryHealthCard
            loading={inventoryKpisLoading}
            ownStockValue={inventoryKpis.ownStockValue}
            consignedStockValue={inventoryKpis.consignedStockValue}
            consignedStockCount={inventoryKpis.consignedStockCount}
            avgPurchasePrice={inventoryKpis.avgPurchasePrice}
            averageVehiclePrice={inventoryKpis.averageVehiclePrice}
            inventoryTurnoverRate={inventoryKpis.inventoryTurnoverRate}
            oldestVehicleDays={inventoryKpis.oldestVehicleDays}
          />
          <BrandSalesRanking
            loading={salesAnalyticsLoading}
            data={salesAnalytics?.byBrand || []}
            brandDistribution={brandDistribution}
            totalVehicles={stats.totalVehicles}
          />
        </div>
      </div>

      {/* Distribución por Estado — full width */}
      <VehiclesByStatusChart
        loading={inventoryKpisLoading}
        statusData={inventoryKpis.vehiclesByStatus}
        title={dv('Distribución por Estado', 'Distribution by Status')}
      />
    </>
  );

  const webTotalVisits = (monthlyVisits || []).reduce((s, d) => s + (d.visits || 0), 0);
  const webTotalLeads = (monthlyVisits || []).reduce((s, d) => s + (d.leads || 0), 0);
  const webConversionRate = webTotalVisits > 0 ? ((webTotalLeads / webTotalVisits) * 100).toFixed(1) : '0.0';

  const SectionWeb = (
    <>
      {/* KPIs + Website URL — tighter spacing */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: dv('Visitas', 'Visits'), value: webTotalVisits.toLocaleString('es-CL'), icon: <Eye className="h-5 w-5" /> },
            { label: 'Leads', value: webTotalLeads.toLocaleString('es-CL'), icon: <Users className="h-5 w-5" /> },
            { label: dv('Conversión', 'Conversion'), value: `${webConversionRate}%`, icon: <Target className="h-5 w-5" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden">
              <div className="hidden sm:flex items-start justify-between py-3 px-3 md:py-4 md:px-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-lg md:text-xl tracking-tight text-slate-900 tabular-nums">
                    {loading ? <span className="inline-block w-20 h-7 bg-slate-100 animate-pulse rounded-lg" /> : value}
                  </h4>
                  <p className="text-[13px] text-slate-500 mt-0.5">{label}</p>
                </div>
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-600">
                  {icon}
                </div>
              </div>
              <div className="sm:hidden p-5 pb-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-slate-500 font-medium">{label}</p>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-600">
                    {icon}
                  </div>
                </div>
                <h4 className="text-[28px] font-bold tracking-tight text-slate-900 leading-none tabular-nums">
                  {loading ? <span className="inline-block w-28 h-8 bg-slate-100 animate-pulse rounded-lg" /> : value}
                </h4>
              </div>
            </div>
          ))}
        </div>
        <WebsiteCard />

        {/* Chart + Top Vehicles side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-1 relative lg:order-1">
          <div className="lg:absolute lg:inset-0">
            <TopVehiclesCard topVehicles={topVehicles || []} loading={loading} compact />
          </div>
        </div>
        <div className="lg:col-span-2 lg:order-2">
          <WebVisitsSection
            globalDateFilter={dateFilter}
            globalData={monthlyVisits || []}
            globalLoading={loading}
          />
        </div>
        </div>
      </div>

      {/* Tabla de últimos leads */}
      <LatestLeadsTable leads={latestLeads} loading={leadsLoading} />
    </>
  );

  const SectionFinance = (
    <>
      {/* 4 KPIs de finanzas */}
      <KpiCarousel>
        <AdminStats
          mode='finance'
          stats={stats}
          totals={totals}
          loading={loading}
          totalNetProfit={totalNetProfit}
          netProfitLoading={netProfitLoading}
        />
      </KpiCarousel>

      {/* Métricas financieras clave y desglose de gastos */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
        <FinancialMetricsCard
          totalSales={totals.sales}
          totalExpenses={totals.expenses}
          totalNetProfit={totalNetProfit}
          vehiclesSoldCount={totals.vehiclesSoldCount}
          loading={loading || netProfitLoading}
        />
        <ExpensesBreakdownCard
          monthlyData={monthlyData || []}
          loading={loading}
        />
      </div>

      {/* Gráficos de análisis financiero */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
        {/* Gráfico de ventas en el tiempo */}
        <AdminSalesChart
          loading={loading}
          monthlyData={monthlyData || []}
          columnLayout
          filtroLabel={`${dv(
            'Ventas en el tiempo',
            'Sales over time'
          )} (${filtroLabel})`}
        />
        {/* Gráfico de ganancia/pérdida mensual */}
        <ProfitMarginChart
          loading={loading}
          monthlyData={monthlyData || []}
          filtroLabel={`${dv(
            'Ganancia/Pérdida Mensual',
            'Monthly Profit/Loss'
          )} (${filtroLabel})`}
          netProfitData={netProfitByPeriodData}
        />
      </div>

      {/* Gráfico de gastos desglosados */}
      <AdminExpensesChart
        loading={loading}
        monthlyData={monthlyData || []}
        filtroLabel={`${dv(
          'Gastos Desglosados',
          'Expenses Breakdown'
        )} (${filtroLabel})`}
      />

      {/* Gráfico de rendimiento del negocio (combinado) */}
      <BusinessPerformanceChart
        loading={loading}
        data={performanceWithInventory}

        title={dv('Flujo de Caja', 'Cash Flow')}
        subtitle={`(${filtroLabel})`}
      />
    </>
  );

  const displaySellersStats = sellersStats;
  const displaySellersLoading = sellersLoading;

  const SectionVendedores = (
    <>
      {/* Ranking de vendedores */}
      <SellersLeaderboard sellersStats={displaySellersStats} loading={displaySellersLoading} />

      {/* Gráficos de ventas y comisiones */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
        <SellersSalesChart sellersStats={displaySellersStats} loading={displaySellersLoading} />
        <SellersCommissionsChart sellersStats={displaySellersStats} loading={displaySellersLoading} />
      </div>

      {/* Tabla de ventas por vendedor */}
      <SellersSalesTable sellersStats={displaySellersStats} loading={displaySellersLoading} />

      {/* Tabla de vehículos asignados */}
      <SellersVehiclesTable sellersStats={displaySellersStats} loading={displaySellersLoading} />
    </>
  );

  // Componente de filtros reutilizable
  const Filters = (
    <div className='flex items-center gap-2'>
      {/* Filtro de tipo de stock - Dropdown en < 2xl, pills en 2xl+ */}
      <div className='2xl:hidden'>
        <Select value={consignmentFilter} onValueChange={(v) => setConsignmentFilter(v as ConsignmentFilter)}>
          <SelectTrigger className='w-[170px] rounded-xl h-8 text-[12px] border-slate-200/60 text-slate-500 [&>svg]:text-slate-400'>
            <span className='text-[13px] font-medium'>
              {consignmentOptions.find(o => o.key === consignmentFilter)?.label}
            </span>
          </SelectTrigger>
          <SelectContent>
            {consignmentOptions.map(({ key, label }) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className='hidden 2xl:flex items-center bg-slate-100 rounded-xl p-0.5 h-9'>
        {consignmentOptions.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setConsignmentFilter(key)}
            className={`px-3 py-1.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all ${
              consignmentFilter === key
                ? 'bg-white text-slate-900 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.08)]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {sellerOptions.length > 0 && (
        <MultiSelect
          options={sellerOptions}
          value={selectedSellerIds}
          onValueChange={setSelectedSellerIds}
          placeholder={dv('Todos los vendedores', 'All sellers')}
          triggerClassName='h-8 text-[12px] rounded-xl border-slate-200/60 text-slate-500'
        />
      )}
      {timeFilter === 'custom' ? (
        <>
          <DateRangePicker
            value={dateRange}
            onChange={(value) => setDateRange(value)}
            placeholder={dv('Seleccionar rango', 'Select range')}
            character=' → '
            format='dd/MM/yyyy'
            className='w-full sm:w-auto [&_.rs-picker-toggle]:!rounded-xl [&_.rs-picker-toggle]:!border-slate-200/60 [&_.rs-btn-primary]:!bg-sky-500 [&_.rs-btn-primary:hover]:!bg-sky-600 [&_.rs-calendar-table-cell-selected_.rs-calendar-table-cell-content]:!bg-sky-500 [&_.rs-calendar-table-cell-in-range]:!bg-sky-50 [&_.rs-picker-toolbar-ranges_.rs-btn-link]:!text-sky-500 [&_.rs-calendar-table-cell-is-today_.rs-calendar-table-cell-content]:!border-sky-500 [&_.rs-picker-toggle-active]:!border-sky-500 [&_.rs-picker-toggle-active]:!shadow-[0_0_0_3px_rgba(56,189,248,0.15)]'
            size='lg'
            cleanable
            showOneCalendar
            shouldDisableDate={(date) => {
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              return date > today;
            }}
            ranges={[
              {
                label: dv('Hoy', 'Today'),
                value: [new Date(), new Date()],
              },
              {
                label: dv('1 semana', '1 week'),
                value: [
                  new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
                  new Date(),
                ],
              },
              {
                label: dv('Este mes', 'This month'),
                value: [
                  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  new Date(),
                ],
              },
              {
                label: dv('Este año', 'This year'),
                value: [
                  new Date(new Date().getFullYear(), 0, 1),
                  new Date(),
                ],
              },
            ]}
            locale={{
              sunday: 'Do',
              monday: 'Lu',
              tuesday: 'Ma',
              wednesday: 'Mi',
              thursday: 'Ju',
              friday: 'Vi',
              saturday: 'Sa',
              ok: dv('Aplicar', 'Apply'),
              today: dv('Hoy', 'Today'),
              yesterday: dv('Ayer', 'Yesterday'),
              last7Days: dv('1 semana', '1 week'),
            }}
          />
          <button
            onClick={() => {
              setTimeFilter('all');
              setDateRange(null);
            }}
            className='px-3 py-2 text-[13px] text-slate-500 hover:text-slate-700 transition-colors shrink-0 h-9'
          >
            {dv('Cambiar', 'Change')}
          </button>
        </>
      ) : (
        <Select
          value={timeFilter}
          onValueChange={(v) => {
            setTimeFilter(v as TimeKey);
            if (v !== 'custom') setDateRange(null);
          }}
        >
          <SelectTrigger className='w-[135px] rounded-xl h-8 text-[12px] border-slate-200/60 text-slate-500 [&>svg]:text-slate-400'>
            <div className='flex items-center justify-center sm:justify-start gap-2'>
              <Calendar className='h-3.5 w-3.5 text-slate-400' />
              <span className='text-[12px] font-medium'>{timeLabel}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>
              {dv('Todo', 'All')}
            </SelectItem>
            <SelectItem value='year'>
              {dv('Este año', 'This year')}
            </SelectItem>
            <SelectItem value='month'>
              {dv('Este mes', 'This month')}
            </SelectItem>
            <SelectItem value='last7'>
              {dv('1 semana', '1 week')}
            </SelectItem>
            <SelectItem value='custom'>
              {dv('Personalizado', 'Custom')}
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );

  /* Mobile-only filters — compact dropdowns, single row */
  const MobileFilters = (
    <div className='flex flex-col gap-2'>
      <div className='flex items-center gap-2'>
        {/* Time period dropdown */}
        <Select
          value={timeFilter}
          onValueChange={(v) => setTimeFilter(v as TimeKey)}
        >
          <SelectTrigger className='flex-1 h-9 rounded-xl text-[13px] bg-white border-slate-200/60 text-slate-500 [&>svg]:text-slate-400'>
            <div className='flex items-center gap-2'>
              <Calendar className='h-3.5 w-3.5 text-slate-400 shrink-0' />
              <span className='font-medium truncate'>{timeLabel}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>{dv('Todo', 'All')}</SelectItem>
            <SelectItem value='year'>{dv('Este año', 'This year')}</SelectItem>
            <SelectItem value='month'>{dv('Este mes', 'This month')}</SelectItem>
            <SelectItem value='last7'>{dv('1 semana', '1 week')}</SelectItem>
            <SelectItem value='custom'>{dv('Personalizado', 'Custom')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Consignment dropdown */}
        <Select value={consignmentFilter} onValueChange={(v) => setConsignmentFilter(v as ConsignmentFilter)}>
          <SelectTrigger className='w-auto h-9 rounded-xl text-[13px] bg-white border-slate-200/60 px-3 text-slate-500 [&>svg]:text-slate-400'>
            <span className='font-medium'>
              {consignmentOptions.find(o => o.key === consignmentFilter)?.label}
            </span>
          </SelectTrigger>
          <SelectContent>
            {consignmentOptions.map(({ key, label }) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {timeFilter === 'custom' && (
        <DateRangePicker
          value={dateRange}
          onChange={(value) => setDateRange(value)}
          placeholder={dv('Seleccionar rango', 'Select range')}
          character=' → '
          format='dd/MM/yyyy'
          className='w-full [&_.rs-picker-toggle]:!rounded-xl [&_.rs-picker-toggle]:!border-slate-200/60 [&_.rs-btn-primary]:!bg-sky-500 [&_.rs-btn-primary:hover]:!bg-sky-600 [&_.rs-calendar-table-cell-selected_.rs-calendar-table-cell-content]:!bg-sky-500 [&_.rs-calendar-table-cell-in-range]:!bg-sky-50 [&_.rs-picker-toolbar-ranges_.rs-btn-link]:!text-sky-500 [&_.rs-calendar-table-cell-is-today_.rs-calendar-table-cell-content]:!border-sky-500 [&_.rs-picker-toggle-active]:!border-sky-500 [&_.rs-picker-toggle-active]:!shadow-[0_0_0_3px_rgba(56,189,248,0.15)]'
          size='sm'
          cleanable
          showOneCalendar
          shouldDisableDate={(date) => {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            return date > today;
          }}
          ranges={[
            {
              label: dv('Hoy', 'Today'),
              value: [new Date(), new Date()],
            },
            {
              label: dv('1 semana', '1 week'),
              value: [
                new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
                new Date(),
              ],
            },
            {
              label: dv('Este mes', 'This month'),
              value: [
                new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                new Date(),
              ],
            },
          ]}
          locale={{
            sunday: 'Do',
            monday: 'Lu',
            tuesday: 'Ma',
            wednesday: 'Mi',
            thursday: 'Ju',
            friday: 'Vi',
            saturday: 'Sa',
            ok: dv('Aplicar', 'Apply'),
            today: dv('Hoy', 'Today'),
            yesterday: dv('Ayer', 'Yesterday'),
            last7Days: dv('1 semana', '1 week'),
          }}
        />
      )}
    </div>
  );

  return (
    <div className='px-4 pt-2 pb-4 sm:px-4 sm:pt-2 sm:pb-4 md:px-6 md:pt-3 md:pb-6 space-y-4'>
      {/* HEADER - Título */}
      <div className='flex flex-col gap-2.5 sm:gap-3 pb-3 border-b border-slate-200/60' data-tour="dashboard-header">
        {/* Implementation progress banner — below title, before pills */}
        <ImplementationBanner />

        {/* Mobile tabs — segmented control */}
        <div className='md:hidden' data-tour="dashboard-pills">
          {MobilePills}
        </div>

        {/* Tablet pills */}
        <div className='hidden md:block lg:hidden' data-tour="dashboard-pills">
          {Pills}
        </div>

        {/* Móvil: pills inline */}
        <div className='sm:hidden' data-tour="dashboard-filters">
          {MobileFilters}
        </div>

        {/* Tablet: dropdowns existentes */}
        <div className='hidden sm:block lg:hidden' data-tour="dashboard-filters">
          {Filters}
        </div>

        {/* Pills + Filtros en la misma línea - Solo en lg+ */}
        <div className='hidden lg:flex lg:items-center lg:justify-between'>
          <div data-tour="dashboard-pills">{Pills}</div>
          <div data-tour="dashboard-filters-desktop">{Filters}</div>
        </div>
      </div>

      {/* Contenido por pestaña */}
      <div className='space-y-4' data-tour="dashboard-content">
        {view === 'comercial' && SectionVentas}
        {view === 'inventario' && SectionInventario}
        {view === 'web' && SectionWeb}
        {view === 'finance' && SectionFinance}
        {view === 'vendedores' && SectionVendedores}
      </div>

    </div>
  );
}
