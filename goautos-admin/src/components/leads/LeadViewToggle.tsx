import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Columns3, List, Plus, ChevronDown, Check, Search, X, ShoppingCart, Tag, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { LeadTypes } from '@/types/leads';
import { TabType, ViewMode } from './leadConstants';

const BUY_TYPE_OPTIONS = [
  { value: LeadTypes.BUY_DIRECT, key: 'types.buyDirect' },
  { value: LeadTypes.BUY_CONSIGNMENT, key: 'types.buyConsignment' },
  { value: LeadTypes.SEARCH_REQUEST, key: 'types.searchRequest' },
];

const SELL_TYPE_OPTIONS = [
  { value: LeadTypes.SELL_VEHICLE, key: 'types.sellVehicle' },
  { value: LeadTypes.SELL_FINANCING, key: 'types.sellFinancing' },
  { value: LeadTypes.SELL_TRANSFER, key: 'types.sellTransfer' },
  { value: LeadTypes.CONTACT_GENERAL, key: 'types.contactGeneral' },
];

// Filtro por origen del lead. ChileAutos = los que entran por su webhook;
// "Otros" = web/manual/etc. (no hay marcador confiable para separarlos acá).
const ORIGIN_OPTIONS = [
  { value: 'all', label: 'Todos los orígenes' },
  { value: 'chileautos', label: 'ChileAutos' },
  { value: 'other', label: 'Otros' },
];

interface LeadViewToggleProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  buyCount: number;
  sellCount: number;
  selectedType: string;
  onTypeChange: (value: string) => void;
  selectedOrigin: string;
  onOriginChange: (value: string) => void;
  onCreateLead: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  /** Exportar a Excel la vista actual de leads. Si no se pasa, no se muestra el botón. */
  onExport?: () => void;
  canExport?: boolean;
  isExporting?: boolean;
}

