import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Search,
  Car,
  Users,
  Mail,
  Info,
  Sparkles,
  Filter,
  Target,
  Calendar,
  DollarSign,
  Tag,
  MousePointerClick,
  SlidersHorizontal,
  History,
  Upload,
  UserPlus,
  Plus,
  Check,
  ChevronRight,
  ChevronLeft,
  Send,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import MarketingEmailModal from '@/components/marketing/MarketingEmailModal';
import MarketingHistoryView from '@/components/marketing/MarketingHistoryView';
import DashboardLayout from '@/components/DashboardLayout';
import { useI18n } from '@/hooks/useI18n';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ExcelUploadDrawer } from '@/components/clients/ExcelUploadDrawer';

import { useMarketing, useMarketingFilters } from '@/hooks/marketing';
import { useMarketingStore } from '@/stores/marketingStore';
import posthog from '@/utils/posthog';
import LottieImport from 'lottie-react';
const Lottie = (typeof LottieImport === 'object' && 'default' in LottieImport) ? (LottieImport as any).default : LottieImport;
import aiAnimation from '@/assets/ai-animation.json';

const STEPS = [
  { id: 'vehicle', label: 'Vehículo', icon: Car },
  { id: 'config', label: 'Configurar', icon: SlidersHorizontal },
  { id: 'search', label: 'Buscar', icon: Sparkles },
  { id: 'send', label: 'Enviar', icon: Send },
] as const;

