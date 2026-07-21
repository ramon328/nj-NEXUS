import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, X, RotateCcw, ChevronDown, Check } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { supabase } from '@/integrations/supabase/client';
import { useDealerships } from '@/hooks/useDealerships';
import { useActiveDealership } from '@/hooks/useActiveDealership';
import { useAuth } from '@/contexts/AuthContext';
import { useStatuses } from '@/hooks/useStatuses';
import { MultiSelect } from '../ui/MultiSelect';
import { useI18n } from '@/hooks/useI18n';

// ============================================
// Selector inline expandible para drawers móvil
// ============================================
function InlineSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2.5 text-[13px]"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>{selected?.label || label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100">
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] transition-colors ${
                  isActive ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600 active:bg-slate-50'
                }`}
              >
                <span className="flex-1 text-left">{opt.label}</span>
                {isActive && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InlineMultiSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string[];
  options: { value: string; label: string }[];
  onChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedCount = value.length;
  const allSelected = selectedCount === options.length;
  const displayText = selectedCount === 0 || allSelected
    ? label
    : `${selectedCount} seleccionado${selectedCount > 1 ? 's' : ''}`;

  const toggle = (val: string) => {
    onChange(value.includes(val) ? value.filter((v) => v !== val) : [...value, val]);
  };

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2.5 text-[13px]"
      >
        <span className={selectedCount > 0 && !allSelected ? 'text-slate-900' : 'text-slate-400'}>{displayText}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100">
          {options.map((opt) => {
            const isActive = value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] transition-colors ${
                  isActive ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600 active:bg-slate-50'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  isActive ? 'bg-primary border-primary' : 'border-slate-300'
                }`}>
                  {isActive && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="flex-1 text-left">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface VehiculosFilterProps {
  onFilterChange: (filters: VehiculosFilters) => void;
  filters?: VehiculosFilters;
}
export interface VehiculosFilters {
  search: string;
  status: string[];
  seller: string;
  consigned: string;
  stockType: string;
  dealershipId: string;
  alertFilter?: string;
  alertFilterBrandId?: string;
  alertFilterBrandName?: string;
  /**
   * Atajo "Recientes" — pre-set de filtro + sort que el usuario aplica con un
   * solo click para ver los últimos vendidos/consignados/modificados.
   */
  recentView?: 'sold' | 'consigned' | 'updated';
}
interface Status { id: number; name: string }
interface Seller { id: number; first_name: string; last_name: string }

const INPUT_BASE = 'h-9 rounded-xl bg-white border border-slate-200/60 text-[13px] text-slate-500 placeholder:text-slate-400 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] focus:ring-2 focus:ring-slate-200 transition';
const SELECT_TRIGGER = `h-9 rounded-xl bg-white border-slate-200/60 text-[13px] text-slate-500 [&>svg]:text-slate-400 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] focus:ring-2 focus:ring-slate-200 transition`;

export const VehiculosFilter: React.FC<VehiculosFilterProps> = ({
  onFilterChange,
  filters: externalFilters,
}) => {
  const { tCommon } = useI18n();
  const { clientId } = useAuth();

  const [filters, setFilters] = useState<VehiculosFilters>({
    search: '',
    status: [],
    seller: 'all',
    consigned: 'all',
    stockType: 'all',
    dealershipId: 'all',
  });
  const [defaultFilters, setDefaultFilters] = useState<VehiculosFilters | null>(null);
  const [searchInput, setSearchInput] = useState('');
  // Shared statuses store — fetched once and reused across components
  const { statuses: storeStatuses } = useStatuses();
  const statuses: Status[] = storeStatuses
    .filter((s) => !s.is_disabled)
    .map((s) => ({ id: s.id, name: s.name || '' }));
  const [sellers, setSellers] = useState<Seller[]>([]);
  const { dealerships } = useDealerships();
  // Solo las sedes que el usuario puede ver (si está restringido por rol/asignación,
  // sus sedes; si no, todas). El filtro por sede aparece con >=2 sedes visibles.
  const { isRestricted, assignedDealershipIds } = useActiveDealership();
  const visibleDealerships = useMemo(
    () =>
      isRestricted
        ? dealerships.filter((d) => assignedDealershipIds.includes(d.id))
        : dealerships,
    [dealerships, isRestricted, assignedDealershipIds]
  );
  const showDealershipFilter = visibleDealerships.length >= 2;
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // sync externos
  useEffect(() => {
    if (externalFilters) {
      setFilters(externalFilters);
      setSearchInput(externalFilters.search);
    }
  }, [externalFilters]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (filters.search !== searchInput) {
        const nf = { ...filters, search: searchInput };
        setFilters(nf);
        onFilterChange(nf);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Seed the default-filters baseline once we have any context (statuses
  // are now provided by the shared store, so no fetch is needed here).
  useEffect(() => {
    if (!clientId) return;
    // Default: status [] = "Todos" (no filter applied, shows all vehicles).
    // Only used as the "reset baseline" — DO NOT overwrite current filters
    // here, otherwise persisted sessionStorage filters get wiped on mount.
    setDefaultFilters({
      search: '',
      status: [] as string[],
      seller: 'all',
      consigned: 'all',
      stockType: 'all',
      dealershipId: 'all',
    });
  }, [clientId]);

  // fetch sellers (statuses come from the shared useStatuses store)
  useEffect(() => {
    const fetchFilterData = async () => {
      if (!clientId) return;
      setIsLoading(true);
      try {
        const { data: sellerData, error: sellerError } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .eq('client_id', clientId)
          .in('rol', ['seller', 'vendedor'])
          .order('first_name', { ascending: true });

        if (!sellerError) setSellers(sellerData || []);
      } catch (e) {
        console.error('Error fetching filter data:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFilterData();
    // Only re-fetch when clientId changes. `onFilterChange` is intentionally
    // omitted — including it caused remount-style behavior on each parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value);
  const handleClearSearch = () => { setSearchInput(''); const nf = { ...filters, search: '' }; setFilters(nf); onFilterChange(nf); };
  const handleStatusChange = (value: string[]) => { const nf = { ...filters, status: value }; setFilters(nf); onFilterChange(nf); };
  const handleSellerChange = (value: string) => { const nf = { ...filters, seller: value }; setFilters(nf); onFilterChange(nf); };
  const handleConsignedChange = (value: string) => { const nf = { ...filters, consigned: value }; setFilters(nf); onFilterChange(nf); };
  const handleRecentViewChange = (value: string) => {
    const recent: VehiculosFilters['recentView'] =
      value === 'sold' || value === 'consigned' || value === 'updated'
        ? value
        : undefined;
    // Cada vista pre-setea filtros aplicables: 'consigned' fija consigned='true';
    // 'sold' deja consigned='all' (el sort se encarga). 'updated' es sólo sort.
    const nf: VehiculosFilters = {
      ...filters,
      recentView: recent,
      ...(recent === 'consigned' ? { consigned: 'true' } : {}),
    };
    setFilters(nf);
    onFilterChange(nf);
  };

  const handleReset = () => {
    if (defaultFilters) {
      setFilters(defaultFilters);
      setSearchInput('');
      onFilterChange(defaultFilters);
    }
  };

  const hasActiveFilters = defaultFilters && (
    filters.search !== '' ||
    filters.seller !== defaultFilters.seller ||
    filters.consigned !== defaultFilters.consigned ||
    (filters.dealershipId && filters.dealershipId !== 'all') ||
    JSON.stringify(filters.status) !== JSON.stringify(defaultFilters.status)
  );

  const hasExtraFilters = defaultFilters && (
    filters.seller !== defaultFilters.seller ||
    filters.consigned !== defaultFilters.consigned ||
    (filters.dealershipId && filters.dealershipId !== 'all') ||
    Boolean(filters.recentView) ||
    JSON.stringify(filters.status) !== JSON.stringify(defaultFilters.status)
  );

  const statusOptions = statuses.map((s) => ({ value: String(s.id), label: s.name }));

  // Chips de filtros activos: se muestran junto al embudo para ver y quitar de
  // un vistazo lo que está aplicado, sin abrir el popover.
  const sellerName = (id: string) => {
    const s = sellers.find((x) => String(x.id) === String(id));
    return s ? `${s.first_name} ${s.last_name}`.trim() : 'Vendedor';
  };
  const statusName = (id: string) =>
    statuses.find((x) => String(x.id) === String(id))?.name || id;

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (defaultFilters) {
    (filters.status || []).forEach((id) => {
      activeChips.push({
        key: `status-${id}`,
        label: statusName(id),
        onRemove: () =>
          handleStatusChange((filters.status || []).filter((s) => s !== id)),
      });
    });
    if (
      filters.seller &&
      filters.seller !== defaultFilters.seller &&
      filters.seller !== 'all'
    ) {
      activeChips.push({
        key: 'seller',
        label: `Vendedor: ${sellerName(filters.seller)}`,
        onRemove: () => handleSellerChange(defaultFilters.seller),
      });
    }
    if (filters.consigned !== defaultFilters.consigned) {
      activeChips.push({
        key: 'consigned',
        label:
          filters.consigned === 'true'
            ? 'Consignados'
            : filters.consigned === 'false'
            ? 'Propios'
            : 'Consignación',
        onRemove: () => handleConsignedChange(defaultFilters.consigned),
      });
    }
    if (filters.dealershipId && filters.dealershipId !== 'all') {
      const d = visibleDealerships.find((x) => String(x.id) === String(filters.dealershipId));
      const dLabel = d ? d.name || d.address || `Sucursal ${d.id}` : 'Sucursal';
      activeChips.push({
        key: 'dealership',
        label: `Sede: ${dLabel}`,
        onRemove: () => {
          const nf = { ...filters, dealershipId: 'all' };
          setFilters(nf);
          onFilterChange(nf);
        },
      });
    }
    if (filters.recentView) {
      const recentLabel =
        filters.recentView === 'sold'
          ? 'Últimos vendidos'
          : filters.recentView === 'consigned'
          ? 'Últimos consignados'
          : 'Últimos actualizados';
      activeChips.push({
        key: 'recent',
        label: recentLabel,
        onRemove: () => handleRecentViewChange('none'),
      });
    }
  }

  return (
    <div className="w-full">
      {/* ===== MOBILE: search + filter toggle */}
      <div className="flex items-center gap-2 md:hidden">
        <div className={`flex items-center flex-1 px-3 ${INPUT_BASE}`}>
          <Search className="h-3.5 w-3.5 text-slate-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder={tCommon('vehicles.filters.searchPlaceholder')}
            className="outline-none border-none bg-transparent text-[13px] w-full font-normal text-slate-700 placeholder:text-slate-400"
            value={searchInput}
            onChange={handleSearchInputChange}
          />
          {searchInput && (
            <button onClick={handleClearSearch} className="ml-1 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="relative h-9 w-10 rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] flex items-center justify-center transition-colors"
          title="Filtros"
        >
          <Filter className="h-4 w-4 text-slate-500" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
          )}
        </button>
      </div>

      {/* ===== MOBILE: bottom sheet filter panel — arrastrable (Vaul) */}
      <Drawer open={showFilters} onOpenChange={setShowFilters}>
        <DrawerContent className="max-h-[85vh]">
          <div className="px-5 pb-3 pt-2">
            <p className="text-[15px] font-semibold text-slate-900">Filtros</p>
          </div>
          <div
            className="px-5 pb-4 space-y-3 overflow-y-auto"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            <InlineSelect
              label={tCommon('vehicles.filters.sellerAll')}
              value={filters.seller}
              options={[
                { value: 'all', label: tCommon('vehicles.filters.sellerAll') },
                ...sellers.map((s) => ({ value: String(s.id), label: `${s.first_name} ${s.last_name}` })),
              ]}
              onChange={handleSellerChange}
            />

            <InlineMultiSelect
              label={tCommon('vehicles.filters.statuses')}
              value={filters.status}
              options={statusOptions}
              onChange={handleStatusChange}
            />

            <InlineSelect
              label={tCommon('vehicles.filters.consignmentAll')}
              value={filters.consigned}
              options={[
                { value: 'all', label: tCommon('vehicles.filters.consignmentAll') },
                { value: 'true', label: tCommon('vehicles.filters.consignedOnly') },
                { value: 'false', label: tCommon('vehicles.filters.ownedOnly') },
              ]}
              onChange={handleConsignedChange}
            />

            {showDealershipFilter && (
              <InlineSelect
                label="Todas las sucursales"
                value={filters.dealershipId}
                options={[
                  { value: 'all', label: 'Todas las sucursales' },
                  ...visibleDealerships.map((d) => ({
                    value: String(d.id),
                    label: d.name || d.address || `Sucursal ${d.id}`,
                  })),
                ]}
                onChange={(val) => {
                  const nf = { ...filters, dealershipId: val };
                  setFilters(nf);
                  onFilterChange(nf);
                }}
              />
            )}

            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Restablecer
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* ===== DESKTOP: inline filter row */}
      <div className="hidden md:flex md:gap-2 md:items-center">
        {/* Search input */}
        <div className={`flex items-center flex-1 min-w-0 px-3 ${INPUT_BASE}`}>
          <Search className="h-3.5 w-3.5 text-slate-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            placeholder={tCommon('vehicles.filters.searchPlaceholder')}
            className="outline-none border-none bg-transparent text-[13px] w-full font-normal text-slate-700 placeholder:text-slate-400"
            value={searchInput}
            onChange={handleSearchInputChange}
          />
          {searchInput && (
            <button onClick={handleClearSearch} className="ml-1 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters popover (Recientes + Estados + Vendedor + Stock) */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`relative h-9 w-9 shrink-0 rounded-xl border bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] flex items-center justify-center transition-colors hover:bg-slate-50 ${
                hasExtraFilters ? 'border-primary/40' : 'border-slate-200/60'
              }`}
              title="Filtros"
            >
              <Filter className={`h-4 w-4 ${hasExtraFilters ? 'text-primary' : 'text-slate-500'}`} />
              {hasExtraFilters && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3 space-y-3">
            <p className="text-[12px] font-medium text-slate-400 uppercase tracking-wider">Filtros</p>

            {/* Atajo "Recientes": vendidos / consignados / modificados */}
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-slate-500">Recientes</label>
              <Select
                value={filters.recentView ?? 'none'}
                onValueChange={(v) => handleRecentViewChange(v === 'none' ? '' : v)}
              >
                <SelectTrigger
                  className={`w-full ${SELECT_TRIGGER} ${
                    filters.recentView ? 'border-primary/40 text-primary' : ''
                  }`}
                >
                  <SelectValue placeholder="— Sin filtro —" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="none">— Sin filtro —</SelectItem>
                  <SelectItem value="sold">Últimos vendidos</SelectItem>
                  <SelectItem value="consigned">Últimos consignados</SelectItem>
                  <SelectItem value="updated">Últimos modificados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status multiselect */}
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-slate-500">{tCommon('vehicles.filters.statuses')}</label>
              <MultiSelect
                options={statusOptions}
                value={filters.status}
                onValueChange={handleStatusChange}
                placeholder={tCommon('vehicles.filters.statuses')}
                className="w-full"
                triggerClassName={`w-full ${SELECT_TRIGGER}`}
                popoverClassName="z-[60]"
                itemClassName="text-[13px]"
              />
            </div>

            {/* Seller select */}
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-slate-500">{tCommon('vehicles.filters.sellerAll')}</label>
              <Select value={filters.seller} onValueChange={handleSellerChange}>
                <SelectTrigger className={`w-full ${SELECT_TRIGGER}`}>
                  <SelectValue placeholder={tCommon('vehicles.filters.sellerAll')} />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="all">{tCommon('vehicles.filters.sellerAll')}</SelectItem>
                  {sellers.map((seller) => (
                    <SelectItem key={seller.id} value={String(seller.id)}>
                      {seller.first_name} {seller.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Consignment select */}
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-slate-500">Stock</label>
              <Select value={filters.consigned} onValueChange={handleConsignedChange}>
                <SelectTrigger className={`w-full ${SELECT_TRIGGER}`}>
                  <SelectValue placeholder={tCommon('vehicles.filters.consignmentAll')} />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="all">{tCommon('vehicles.filters.consignmentAll')}</SelectItem>
                  <SelectItem value="true">{tCommon('vehicles.filters.consignedOnly')}</SelectItem>
                  <SelectItem value="false">{tCommon('vehicles.filters.ownedOnly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stock type (Online / Sucursal) */}
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-slate-500">Ubicación</label>
              <Select value={filters.stockType} onValueChange={(val) => {
                const updated = { ...filters, stockType: val };
                setFilters(updated);
                onFilterChange(updated);
              }}>
                <SelectTrigger className={`w-full ${SELECT_TRIGGER}`}>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="dealership">En sucursal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dealership selector — independiente de stock_type; se muestra cuando
                el usuario tiene >=2 sedes visibles. Solo lista sus sedes. */}
            {showDealershipFilter && (
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-slate-500">Sucursal</label>
                <Select value={filters.dealershipId} onValueChange={(val) => {
                  const updated = { ...filters, dealershipId: val };
                  setFilters(updated);
                  onFilterChange(updated);
                }}>
                  <SelectTrigger className={`w-full ${SELECT_TRIGGER}`}>
                    <SelectValue placeholder="Todas las sucursales" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="all">Todas las sucursales</SelectItem>
                    {visibleDealerships.map((d) => (
                      <SelectItem key={String(d.id)} value={String(d.id)}>
                        {d.name || d.address || `Sucursal ${d.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reset */}
            {hasExtraFilters && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[12px] text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors w-full"
              >
                <RotateCcw className="h-3 w-3" />
                Restablecer filtros
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default VehiculosFilter;
