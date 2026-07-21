import DashboardLayout from '@/components/DashboardLayout';
import VehiculosTable from '@/components/VehiculosTable';
import VehiculosViewToggle from '@/components/VehiculosViewToggle';
import { Button } from '@/components/ui/button';
import VehiculosBoardView from '@/components/vehiculos/VehiculosBoardView';
import VehiculosMobileCards from '@/components/vehiculos/VehiculosMobileCards';
import VehiculosFilter, {
  VehiculosFilters,
} from '@/components/vehiculos/VehiculosFilter';
import VehicleStatusCards from '@/components/vehiculos/VehicleStatusCards';
import TableColumnSelector from '@/components/vehiculos/TableColumnSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/hooks/useNavigation';
import { useVehicles } from '@/hooks/useVehicles';
import { useVehiclesPaginated } from '@/hooks/useVehiclesPaginated';
import { useActiveDealership } from '@/hooks/useActiveDealership';
import { useStatuses } from '@/hooks/useStatuses';
import { useVehiclesTableStore } from '@/stores/vehiclesTableStore';
import { useVehiclesListStateStore } from '@/stores/vehiclesListStateStore';
import { Vehicle } from '@/types/vehicle';
import { Plus, Loader2, List, Table2, Download, Upload, Settings, MoreVertical, Workflow, Shield, ClipboardCheck, LayoutGrid, FileText, AlertTriangle, X } from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import VehicleImportDrawer from '@/components/vehiculos/VehicleImportDrawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VehicleStatesConfig } from '@/components/configuration/vehicle-states/VehicleStatesConfig';
import { VehiclesPageConfig } from '@/components/configuration/vehicle-states/VehiclesPageConfig';
import { VehicleDocsConfig } from '@/components/configuration/vehicle-states/VehicleDocsConfig';
import ChecklistItemsConfig from '@/components/settings/ChecklistItemsConfig';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/hooks/useI18n';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { exportVehiclesToExcel, exportVehiclesFullDetailToExcel } from '@/utils/excelExport';
import { useTranslation } from 'react-i18next';
import posthog from '@/utils/posthog';