const MarketingPage = () => {
  const { tCommon } = useI18n();
  const { categories } = useCategories();
  const { clientId } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Manual customer search
  const [manualSearch, setManualSearch] = useState('');
  const [manualResults, setManualResults] = useState<Array<{ id: number; full_name: string; email: string }>>([]);
  const [manualSearching, setManualSearching] = useState(false);
  const { addManualCustomer, searchProgress } = useMarketingStore();

  const handleManualSearch = useCallback(async (query: string) => {
    setManualSearch(query);
    if (query.trim().length < 2 || !clientId) {
      setManualResults([]);
      return;
    }
    setManualSearching(true);
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, full_name, email')
        .eq('client_id', clientId)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .not('email', 'is', null)
        .limit(8);
      setManualResults(
        (data || []).map((c) => ({
          id: c.id,
          full_name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          email: c.email,
        }))
      );
    } catch {
      setManualResults([]);
    } finally {
      setManualSearching(false);
    }
  }, [clientId]);

  const {
    selectedVehicle,
    selectedVehicles,
    vehicleSearch,
    filteredRecommendations,
    selectedCustomers,
    loading,
    isEmailModalOpen,
    currentView,
    hasCustomerTransactions,
    checkingTransactions,
    filteredVehicles,
    vehiclesLoading,
    selectedCustomersData,
    setVehicleSearch,
    setIsEmailModalOpen,
    setCurrentView,
    handleVehicleSelect,
    toggleCustomerSelection,
    findSimilarCustomers,
    recheckTransactions,
    formatPrice,
    getSimilarityColor,
    allStatuses,
    selectedStatuses,
    setSelectedStatuses,
  } = useMarketing();

  const {
    filters,
    availableCategory,
    hasActiveFilters,
    handleSimilarityThresholdChange,
    handleTargetAudienceChange,
    handlePriceFilterToggle,
    handlePriceFilterChange,
    handleYearFilterToggle,
    handleYearFilterChange,
    handleCategoryFilterToggle,
    handleResetFilters,
  } = useMarketingFilters();

  // Step completion logic
  const stepComplete = useMemo(() => [
    selectedVehicles.length > 0,
    selectedVehicles.length > 0,
    filteredRecommendations.length > 0,
    false,
  ], [selectedVehicles.length, filteredRecommendations.length]);

  const canGoNext = activeStep < STEPS.length - 1 && stepComplete[activeStep];

  const handleVehicleSelectWithTracking = useCallback((vehicle: any) => {
    const wasEmpty = selectedVehicles.length === 0;
    handleVehicleSelect(vehicle);
    // Fire campaign_started when the first vehicle is selected
    if (wasEmpty) {
      posthog.capture({
        distinctId: clientId ? String(clientId) : 'anonymous',
        event: 'campaign_started',
      });
    }
  }, [selectedVehicles.length, clientId, handleVehicleSelect]);

  const handleSearchAndAdvance = async () => {
    if (selectedVehicles.length === 0) return;
    await findSimilarCustomers();
    setActiveStep(3);
  };

  return (
    <DashboardLayout>
      <div className="min-h-full bg-white">

        {checkingTransactions ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-8 w-8 animate-spin mr-3 text-primary" />
            <span className="text-gray-500">
              Sincronizando ventas y preparando Marketing GAIA...
            </span>
          </div>
        ) : hasCustomerTransactions === false ? (
          /* ── No data yet ── */
          <div className="max-w-2xl mx-auto px-4 py-20">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Aún no hay datos para Marketing GAIA
              </h2>
              <p className="text-gray-500 mb-3 max-w-lg mx-auto">
                Marketing GAIA se alimenta automáticamente de tus <strong>ventas registradas</strong> en el sistema.
                Cuando registres tu primera venta, los datos se sincronizarán y podrás usar esta herramienta.
              </p>
              <p className="text-gray-400 text-sm mb-8 max-w-lg mx-auto">
                Si además tienes un historial externo de transferencias vehiculares (Excel de Autofact u otro proveedor), puedes subirlo para tener aún más datos.
              </p>
              <Button variant="outline" size="lg" onClick={() => setShowImport(true)}>
                <Upload className="h-5 w-5 mr-2" />
                Subir Excel externo (opcional)
              </Button>
              <p className="text-xs text-gray-400 mt-4">
                El Excel externo debe tener: Código, Marca, Modelo, Año, Precio, Rut comprador, Nombre comprador, Email comprador, Rut vendedor, Nombre vendedor, Email vendedor.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Sticky Header + Stepper ── */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
              <div className="max-w-4xl mx-auto px-4 sm:px-6">
                {/* Title row */}
                <div className="flex items-center justify-between pt-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-primary/20">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Historial</span>
                  </button>
                </div>

                {/* Desktop Stepper */}
                <div className="hidden md:flex items-center gap-1 pb-4">
                  {STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = idx === activeStep;
                    const isDone = stepComplete[idx] && idx < activeStep;
                    const isClickable = idx === 0 || stepComplete[idx - 1];

                    return (
                      <React.Fragment key={step.id}>
                        <button
                          onClick={() => isClickable && setActiveStep(idx)}
                          disabled={!isClickable}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : isDone
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : isClickable
                              ? 'text-gray-500 hover:bg-gray-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isActive
                              ? 'bg-primary text-white'
                              : isDone
                              ? 'bg-emerald-500 text-white'
                              : isClickable
                              ? 'bg-gray-200 text-gray-500'
                              : 'bg-gray-100 text-gray-300'
                          }`}>
                            {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <span>{step.label}</span>
                        </button>
                        {idx < STEPS.length - 1 && (
                          <div className={`flex-1 h-px mx-1 ${
                            stepComplete[idx] ? 'bg-emerald-300' : 'bg-gray-200'
                          }`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Mobile Stepper */}
                <div className="md:hidden pb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                    <span className="font-medium">Paso {activeStep + 1} de {STEPS.length}</span>
                    <span>{STEPS[activeStep].label}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Content ── */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

              {/* ═══ STEP 0: Vehicle Selection ═══ */}
              {activeStep === 0 && (
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">Elige los vehículos a promocionar</h2>
                      <p className="text-sm text-gray-500">Selecciona uno o más vehículos de tu inventario</p>
                    </div>
                    {selectedVehicles.length > 0 && (
                      <Badge className="shrink-0">{selectedVehicles.length} seleccionado{selectedVehicles.length !== 1 ? 's' : ''}</Badge>
                    )}
                  </div>

                  {vehiclesLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-2 text-gray-500">Cargando vehículos...</span>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar por marca, modelo..."
                          value={vehicleSearch}
                          onChange={(e) => setVehicleSearch(e.target.value)}
                          className="pl-10 h-11 rounded-xl border-gray-200"
                        />
                      </div>

                      {/* Status filter pills */}
                      {allStatuses.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-400 shrink-0">Estado:</span>
                          {allStatuses.map((status) => {
                            const isSelected = selectedStatuses.includes(status.name);
                            return (
                              <button
                                key={status.name}
                                onClick={() => {
                                  if (isSelected) {
                                    const next = selectedStatuses.filter((s) => s !== status.name);
                                    setSelectedStatuses(next.length === 0 ? ['Publicado'] : next);
                                  } else {
                                    setSelectedStatuses([...selectedStatuses, status.name]);
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                  isSelected
                                    ? 'bg-primary/10 text-primary border border-primary/30'
               
               
                                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                {status.color && (
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: status.color }}
                                  />
                                )}
                                {status.name}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="space-y-2 max-h-[calc(100vh-380px)] overflow-y-auto">
                        {filteredVehicles.map((vehicle) => {
                          const isSelected = selectedVehicles.some((v) => v.id === vehicle.id);
                          return (
                              <div
                                key={vehicle.id}
                                className={`p-3 border rounded-xl cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                                }`}
                                onClick={() => handleVehicleSelectWithTracking(vehicle)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative shrink-0">
                                    {vehicle.main_image ? (
                                      <img
                                        src={vehicle.main_image}
                                        alt={`${vehicle.brand?.name} ${vehicle.model?.name}`}
                                        className="w-16 h-12 rounded-lg object-cover bg-gray-100"
                                      />
                                    ) : (
                                      <div className="w-16 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <Car className="w-5 h-5 text-gray-300" />
                                      </div>
                                    )}
                                    {isSelected && (
                                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
                                        <Check className="w-3 h-3 text-white" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-sm text-gray-900 truncate">
                                      {vehicle.brand?.name} {vehicle.model?.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Año {vehicle.year} · {formatPrice(vehicle.price)}
                                      {vehicle.category?.name && <span className="ml-1">· {vehicle.category.name}</span>}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs shrink-0">{vehicle.status?.name}</Badge>
                                </div>
                              </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ═══ STEP 1: Config ═══ */}
              {activeStep === 1 && (
                <div className="space-y-5">
                  {/* Selected vehicles summary */}
                  {selectedVehicles.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Car className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {selectedVehicles.length === 1
                            ? `${selectedVehicles[0].brand?.name} ${selectedVehicles[0].model?.name} ${selectedVehicles[0].year}`
                            : `${selectedVehicles.length} vehículos seleccionados`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedVehicles.length === 1
                            ? formatPrice(selectedVehicles[0].price)
                            : selectedVehicles.map((v) => `${v.brand?.name} ${v.model?.name}`).join(', ')}
                        </p>
                      </div>
                      <button onClick={() => setActiveStep(0)} className="text-xs text-primary hover:underline shrink-0">
                        Cambiar
                      </button>
                    </div>
                  )}

                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">Configura la búsqueda</h2>
                    <p className="text-sm text-gray-500">Define el tipo de audiencia y ajusta los filtros</p>
                  </div>

                  {/* Audience */}
                  <div className="rounded-xl border border-gray-200 p-5 space-y-4">
                    <Label className="text-sm font-medium text-gray-900">¿A quién quieres llegar?</Label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary/30 hover:bg-primary/[0.02] cursor-pointer transition-all">
                        <Checkbox
                          id="buyers"
                          checked={filters.targetAudience.buyers}
                          onCheckedChange={(checked) => handleTargetAudienceChange('buyers', !!checked)}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Compradores</p>
                          <p className="text-xs text-gray-500">Personas que <strong>compraron</strong> vehículos similares</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary/30 hover:bg-primary/[0.02] cursor-pointer transition-all">
                        <Checkbox
                          id="sellers"
                          checked={filters.targetAudience.sellers}
                          onCheckedChange={(checked) => handleTargetAudienceChange('sellers', !!checked)}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Vendedores</p>
                          <p className="text-xs text-gray-500">Personas que <strong>vendieron</strong> vehículos similares</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Similarity */}
                  <div className="rounded-xl border border-gray-200 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900">Similitud mínima</Label>
                      <span className="text-sm font-bold text-primary">{filters.similarityThreshold}%</span>
                    </div>
                    <Slider
                      min={50} max={95} step={5}
                      value={[filters.similarityThreshold]}
                      onValueChange={handleSimilarityThresholdChange}
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Más resultados</span>
                      <span>Más precisos</span>
                    </div>
                  </div>

                  {/* Optional Filters */}
                  <div className="rounded-xl border border-gray-200 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-900">Filtros opcionales</Label>
                      {selectedVehicles.length > 0 && (
                        <button onClick={handleResetFilters} className="text-xs text-gray-400 hover:text-primary transition-colors">
                          Resetear
                        </button>
                      )}
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch id="price-filter" checked={filters.priceFilter.enabled} onCheckedChange={handlePriceFilterToggle} />
                          <Label htmlFor="price-filter" className="text-sm">Rango de precio</Label>
                        </div>
                        {filters.priceFilter.enabled && <Badge variant="secondary" className="text-[10px]">±30%</Badge>}
                      </div>
                      {filters.priceFilter.enabled && (
                        <div className="grid grid-cols-2 gap-2 pl-10">
                          <Input type="number" value={filters.priceFilter.min} onChange={(e) => handlePriceFilterChange('min', Number(e.target.value))} placeholder="Mínimo" className="text-sm h-9" />
                          <Input type="number" value={filters.priceFilter.max} onChange={(e) => handlePriceFilterChange('max', Number(e.target.value))} placeholder="Máximo" className="text-sm h-9" />
                        </div>
                      )}
                    </div>

                    {/* Year */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch id="year-filter" checked={filters.yearFilter.enabled} onCheckedChange={handleYearFilterToggle} />
                          <Label htmlFor="year-filter" className="text-sm">Rango de año</Label>
                        </div>
                        {filters.yearFilter.enabled && <Badge variant="secondary" className="text-[10px]">±3 años</Badge>}
                      </div>
                      {filters.yearFilter.enabled && (
                        <div className="grid grid-cols-2 gap-2 pl-10">
                          <Input type="number" value={filters.yearFilter.min} onChange={(e) => handleYearFilterChange('min', Number(e.target.value))} placeholder="Desde" className="text-sm h-9" />
                          <Input type="number" value={filters.yearFilter.max} onChange={(e) => handleYearFilterChange('max', Number(e.target.value))} placeholder="Hasta" className="text-sm h-9" />
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch id="category-filter" checked={filters.categoryFilter.enabled} onCheckedChange={handleCategoryFilterToggle} disabled={!availableCategory} />
                          <Label htmlFor="category-filter" className="text-sm">Misma categoría</Label>
                        </div>
                        {filters.categoryFilter.enabled && availableCategory && (
                          <Badge variant="secondary" className="text-[10px]">{availableCategory}</Badge>
                        )}
                      </div>
                      {!availableCategory && <p className="text-xs text-gray-400 pl-10">Sin categoría asignada</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 2: Search with GAIA ═══ */}
              {activeStep === 2 && (
                <div className="flex flex-col items-center py-8">
                  {/* GAIA Orb — same as MobileBottomNav */}
                  <div className="relative w-24 h-24 mb-6">
                    {/* Orbital ring — always visible when searching */}
                    {loading && (
                      <div
                        className="absolute inset-[-4px] animate-spin"
                        style={{ animationDuration: '10s' }}
                      >
                        <div className="w-full h-full rounded-full" style={{
                          background: 'conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(6,182,212,0.35) 78%, transparent 100%)',
                          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                          mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                        }} />
                      </div>
                    )}
                    <div className="w-full h-full rounded-full bg-white border border-slate-200/80 flex items-center justify-center shadow-lg">
                      <Lottie animationData={aiAnimation} loop className="w-16 h-16" />
                    </div>
                  </div>

                  {loading ? (
                    <div className="text-center space-y-4 w-full max-w-sm">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">GAIA está analizando</h2>
                        <p className="text-sm text-gray-500 mt-1">
                          {searchProgress.currentVehicle
                            ? `Buscando para ${searchProgress.currentVehicle}...`
                            : 'Procesando resultados...'}
                        </p>
                      </div>
                      {/* Per-vehicle progress */}
                      <div className="space-y-2">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full transition-all duration-500"
                            style={{ width: `${searchProgress.total > 0 ? (searchProgress.current / searchProgress.total) * 100 : 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400">
                          Vehículo {searchProgress.current} de {searchProgress.total}
                        </p>
                      </div>
                      {/* Vehicle list being processed */}
                      <div className="space-y-1.5 pt-2">
                        {selectedVehicles.map((v, i) => (
                          <div key={v.id} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                            i + 1 < searchProgress.current
                              ? 'text-emerald-600 bg-emerald-50'
                              : i + 1 === searchProgress.current
                              ? 'text-primary bg-primary/5 font-medium'
                              : 'text-gray-400'
                          }`}>
                            {i + 1 < searchProgress.current ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : i + 1 === searchProgress.current ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />
                            )}
                            {v.brand?.name} {v.model?.name} {v.year}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-5 max-w-md">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-1">Buscar con GAIA</h2>
                        <p className="text-sm text-gray-500">
                          GAIA analizará tu base de clientes para cada vehículo seleccionado y encontrará a quienes compraron o vendieron vehículos similares.
                        </p>
                      </div>

                      {/* Vehicles to search */}
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2">
                          {selectedVehicles.length} vehículo{selectedVehicles.length !== 1 ? 's' : ''} · Similitud {filters.similarityThreshold}%+
                        </p>
                        {selectedVehicles.map((v) => (
                          <div key={v.id} className="flex items-center gap-2 text-sm text-gray-700">
                            <Car className="w-3.5 h-3.5 text-gray-400" />
                            <span>{v.brand?.name} {v.model?.name} {v.year}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-100 rounded-xl p-3">
                        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-left text-amber-700">
                          GAIA no busca solo por marca exacta — entiende el segmento y encuentra clientes con gustos similares.
                        </p>
                      </div>

                      <Button
                        onClick={handleSearchAndAdvance}
                        disabled={selectedVehicles.length === 0}
                        size="lg"
                        className="bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 shadow-lg shadow-primary/20 rounded-xl px-10 h-12 text-base"
                      >
                        <Sparkles className="h-5 w-5 mr-2" />
                        Buscar con GAIA
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ STEP 3: Results & Send ═══ */}
              {activeStep === 3 && (
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">
                        {filteredRecommendations.length > 0
                          ? `${filteredRecommendations.length} clientes encontrados`
                          : 'Resultados'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {filteredRecommendations.length > 0
                          ? 'Selecciona los destinatarios y redacta tu email'
                          : 'Busca con GAIA para ver resultados aquí'}
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsEmailModalOpen(true)}
                      disabled={selectedCustomers.length === 0 && filteredRecommendations.length === 0}
                      className="rounded-xl shrink-0"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Redactar Email ({selectedCustomers.length})
                    </Button>
                  </div>

                  {filteredRecommendations.length === 0 && !loading ? (
                    <div className="text-center py-16">
                      <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm font-medium text-gray-500 mb-1">Sin resultados aún</p>
                      <p className="text-xs text-gray-400 mb-4">Vuelve al paso anterior y ejecuta la búsqueda con GAIA</p>
                      <Button variant="outline" size="sm" onClick={() => setActiveStep(2)}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Buscar con GAIA
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto">
                        {filteredRecommendations.map((customer, index) => (
                          <div
                            key={`${customer.id}-${index}`}
                            onClick={() => toggleCustomerSelection(customer.id)}
                            className={`p-4 border rounded-xl cursor-pointer transition-all ${
                              selectedCustomers.includes(customer.id)
                                ? 'border-primary/30 bg-primary/[0.02]'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedCustomers.includes(customer.id)}
                                onCheckedChange={() => toggleCustomerSelection(customer.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h3 className="font-medium text-sm text-gray-900">
                                      {customer.full_name || tCommon('marketing.results.nameUnavailable')}
                                    </h3>
                                    <p className="text-xs text-gray-500">{customer.email}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {customer.matched_vehicle && (
                                      <Badge variant="outline" className="text-[10px] text-gray-500 font-normal hidden sm:inline-flex">
                                        {customer.matched_vehicle}
                                      </Badge>
                                    )}
                                    {customer.similarity > 0 ? (
                                      <>
                                        <div className={`w-2 h-2 rounded-full ${getSimilarityColor(customer.similarity)}`} />
                                        <span className="text-xs font-medium text-gray-600">
                                          {Math.round(customer.similarity * 100)}%
                                        </span>
                                      </>
                                    ) : (
                                      <Badge variant="secondary" className="text-[10px]">Manual</Badge>
                                    )}
                                  </div>
                                </div>
                                {customer.last_purchase.brand && (
                                  <div className="mt-2 bg-gray-50 rounded-lg p-2.5">
                                    <p className="text-[11px] text-gray-500">
                                      {customer.transaction_type === 'compra'
                                        ? tCommon('marketing.results.boughtSimilar')
                                        : customer.transaction_type === 'venta'
                                        ? tCommon('marketing.results.soldSimilar')
                                        : 'Agregado manualmente'}
                                      {' — '}
                                      <span className="text-gray-700 font-medium">
                                        {customer.last_purchase.brand} {customer.last_purchase.model} {customer.last_purchase.year}
                                      </span>
                                      {customer.last_purchase.price > 0 && (
                                        <span> · {formatPrice(customer.last_purchase.price)}</span>
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Manual customer search */}
                      <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <UserPlus className="h-4 w-4 text-gray-400" />
                          <p className="text-sm font-medium text-gray-600">Agregar clientes manualmente</p>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                          <Input
                            placeholder="Buscar por nombre o email..."
                            value={manualSearch}
                            onChange={(e) => handleManualSearch(e.target.value)}
                            className="pl-9 h-9 text-sm rounded-lg"
                          />
                        </div>
                        {manualSearching && (
                          <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                            <Loader2 className="h-3 w-3 animate-spin" /> Buscando...
                          </div>
                        )}
                        {manualResults.length > 0 && (
                          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                            {manualResults.map((c) => {
                              const alreadyAdded = filteredRecommendations.some((r) => r.id === c.id);
                              return (
                                <div
                                  key={c.id}
                                  className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${
                                    alreadyAdded
                                      ? 'border-gray-100 bg-gray-50 text-gray-400'
                                      : 'border-gray-200 hover:bg-primary/5 hover:border-primary/30 cursor-pointer'
                                  }`}
                                  onClick={() => {
                                    if (alreadyAdded) return;
                                    addManualCustomer({
                                      id: c.id,
                                      full_name: c.full_name,
                                      email: c.email,
                                      rut: '',
                                      similarity: 0,
                                      transaction_type: undefined,
                                      last_purchase: { brand: '', model: '', year: 0, price: 0 },
                                    });
                                    setManualSearch('');
                                    setManualResults([]);
                                  }}
                                >
                                  <div>
                                    <p className="font-medium text-xs">{c.full_name || 'Sin nombre'}</p>
                                    <p className="text-[11px] text-gray-500">{c.email}</p>
                                  </div>
                                  {alreadyAdded ? (
                                    <Badge variant="secondary" className="text-[10px]">Ya agregado</Badge>
                                  ) : (
                                    <Plus className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Bottom Navigation ── */}
              <div className="flex items-center justify-between pt-2 pb-4">
                <Button
                  variant="ghost"
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  className="text-gray-500"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Atrás
                </Button>
                {activeStep < STEPS.length - 1 && activeStep !== 2 && (
                  <Button
                    onClick={() => {
                      if (activeStep === 0 && selectedVehicles.length > 0) {
                        posthog.capture({
                          distinctId: clientId ? String(clientId) : 'anonymous',
                          event: 'campaign_vehicles_selected',
                          properties: { count: selectedVehicles.length },
                        });
                      }
                      setActiveStep(activeStep + 1);
                    }}
                    disabled={!canGoNext}
                    className="rounded-xl"
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── History Dialog ── */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historial de campañas
            </DialogTitle>
          </DialogHeader>
          <MarketingHistoryView />
        </DialogContent>
      </Dialog>

      {/* ── Excel Import Drawer ── */}
      <ExcelUploadDrawer
        open={showImport}
        onClose={() => {
          setShowImport(false);
          recheckTransactions();
        }}
      />

      {/* ── Email Modal ── */}
      <MarketingEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        vehicle={selectedVehicle}
        customers={filteredRecommendations}
        selectedCustomerIds={selectedCustomers}
      />
    </DashboardLayout>
  );
};

export default MarketingPage;