export default function LeadViewToggle({
  activeTab,
  onTabChange,
  viewMode,
  onViewModeChange,
  buyCount,
  sellCount,
  selectedType,
  onTypeChange,
  selectedOrigin,
  onOriginChange,
  onCreateLead,
  search = '',
  onSearchChange,
  onExport,
  canExport = false,
  isExporting = false,
}: LeadViewToggleProps) {
  const { t } = useTranslation('leadsPage');
  const [typeDrawerOpen, setTypeDrawerOpen] = useState(false);

  const tabs: { key: TabType; label: string; count: number; icon: typeof ShoppingCart }[] = [
    { key: 'buy', label: t('tabs.buy'), count: buyCount, icon: ShoppingCart },
    { key: 'sell', label: t('tabs.sell'), count: sellCount, icon: Tag },
  ];

  const typeOptions = activeTab === 'buy' ? BUY_TYPE_OPTIONS : SELL_TYPE_OPTIONS;
  const allOptions = [{ value: 'all', key: 'filters.typeAll' }, ...typeOptions];
  const selectedLabel = selectedType === 'all'
    ? t('filters.typeAll')
    : t(typeOptions.find((o) => o.value === selectedType)?.key || 'filters.typeAll');
  const originLabel = ORIGIN_OPTIONS.find((o) => o.value === selectedOrigin)?.label || ORIGIN_OPTIONS[0].label;
  const hasFilters = selectedType !== 'all' || selectedOrigin !== 'all';

  return (
    <div className="w-full flex flex-col gap-2 md:gap-0">
      {/* Single row on desktop: tabs | search | view toggle | type | add */}
      <div className="w-full flex items-center gap-2">
        {/* Buy/Sell tabs */}
        <div className="flex flex-nowrap gap-1.5 shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                    : 'hover:bg-slate-200/60 text-slate-600'
                }`}
              >
                <TabIcon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
                <span className={`text-[11px] ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right-aligned controls */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          {/* Desktop search */}
          {onSearchChange && (
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('filters.searchPlaceholder')}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-white border border-slate-200/60 text-[13px] text-slate-500 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 transition-all shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]"
              />
              {search && (
                <button onClick={() => onSearchChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
          )}

          {/* Segmented control — icons only */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => onViewModeChange('kanban')}
              className={`
                flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200
                ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <Columns3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`
                flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200
                ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
              `}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Type filter — desktop: dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  flex items-center gap-1 px-2.5 h-9 rounded-xl border text-[12px] font-medium transition-all
                  ${selectedType !== 'all'
                    ? 'bg-sky-50 border-sky-200 text-sky-700'
                    : 'bg-white border-slate-200/60 text-slate-500 hover:text-slate-700'
                  }
                `}
              >
                <span className="truncate max-w-[120px]">{selectedLabel}</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">{t('filters.typeLabel', 'Tipo')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allOptions.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={opt.value === selectedType}
                  onCheckedChange={() => onTypeChange(opt.value)}
                >
                  {t(opt.key)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Origin filter — desktop: dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  flex items-center gap-1 px-2.5 h-9 rounded-xl border text-[12px] font-medium transition-all
                  ${selectedOrigin !== 'all'
                    ? 'bg-orange-50 border-orange-200 text-orange-700'
                    : 'bg-white border-slate-200/60 text-slate-500 hover:text-slate-700'
                  }
                `}
              >
                <span className="truncate max-w-[120px]">{selectedOrigin === 'all' ? 'Origen' : originLabel}</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">Origen</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ORIGIN_OPTIONS.map((opt) => (
                <DropdownMenuCheckboxItem
                  key={opt.value}
                  checked={opt.value === selectedOrigin}
                  onCheckedChange={() => onOriginChange(opt.value)}
                >
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {canExport && onExport && (
            <Button
              onClick={onExport}
              disabled={isExporting}
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-xl h-9 text-[12px] font-medium shrink-0"
              title={t('buttons.exportLeads', 'Exportar a Excel')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('buttons.exportLeads', 'Exportar')}</span>
            </Button>
          )}

          <Button onClick={onCreateLead} size="sm" className="gap-1.5 rounded-xl h-9 text-[12px] font-medium bg-sky-400 hover:bg-sky-500 shrink-0">
            <Plus className="w-3.5 h-3.5" />
            <span>{t('buttons.addLead')}</span>
          </Button>
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2 ml-auto">
          {canExport && onExport && (
            <Button
              onClick={onExport}
              disabled={isExporting}
              variant="outline"
              size="sm"
              className="rounded-xl h-8 px-2.5 shrink-0"
              title={t('buttons.exportLeads', 'Exportar a Excel')}
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
          )}

          <button
            onClick={() => setTypeDrawerOpen(true)}
            className={`
              flex items-center gap-1 px-2.5 h-8 rounded-xl border text-[12px] font-medium transition-all
              ${hasFilters
                ? 'bg-sky-50 border-sky-200 text-sky-700'
                : 'bg-white border-slate-200/60 text-slate-500 hover:text-slate-700'
              }
            `}
          >
            <span className="truncate max-w-[80px]">Filtros</span>
            <ChevronDown className="w-3 h-3 flex-shrink-0" />
          </button>

          <Button onClick={onCreateLead} size="sm" className="gap-1.5 rounded-xl h-8 text-[12px] font-medium bg-sky-400 hover:bg-sky-500 shrink-0">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('buttons.addLead')}</span>
          </Button>
        </div>
      </div>

      {/* Mobile view toggle */}
      <div className="flex md:hidden items-center gap-2">
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('kanban')}
            className={`
              flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200
              ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
            `}
          >
            <Columns3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('table')}
            className={`
              flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200
              ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}
            `}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters drawer — mobile only (tipo + origen) */}
      <Drawer open={typeDrawerOpen} onOpenChange={setTypeDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="px-5 pb-2 pt-2">
            <p className="text-[15px] font-semibold text-slate-900">Filtros</p>
          </div>
          <div
            className="px-5 pb-4 space-y-4 overflow-y-auto"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            {/* Tipo */}
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide px-1">{t('filters.typeLabel', 'Tipo')}</p>
              {allOptions.map((opt) => {
                const isActive = opt.value === selectedType;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onTypeChange(opt.value)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] transition-colors ${
                      isActive ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600 active:bg-slate-50'
                    }`}
                  >
                    <span className="flex-1 text-left">{t(opt.key)}</span>
                    {isActive && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Origen */}
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide px-1">Origen</p>
              {ORIGIN_OPTIONS.map((opt) => {
                const isActive = opt.value === selectedOrigin;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onOriginChange(opt.value)}
                    className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] transition-colors ${
                      isActive ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600 active:bg-slate-50'
                    }`}
                  >
                    <span className="flex-1 text-left">{opt.label}</span>
                    {isActive && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <Button onClick={() => setTypeDrawerOpen(false)} className="w-full rounded-xl h-10 text-[13px] bg-sky-400 hover:bg-sky-500">
              Listo
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