const Vehiculos = () => {
  const { clientId, userRole, user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigation();
  const { tCommon } = useI18n();
  const { t: tVehiculos } = useTranslation('vehiculos');

  // Status cards
  const { statuses, isLoading: statusesLoading } = useStatuses();

  // Sede (sucursal) activa. La restricción real vive en los hooks de datos; acá
  // solo necesitamos una "firma" estable de las sedes visibles para re-disparar
  // el fetch cuando cambia la sede del TopBar o cuando terminan de cargar las
  // sedes asignadas del usuario (los fetch effects cachean por key).
  const { visibleDealershipIds } = useActiveDealership();
  const dealershipFilterKey = useMemo(
    () => (visibleDealershipIds ? visibleDealershipIds.join(',') : 'all'),
    [visibleDealershipIds]
  );

  // Persisted list state (sessionStorage). Survives navigation within the
  // session — drilling into a vehicle and coming back lands on the same page,
  // filters, search, sort, view, and active status card.
  const persistedView = useVehiclesListStateStore((s) => s.view);
  const setPersistedView = useVehiclesListStateStore((s) => s.setView);
  const persistedFilters = useVehiclesListStateStore((s) => s.filters);
  const setPersistedFilters = useVehiclesListStateStore((s) => s.setFilters);
  const persistedSortField = useVehiclesListStateStore((s) => s.sortField);
  const persistedSortDirection = useVehiclesListStateStore((s) => s.sortDirection);
  const setPersistedSort = useVehiclesListStateStore((s) => s.setSort);
  const persistedCurrentPage = useVehiclesListStateStore((s) => s.currentPage);
  const setPersistedCurrentPage = useVehiclesListStateStore((s) => s.setCurrentPage);
  const persistedActiveStatusId = useVehiclesListStateStore((s) => s.activeStatusId);
  const setPersistedActiveStatusId = useVehiclesListStateStore((s) => s.setActiveStatusId);

  const activeStatusId = persistedActiveStatusId;
  const setActiveStatusId = setPersistedActiveStatusId;

  // For board view - use original hook
  const {
    vehicles: allVehicles,
    isLoading: allVehiclesLoading,
    fetchVehicles: fetchAllVehicles,
    refilter: refilterVehicles,
    patchVehicle: patchAllVehicle,
    deleteVehicle: deleteAllVehicle,
  } = useVehicles();

  // For table view - use paginated hook
  const {
    vehicles: paginatedVehicles,
    isLoading: paginatedLoading,
    totalCount,
    totalPages,
    currentPage,
    fetchVehicles: fetchPaginatedVehicles,
    deleteVehicle: deletePaginatedVehicle,
    setPage,
  } = useVehiclesPaginated();

  // On mount (and whenever the hook resets currentPage to its initial 1),
  // seed it with the persisted page so navigating back lands on the same page.
  // We only seed once per mount — after that, handlePageChange keeps both in sync.
  const didSeedPageRef = useRef(false);
  useEffect(() => {
    if (didSeedPageRef.current) return;
    if (persistedCurrentPage > 1) {
      setPage(persistedCurrentPage);
    }
    didSeedPageRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { selectedColumns, setSelectedColumns, defaultView } = useVehiclesTableStore();
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // On mobile, cards view always wins. On desktop, honor the persisted view,
  // falling back to the user's defaultView preference if none persisted yet.
  const view = isMobile ? 'cards' : (persistedView || defaultView);
  const setView = setPersistedView;
  const [refreshKey, setRefreshKey] = useState(false);
  const filters = persistedFilters;
  const setFilters = setPersistedFilters;
  // Read alertFilter from URL on mount (deep-link from smart alerts)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const alertFilter = params.get('alertFilter');
    if (alertFilter) {
      const brandId = params.get('brandId') || undefined;
      const brandName = params.get('brandName') ? decodeURIComponent(params.get('brandName')!) : undefined;
      setFilters({
        search: '',
        status: [],
        seller: 'all',
        consigned: 'all',
        alertFilter,
        alertFilterBrandId: brandId,
        alertFilterBrandName: brandName,
      });
      setActiveStatusId(null);
      setPage(1);
      setPersistedCurrentPage(1);
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const clearAlertFilter = useCallback(() => {
    setFilters(prev => {
      const { alertFilter, alertFilterBrandId, alertFilterBrandName, ...rest } = prev;
      return rest as VehiculosFilters;
    });
    setPage(1);
    setPersistedCurrentPage(1);
    lastTableFetchKey.current = '';
    lastBoardFetchKey.current = '';
  }, [setPage, setPersistedCurrentPage, setFilters]);

  const alertFilterBannerMessage = useMemo(() => {
    const af = filters.alertFilter;
    if (!af) return null;
    switch (af) {
      case 'unpublished': return 'Mostrando vehículos sin publicar';
      case 'no-photo': return 'Mostrando vehículos sin fotos';
      case 'old-stock': return 'Mostrando vehículos con más de 90 días en stock';
      case 'liquidate': return 'Mostrando vehículos con más de 300 días — considerar liquidar';
      case 'low-turnover': return 'Mostrando inventario ordenado por antigüedad — rotación baja';
      case 'slow-brand': return `Mostrando vehículos ${filters.alertFilterBrandName || ''} — marca lenta de vender`;
      default: return null;
    }
  }, [filters.alertFilter, filters.alertFilterBrandName]);

  const allStatuses = statuses.map((s) => String(s.id));
  const soldStatusIds = statuses
    .filter((s) => {
      const name = (s.name || '').toLowerCase();
      return name.includes('vendido') || name.includes('sold');
    })
    .map((s) => String(s.id));
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportDrawer, setShowImportDrawer] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'columns' | 'states' | 'checklist' | 'page' | 'docs'>('states');
  const sortField = persistedSortField;
  const sortDirection = persistedSortDirection;

  // Track last fetch params to avoid unnecessary re-fetches on tab switch
  const lastTableFetchKey = useRef<string>('');
  const lastBoardFetchKey = useRef<string>('');

  // allStatuses and soldStatusIds are now derived from useStatuses() above

  // Pre-set board fetch key once auto-fetch data arrives, so the first
  // switch to board view doesn't trigger an unnecessary duplicate fetch
  useEffect(() => {
    if (!allVehiclesLoading && allVehicles.length > 0 && lastBoardFetchKey.current === '') {
      const normalizedFilters = { ...filters };
      normalizedFilters.status = []; // auto-fetch loads all statuses
      lastBoardFetchKey.current = JSON.stringify(normalizedFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVehiclesLoading]);

  // Fetch paginated vehicles when filters, sorting, or page changes
  useEffect(() => {
    if (view === 'table' && clientId) {
      const key = JSON.stringify({ currentPage, sortField, sortDirection, filters, dealershipFilterKey });
      if (key === lastTableFetchKey.current) return;
      lastTableFetchKey.current = key;
      fetchPaginatedVehicles({
        page: currentPage,
        pageSize: 10,
        sortField,
        sortDirection,
        filters,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, clientId, currentPage, sortField, sortDirection, filters, dealershipFilterKey]);

  // Fetch all vehicles for board view
  // Only re-fetch when server-side filters change (not search, which is client-side).
  // `allStatuses.length` is intentionally in the deps so the normalization
  // re-runs once the statuses list finishes loading — otherwise the first
  // render could cache a non-normalized key and trigger a duplicate fetch.
  useEffect(() => {
    if ((view === 'board' || view === 'cards') && clientId) {
      // Normalize key: exclude search (client-side only) to avoid unnecessary fetches
      const normalizedFilters = { ...filters, search: '' };
      if (
        normalizedFilters.status.length === 0 ||
        (allStatuses.length > 0 &&
          normalizedFilters.status.length === allStatuses.length)
      ) {
        normalizedFilters.status = [];
      }
      const key = JSON.stringify({ ...normalizedFilters, dealershipFilterKey });
      if (key === lastBoardFetchKey.current) return;
      lastBoardFetchKey.current = key;
      fetchAllVehicles(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, clientId, filters.status, filters.seller, filters.consigned, filters.stockType, filters.dealershipId, allStatuses.length, dealershipFilterKey]);

  // Re-filter board view client-side when only search changes (no re-fetch needed)
  useEffect(() => {
    if ((view === 'board' || view === 'cards') && filters.search !== undefined) {
      refilterVehicles(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  // Handle status card click — update filters accordingly
  const handleStatusCardClick = useCallback(
    (statusId: number | null) => {
      setActiveStatusId(statusId);
      if (statusId === null) {
        // "Todos" — empty array means no filter, shows all vehicles
        setFilters((prev) => ({ ...prev, status: [] }));
      } else {
        // Filter to single status
        setFilters((prev) => ({ ...prev, status: [String(statusId)] }));
      }
      // Reset to page 1
      if (view === 'table') {
        setPage(1);
        setPersistedCurrentPage(1);
      }
    },
    [allStatuses, view, setPage, setPersistedCurrentPage, setFilters, setActiveStatusId]
  );

  // After a drag-drop status change is confirmed in the DB, patch the in-memory
  // board cache (status_id + the nested status object for color/name) so that
  // clearing the search box (which re-derives the list client-side) doesn't
  // revert the card to its old column.
  const handleStatusPersisted = useCallback(
    (vehicleId: number, statusId: number) => {
      const status = statuses.find((s) => s.id === statusId);
      patchAllVehicle(vehicleId, {
        status_id: statusId,
        status: status
          ? { name: status.name, color: status.color, order: status.order }
          : undefined,
        state_updated_at: new Date().toISOString(),
      } as Partial<Vehicle>);
    },
    [statuses, patchAllVehicle]
  );

  const handleRefresh = () => {
    setRefreshKey(!refreshKey);
    // Invalidate cache so the fetch runs
    lastTableFetchKey.current = '';
    lastBoardFetchKey.current = '';
    if (view === 'table') {
      fetchPaginatedVehicles({
        page: currentPage,
        pageSize: 10,
        sortField,
        sortDirection,
        filters,
      });
    } else {
      fetchAllVehicles(filters);
    }
  };

  const handleFilterChange = useCallback(
    (newFilters: VehiculosFilters) => {
      setFilters(newFilters);
      // Clear active status card when filters change manually
      setActiveStatusId(null);
      // Reset to first page when filters change
      if (view === 'table') {
        setPage(1);
        setPersistedCurrentPage(1);
      }

      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'vehicle_list_filtered',
        properties: {
          status_filter_count: newFilters.status.length,
          seller_filter: newFilters.seller,
          has_search: newFilters.search.length > 0,
          consigned_filter: newFilters.consigned,
        },
      });
    },
    [view, setPage, setPersistedCurrentPage, setFilters, setActiveStatusId, user]
  );

  const handleSortChange = useCallback(
    (field: string, direction: 'asc' | 'desc') => {
      setPersistedSort(field, direction);
      // Reset to first page when sorting changes
      setPage(1);
      setPersistedCurrentPage(1);
    },
    [setPage, setPersistedSort, setPersistedCurrentPage]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setPage(page);
      setPersistedCurrentPage(page);
    },
    [setPage, setPersistedCurrentPage]
  );

  // Handle view change and reset filters for board view
  const handleViewChange = useCallback(
    (newView: 'table' | 'board' | 'cards') => {
      setView(newView);

      if ((newView === 'board' || newView === 'cards') && allStatuses.length > 0) {
        // Only reset status to "all" if user had actively filtered to specific statuses
        // status:[] means "all" implicitly, status:allStatuses means "all" explicitly
        const isEffectivelyAll =
          filters.status.length === 0 ||
          (filters.status.length === allStatuses.length &&
            allStatuses.every((s) => filters.status.includes(s)));

        if (!isEffectivelyAll) {
          setFilters((prev) => ({ ...prev, status: [] }));
        }
      } else if (newView === 'table') {
        // Reset to first page when switching to table view
        setPage(1);
        setPersistedCurrentPage(1);
      }
    },
    [allStatuses, filters, setPage, setPersistedCurrentPage, setView, setFilters]
  );

  const handleDeleteVehicle = async (id: number) => {
    if (view === 'table') {
      await deletePaginatedVehicle(id);
    } else {
      await deleteAllVehicle(id);
      // Refresh board view after deletion
      fetchAllVehicles();
    }

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'vehicle_deleted',
      properties: {
        vehicle_id: id,
      },
    });
  };

  const handleEditVehicle = (id: number) => {
    navigate(`/vehiculos/editar/${id}`);
  };

  const handleViewVehicle = (id: number) => {
    navigate(`/vehiculos/${id}`);
  };

  const handleExportToExcel = async (mode: 'all' | 'selected') => {
    setShowExportModal(false);
    try {
      setIsExporting(true);

      const { data: allVehiclesData, error } = await supabase
        .from('vehicles')
        .select(
          `
          *,
          category:category_id(name),
          status:status_id(name, color, order),
          brand:brand_id(name),
          model:model_id(name),
          color:color_id(name),
          condition:condition_id(name),
          fuel_type:fuel_type_id(name),
          seller:seller_id(id, first_name, last_name)
        `
        )
        .eq('client_id', clientId);

      if (error) {
        setIsExporting(false);
        return;
      }

      await exportVehiclesToExcel({
        vehicles: allVehiclesData || [],
        selectedColumns: mode === 'selected' ? selectedColumns : [],
        exportMode: mode,
        filename: 'todos-los-vehiculos',
        userRole,
        isAdminOrSuperadmin: hasPermission(PermissionCode.SALES_VIEW),
      });

      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'vehicle_list_exported',
        properties: {
          export_mode: mode,
          vehicle_count: allVehiclesData?.length || 0,
        },
      });
    } catch (error) {
      // Error en exportación a Excel
    } finally {
      setIsExporting(false);
    }
  };

  // Export "con TODO": detalle línea por línea (libro mayor). Trae TODOS los autos
  // del cliente (cualquier estado) y cada gasto/ingreso/pago/cuota/comisión como una fila.
  const handleExportFullDetail = async () => {
    setShowExportModal(false);
    try {
      setIsExporting(true);
      const { data: allVehiclesData, error } = await supabase
        .from('vehicles')
        .select('*, brand:brand_id(name), model:model_id(name), status:status_id(name)')
        .eq('client_id', clientId);
      if (error) {
        setIsExporting(false);
        return;
      }
      await exportVehiclesFullDetailToExcel({
        vehicles: allVehiclesData || [],
        filename: 'detalle-completo-por-linea',
        isAdminOrSuperadmin: hasPermission(PermissionCode.SALES_VIEW),
      });
      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'vehicle_full_detail_exported',
        properties: { vehicle_count: allVehiclesData?.length || 0 },
      });
    } catch (error) {
      // Error en exportación detallada
    } finally {
      setIsExporting(false);
    }
  };

  // Both views stay mounted to avoid remounting (which causes useStatuses
  // and other hooks to re-fetch and flash the loader on every tab switch).
  // We toggle visibility with CSS instead.
  const refreshTable = useCallback(
    () =>
      fetchPaginatedVehicles({
        page: currentPage,
        pageSize: 10,
        sortField,
        sortDirection,
        filters,
      }),
    [currentPage, sortField, sortDirection, filters, fetchPaginatedVehicles]
  );

  return (
    <DashboardLayout>
      <main className="flex flex-col h-full bg-[#f5f5f7]">
        {/* Sticky Header — frosted glass */}
        <div className="sticky top-0 z-10 bg-[#f5f5f7] border-b border-slate-200/60 overflow-x-hidden">
          <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-2 sm:pb-3 space-y-2 sm:space-y-3">

            {/* Status Cards */}
            <div data-tour="status-cards" className="overflow-visible">
              <VehicleStatusCards
                statuses={statuses}
                vehicles={allVehicles}
                activeStatusId={activeStatusId}
                onStatusClick={handleStatusCardClick}
                loading={statusesLoading || allVehiclesLoading}
              />
            </div>

            {/* Filters + action buttons — single row */}
            <div className="flex items-center gap-2">
              {/* Filters inline (search → filter popover → status) */}
              <div data-tour="filters" className="flex-1 min-w-0">
                <VehiculosFilter
                  onFilterChange={handleFilterChange}
                  filters={filters}
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div data-tour="view-toggle" className="hidden md:block">
                  <VehiculosViewToggle
                    view={view}
                    onViewChange={handleViewChange}
                  />
                </div>

                {/* Settings button — hidden on mobile */}
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="hidden md:flex h-9 w-9 rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                  title="Ajustes de inventario"
                >
                  <Settings className="h-4 w-4" />
                </button>

                {/* Actions popover (import + export) — hidden on mobile */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="hidden md:flex h-9 w-9 rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                      title="Acciones"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-48 p-1.5">
                    <button
                      onClick={() => setShowImportDrawer(true)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50 transition-colors"
                      data-tour="import-excel"
                    >
                      <Download className="h-4 w-4 text-slate-400" />
                      Importar
                    </button>
                    <button
                      onClick={() => setShowExportModal(true)}
                      disabled={isExporting}
                      className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      data-tour="export-excel"
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 text-slate-400" />
                      )}
                      Exportar
                    </button>
                  </PopoverContent>
                </Popover>

                {/* Column selector dialog (controlado). Siempre montado para que
                    "Configurar columnas" abra desde cualquier vista (antes sólo
                    funcionaba en vista tabla → no abría en cards/board ni móvil). */}
                <TableColumnSelector
                  selectedColumns={selectedColumns}
                  onColumnsChange={setSelectedColumns}
                  open={showColumnSelector}
                  onOpenChange={setShowColumnSelector}
                />

                <Button
                  className="rounded-xl h-9 text-[13px] font-medium flex items-center gap-2 px-3 bg-sky-400 hover:bg-sky-500 text-white border-0 shadow-none"
                  onClick={() => navigate('/vehiculos/agregar')}
                  data-tour="add-vehicle"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden md:inline">{tVehiculos('addVehicleButton')}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Alert filter banner */}
        {alertFilterBannerMessage && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mt-3 flex items-center gap-3 rounded-xl border px-4 py-2.5 bg-amber-50 border-amber-200/80 text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">{alertFilterBannerMessage}</span>
            <button
              onClick={clearAlertFilter}
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar filtro
            </button>
          </div>
        )}

        {/* Scrollable Content — both views stay mounted, toggle with CSS */}
        <div className="flex-1 overflow-hidden relative z-0" data-tour="vehicles-content">
          {clientId ? (
            <>
              <div className={view === 'table' ? 'h-full' : 'hidden'}>
                <VehiculosTable
                  key={`table-${String(refreshKey)}`}
                  vehicles={paginatedVehicles}
                  isLoading={paginatedLoading}
                  onDelete={handleDeleteVehicle}
                  onEdit={handleEditVehicle}
                  onView={handleViewVehicle}
                  selectedColumns={selectedColumns}
                  totalCount={totalCount}
                  totalPages={totalPages}
                  currentPage={currentPage}
                  pageSize={10}
                  onPageChange={handlePageChange}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                  onRefresh={refreshTable}
                />
              </div>
              <div className={view === 'board' ? 'h-full' : 'hidden'}>
                <VehiculosBoardView
                  key={`board-${String(refreshKey)}`}
                  vehicles={allVehicles}
                  isLoading={allVehiclesLoading}
                  onDelete={handleDeleteVehicle}
                  onEdit={handleEditVehicle}
                  onView={handleViewVehicle}
                  onRefresh={() => fetchAllVehicles(filters)}
                  onStatusPersisted={handleStatusPersisted}
                />
              </div>
              <div className={view === 'cards' ? 'h-full' : 'hidden'}>
                <VehiculosMobileCards
                  vehicles={allVehicles}
                  isLoading={allVehiclesLoading}
                  onView={handleViewVehicle}
                  onEdit={handleEditVehicle}
                  onDelete={handleDeleteVehicle}
                  onRefresh={() => fetchAllVehicles(filters)}
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-slate-200/60 p-8 text-center m-6 bg-white">
              <p className="text-slate-500">
                {tVehiculos('loadingClient')}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Import drawer */}
      <VehicleImportDrawer
        open={showImportDrawer}
        onOpenChange={setShowImportDrawer}
        onImportComplete={handleRefresh}
      />

      {/* Inventory settings modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-full sm:max-w-4xl w-[95%] max-h-[90vh] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-200/60">
            <DialogHeader>
              <DialogTitle className="text-[15px] font-semibold text-slate-900 flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-400" />
                Ajustes de inventario
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-1">
                Configura estados, checklist, columnas y más
              </p>
            </DialogHeader>

            {/* Pill tabs */}
            <div className="flex flex-nowrap gap-1.5 mt-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {([
                { value: 'states' as const, label: 'Estados', Icon: Workflow },
                { value: 'checklist' as const, label: 'Checklist', Icon: ClipboardCheck },
                { value: 'columns' as const, label: 'Columnas', Icon: LayoutGrid },
                { value: 'page' as const, label: 'Página', Icon: FileText },
                { value: 'docs' as const, label: 'Documentación', Icon: Shield },
              ]).map((tab) => {
                const isActive = settingsTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setSettingsTab(tab.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                        : 'hover:bg-slate-200/60 text-slate-600'
                    }`}
                  >
                    <tab.Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-6 py-5" style={{ maxHeight: 'calc(90vh - 160px)' }}>
            {settingsTab === 'states' && <VehicleStatesConfig />}
            {settingsTab === 'checklist' && <ChecklistItemsConfig />}
            {settingsTab === 'columns' && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <LayoutGrid className="h-10 w-10 text-slate-300 mb-4" />
                <h3 className="text-sm font-semibold text-slate-800">Columnas de la tabla</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Elige qué columnas son visibles en la vista de tabla de inventario
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 text-[13px]"
                  onClick={() => {
                    setShowSettings(false);
                    setTimeout(() => setShowColumnSelector(true), 300);
                  }}
                >
                  <Settings className="h-3.5 w-3.5 mr-2" />
                  Configurar columnas
                </Button>
              </div>
            )}
            {settingsTab === 'page' && <VehiclesPageConfig />}
            {settingsTab === 'docs' && <VehicleDocsConfig />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Exportar a Excel</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-1">
            <button
              onClick={() => handleExportToExcel('all')}
              className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 shrink-0">
                <Table2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">Exportar con toda la información</p>
                <p className="text-[12px] text-slate-500 mt-0.5">Incluye todas las columnas disponibles</p>
              </div>
            </button>
            <button
              onClick={() => handleExportToExcel('selected')}
              className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 shrink-0">
                <List className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-800">Seleccionar campos de exportación</p>
                <p className="text-[12px] text-slate-500 mt-0.5">Solo exporta las columnas visibles en la tabla</p>
              </div>
            </button>
            {hasPermission(PermissionCode.SALES_VIEW) && (
              <button
                onClick={handleExportFullDetail}
                className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all text-left"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 shrink-0">
                  <FileText className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">Detalle línea por línea (auditoría)</p>
                  <p className="text-[12px] text-slate-500 mt-0.5">Cada gasto, ingreso, pago, cuota y comisión como una fila</p>
                </div>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Vehiculos;
