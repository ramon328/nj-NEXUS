import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronRight, Edit2, Download, Car, ShoppingCart, Users, Layers } from 'lucide-react';
import { useCostsSummary, CostCategory } from '@/hooks/admin/useCostsSummary';
import { useTransactionCategories } from '@/hooks/useTransactionCategories';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { DateFilter } from '@/hooks/admin/useSellerPerformance';
import { useLocation } from 'wouter';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { exportCostsSummaryToExcel } from '@/utils/excelExport';
import VehiclesPagination from '@/components/vehiculos/VehiclesPagination';
import { CostsSummaryCards } from './CostsSummaryCards';

const PAGE_SIZE_TABLE = 15;
const PAGE_SIZE_CARDS = 12;

interface CostsSummaryTableProps {
  clientId: number;
  dateFilter?: DateFilter;
  onExportReady?: (exportFn: (() => void) | null, disabled: boolean) => void;
  viewMode?: 'table' | 'cards';
}

type FilterType = 'all' | 'acquisitions' | 'commissions' | 'by_category';

export const CostsSummaryTable: React.FC<CostsSummaryTableProps> = ({
  clientId,
  dateFilter,
  onExportReady,
  viewMode = 'table',
}) => {
  const { i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const [, navigate] = useLocation();

  const { costs, categorizedCosts, loading, refetch } = useCostsSummary(
    clientId,
    dateFilter
  );

  const { categories: expenseCategories } = useTransactionCategories('expense');
  const { categories: incomeCategories } = useTransactionCategories('income');

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const pageSize = viewMode === 'cards' ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE;

  // Obtener lista única de vehículos de los costos
  const uniqueVehicles = useMemo(() => {
    const vehiclesMap = new Map<number, { id: number; info: string }>();
    costs.forEach((cost) => {
      if (cost.vehicleId && !vehiclesMap.has(cost.vehicleId)) {
        vehiclesMap.set(cost.vehicleId, {
          id: cost.vehicleId,
          info: cost.vehicleInfo,
        });
      }
    });
    return Array.from(vehiclesMap.values()).sort((a, b) =>
      a.info.localeCompare(b.info)
    );
  }, [costs]);

  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleVehicleClick = (vehicleId: number | null) => {
    if (vehicleId) {
      navigate(`/vehiculos/${vehicleId}`);
    }
  };

  const toggleCategory = (categoryKey: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryKey)) {
      newExpanded.delete(categoryKey);
    } else {
      newExpanded.add(categoryKey);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryChange = async (itemId: number, itemType: string, newCategoryId: string) => {
    try {
      // Solo permitir cambiar categoría a items de tipo 'expense' o 'income'
      if (itemType !== 'expense') {
        toast.error(dv('Solo se puede cambiar la categoría de gastos', 'Can only change category for expenses'));
        return;
      }

      const categoryIdToSave = newCategoryId === 'null' ? null : Number(newCategoryId);

      const { error } = await supabase
        .from('vehicles_extras')
        .update({ category_id: categoryIdToSave })
        .eq('id', itemId);

      if (error) throw error;

      toast.success(dv('Categoría actualizada', 'Category updated'));
      setEditingItemId(null);

      // Recargar solo los datos, sin recargar la página
      refetch();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(dv('No pudimos cambiar la categoría. Intenta de nuevo.', 'Could not update the category. Please try again.'));
    }
  };

  // Filtrar datos según el tipo de filtro y vehículo seleccionado
  const getFilteredData = () => {
    let filtered = costs;

    // Filtrar por tipo
    if (filterType === 'acquisitions') {
      filtered = filtered.filter((cost) => cost.type === 'acquisition');
    } else if (filterType === 'commissions') {
      filtered = filtered.filter((cost) => cost.type === 'commission');
    }

    // Filtrar por vehículo
    if (selectedVehicleId !== 'all') {
      const vehicleId = parseInt(selectedVehicleId, 10);
      filtered = filtered.filter((cost) => cost.vehicleId === vehicleId);
    }

    return filtered;
  };

  const filteredCosts = getFilteredData();

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedVehicleId, costs.length]);

  // Reset page when viewMode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  // También filtrar los costos categorizados por vehículo
  const filteredCategorizedCosts = useMemo(() => {
    if (selectedVehicleId === 'all') {
      return categorizedCosts;
    }
    const vehicleId = parseInt(selectedVehicleId, 10);
    return categorizedCosts
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => item.vehicleId === vehicleId),
        totalCost: category.items
          .filter((item) => item.vehicleId === vehicleId)
          .reduce((sum, item) => sum + item.amount, 0),
      }))
      .filter((category) => category.items.length > 0);
  }, [categorizedCosts, selectedVehicleId]);

  // Costos filtrados solo por vehículo (para conteos de pills)
  const vehicleFilteredCosts = useMemo(() => {
    if (selectedVehicleId === 'all') return costs;
    const vehicleId = parseInt(selectedVehicleId, 10);
    return costs.filter((c) => c.vehicleId === vehicleId);
  }, [costs, selectedVehicleId]);

  const pillCounts = useMemo(() => ({
    all: vehicleFilteredCosts.length,
    acquisitions: vehicleFilteredCosts.filter((c) => c.type === 'acquisition').length,
    commissions: vehicleFilteredCosts.filter((c) => c.type === 'commission').length,
    by_category: vehicleFilteredCosts.filter((c) => c.type === 'expense').length,
  }), [vehicleFilteredCosts]);

  // Calcular totales
  const totalCosts = filteredCosts.reduce((sum, cost) => sum + cost.amount, 0);

  const handleExportExcel = () => {
    if (filteredCosts.length === 0) {
      toast.error(dv('No hay costos para exportar', 'No costs to export'));
      return;
    }

    exportCostsSummaryToExcel({
      costs: filteredCosts,
      filename: 'resumen-costos',
      language: i18n.language === 'es' ? 'es' : 'en',
    });

    toast.success(dv('Exportación exitosa', 'Export successful'));
  };

  useEffect(() => {
    onExportReady?.(handleExportExcel, loading || filteredCosts.length === 0);
  }, [loading, filteredCosts.length]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-slate-100 rounded animate-pulse w-64" />
        <div className="h-64 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  const paginatedCosts = filteredCosts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      {(() => {
        const pills: { key: FilterType; label: string; Icon: React.FC<{ className?: string }> | null; color: string; bgColor: string; ringHex: string }[] = [
          { key: 'all', label: dv('Todos', 'All'), Icon: null, color: '', bgColor: '', ringHex: '' },
          { key: 'acquisitions', label: dv('Adquisiciones', 'Acquisitions'), Icon: ShoppingCart, color: 'text-blue-600', bgColor: 'bg-blue-100', ringHex: '#3b82f6' },
          { key: 'commissions', label: dv('Comisiones', 'Commissions'), Icon: Users, color: 'text-amber-600', bgColor: 'bg-amber-100', ringHex: '#f59e0b' },
          { key: 'by_category', label: dv('Por categoría', 'By category'), Icon: Layers, color: 'text-purple-600', bgColor: 'bg-purple-100', ringHex: '#8b5cf6' },
        ];

        return (
          <>
            {/* Mobile: horizontal scroll pills + vehicle select */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:hidden scrollbar-none items-center">
              {pills.map((pill) => {
                const isActive = filterType === pill.key;
                const count = pillCounts[pill.key];
                return (
                  <button
                    key={pill.key}
                    onClick={() => setFilterType(pill.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 transition-all duration-200
                      ${isActive
                        ? pill.Icon ? pill.bgColor : 'bg-primary text-white'
                        : 'bg-white border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]'
                      }`}
                    style={isActive && pill.Icon ? { boxShadow: `0 0 0 2px ${pill.ringHex}` } : undefined}
                  >
                    {pill.Icon && <pill.Icon className={`w-3.5 h-3.5 ${pill.color}`} />}
                    <span className={`text-[13px] font-medium whitespace-nowrap ${isActive ? (pill.Icon ? pill.color : 'text-white') : 'text-slate-700'}`}>
                      {pill.label}
                    </span>
                    <span className={`text-[13px] font-semibold ${isActive ? (pill.Icon ? 'text-slate-900' : 'text-white') : 'text-slate-900'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              {/* Vehicle select pill — mobile */}
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger className="flex-shrink-0 h-auto px-3 py-2 rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] text-[13px] font-medium text-slate-700 gap-2 w-auto [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-slate-400">
                  <Car className="h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder={dv('Vehículo', 'Vehicle')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{dv('Todos los vehículos', 'All vehicles')}</SelectItem>
                  {uniqueVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>{vehicle.info}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Desktop: compact pills + vehicle select + total */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              {pills.map((pill) => {
                const isActive = filterType === pill.key;
                const count = pillCounts[pill.key];
                return (
                  <button
                    key={pill.key}
                    onClick={() => setFilterType(pill.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border
                      ${isActive
                        ? pill.Icon ? 'border-transparent' : 'bg-primary text-white border-transparent'
                        : 'border-slate-200/60 bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]'
                      }`}
                    style={isActive && pill.Icon ? {
                      backgroundColor: `${pill.ringHex}10`,
                      boxShadow: `0 0 0 2px ${pill.ringHex}`,
                    } : undefined}
                  >
                    {pill.Icon && <pill.Icon className={`w-3.5 h-3.5 ${pill.color}`} />}
                    <span className={`text-[13px] font-medium whitespace-nowrap ${isActive ? (pill.Icon ? pill.color : 'text-white') : 'text-slate-700'}`}>
                      {pill.label}
                    </span>
                    <span className={`text-[13px] font-semibold ${isActive ? (pill.Icon ? 'text-slate-900' : 'text-white') : 'text-slate-900'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              {/* Separador sutil */}
              <div className="w-px h-6 bg-slate-200 mx-0.5" />

              {/* Vehicle select pill-style — desktop */}
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger className={`h-auto px-3 py-2 rounded-xl border shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] text-[13px] font-medium gap-2 w-auto [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-slate-400 transition-all duration-200
                  ${selectedVehicleId !== 'all'
                    ? 'border-transparent bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500'
                    : 'border-slate-200/60 bg-white text-slate-700 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]'
                  }`}>
                  <Car className={`h-3.5 w-3.5 ${selectedVehicleId !== 'all' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <SelectValue placeholder={dv('Todos los vehículos', 'All vehicles')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{dv('Todos los vehículos', 'All vehicles')}</SelectItem>
                  {uniqueVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>{vehicle.info}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Total — pushed to the right */}
              <div className="ml-auto flex items-center gap-1.5 text-sm">
                <span className="text-slate-400">{dv('Total:', 'Total:')}</span>
                <span className="font-semibold text-red-600">{formatPrice(totalCosts)}</span>
              </div>
            </div>
          </>
        );
      })()}

      {/* Mobile: total + export */}
      <div className="flex items-center justify-between sm:hidden">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-slate-400">{dv('Total:', 'Total:')}</span>
          <span className="font-semibold text-red-600">{formatPrice(totalCosts)}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={loading || filteredCosts.length === 0}
        >
          <Download className="h-4 w-4 mr-1.5" />
          {dv('Exportar', 'Export')}
        </Button>
      </div>

      {/* Vista Por Categoría */}
      {filterType === 'by_category' ? (
        <div className="space-y-2">
          {filteredCategorizedCosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {dv('No hay costos para mostrar', 'No costs to display')}
            </div>
          ) : (
            filteredCategorizedCosts
              .filter((category) => {
                // Excluir solo compras de vehículos y comisiones
                const isAcquisition = category.categoryNameEs === 'Compra de vehículos';
                const isCommission = category.categoryNameEs === 'Comisiones';
                return !isAcquisition && !isCommission;
              })
              .map((category: CostCategory) => {
                const categoryKey = category.categoryId?.toString() || 'uncategorized';
                const isExpanded = expandedCategories.has(categoryKey);
                const categoryName =
                  i18n.language?.toLowerCase().startsWith('es')
                    ? category.categoryNameEs
                    : category.categoryNameEn;

                return (
                  <div key={categoryKey} className="border rounded-lg overflow-hidden">
                    {/* Categoría principal - Clickeable para expandir/colapsar */}
                    <button
                      onClick={() => toggleCategory(categoryKey)}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        )}
                        <span className="font-medium">• {categoryName}</span>
                      </div>
                      <span className="font-semibold text-red-600">
                        {formatPrice(category.totalCost)}
                      </span>
                    </button>

                    {/* Items de la categoría (colapsables) */}
                    {isExpanded && (
                      <div className="border-t bg-slate-50">
                        {category.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between py-2 px-3 pl-10 hover:bg-slate-100 gap-2"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-slate-500">→</span>
                              <span className="text-sm truncate">{item.title}</span>
                              {item.vehicleId && (
                                <button
                                  onClick={() => handleVehicleClick(item.vehicleId)}
                                  className="text-xs text-primary hover:text-primary/80 hover:underline shrink-0"
                                >
                                  ({item.vehicleInfo})
                                </button>
                              )}
                            </div>

                            {/* Cambiar categoría */}
                            {item.type === 'expense' && (
                              <div className="flex items-center gap-2 shrink-0">
                                {editingItemId === item.id ? (
                                  <Select
                                    value={item.categoryId?.toString() || 'null'}
                                    onValueChange={(value) => handleCategoryChange(item.id, item.type, value)}
                                  >
                                    <SelectTrigger className="h-7 text-xs w-[140px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="null">
                                        {dv('Sin categoría', 'No category')}
                                      </SelectItem>
                                      {expenseCategories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                          {i18n.language === 'es' ? cat.label_es : cat.label_en}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <button
                                    onClick={() => setEditingItemId(item.id)}
                                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                                    title={dv('Cambiar categoría', 'Change category')}
                                  >
                                    <Edit2 className="h-3 w-3 text-slate-500" />
                                  </button>
                                )}
                              </div>
                            )}

                            <span className="text-sm font-medium text-slate-700 ml-2 shrink-0">
                              {formatPrice(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* Vista Cards */
        <div>
          <CostsSummaryCards
            costs={paginatedCosts}
            loading={loading}
            onVehicleClick={(id) => handleVehicleClick(id)}
          />
          <VehiclesPagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredCosts.length / pageSize)}
            totalCount={filteredCosts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            showingText={dv('Mostrando {{start}} - {{end}} de {{total}} costos', 'Showing {{start}} - {{end}} of {{total}} costs')}
          />
        </div>
      ) : (
        /* Vista de Lista (Todos o Compras de vehículos) */
        <div className="border rounded-lg overflow-hidden">
          {filteredCosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {dv('No hay costos para mostrar', 'No costs to display')}
            </div>
          ) : (
            <div className="divide-y">
              {paginatedCosts.map((cost) => (
                <div
                  key={cost.id}
                  className="p-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{cost.title}</span>
                        {cost.vehicleId && (
                          <button
                            onClick={() => handleVehicleClick(cost.vehicleId)}
                            className="text-xs text-primary hover:text-primary/80 hover:underline"
                          >
                            ({cost.vehicleInfo})
                          </button>
                        )}
                      </div>
                      {cost.description && (
                        <p className="text-sm text-slate-600 mb-2">
                          {cost.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>{formatDate(cost.createdAt)}</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded-full">
                          {i18n.language?.toLowerCase().startsWith('es')
                            ? cost.categoryNameEs
                            : cost.categoryNameEn}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-red-600">
                        {formatPrice(cost.amount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <VehiclesPagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredCosts.length / pageSize)}
            totalCount={filteredCosts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            showingText={dv('Mostrando {{start}} - {{end}} de {{total}} costos', 'Showing {{start}} - {{end}} of {{total}} costs')}
          />
        </div>
      )}
    </div>
  );
};
