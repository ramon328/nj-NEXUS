'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Chip,
  Input,
  Slider,
  Accordion,
  AccordionItem,
  CheckboxGroup,
  Checkbox,
} from '@heroui/react';
import { Icon } from '@iconify/react';
import useVehicleFiltersStore from '@/stores/useVehicleFiltersStore';

type VehicleFiltersType = Record<string, any>;

// -------- Traducción con fallback --------
function useTx() {
  const tx = (_key: string, fallback: string) => fallback;
  return { tx };
}

// --- helpers de seguridad para listas / strings / números ---
const safeList = <T,>(val: T[] | undefined | null): T[] => (Array.isArray(val) ? val : []);
const safeStr = (s: any) => (typeof s === 'string' ? s : '');
const isFiniteNum = (n: any) => typeof n === 'number' && Number.isFinite(n);

type IdName = {
  id: number | string;
  name: string;
  hex?: string;
  brand_id?: string | number;
  brand?: { id: any };
};

interface Props {
  brands?: IdName[];
  models?: IdName[];
  categories?: IdName[];
  fuelTypes?: IdName[];
  conditions?: IdName[];
  colors?: IdName[];
  availableYears?: (string | number)[];
  maxPrice?: number;
  initialOpenAccordion?: string;
  /** Color CTA hex o css-var (p.ej. "#FF5C00" o "var(--brand-color)") */
  ctaColor?: string;
  /** Si el panel está colapsado */
  isCollapsed?: boolean;
  /** Callback para colapsar/expandir */
  onToggleCollapse?: () => void;
  /** Theme colors for builder integration */
  panelBgColor?: string;
  panelBorderColor?: string;
  panelTextColor?: string;
  panelMutedColor?: string;
}

const NewVehicleFilters = ({
  brands,
  models,
  categories,
  fuelTypes,
  conditions,
  colors,
  availableYears = [],
  maxPrice = 1_000_000_000,
  initialOpenAccordion,
  ctaColor,
  isCollapsed,
  onToggleCollapse,
  panelBgColor,
  panelBorderColor,
  panelTextColor,
  panelMutedColor,
}: Props) => {
  const { tx } = useTx();
  const {
    filters,
    setFilters,
    priceRange,
    setPriceRange,
    clearFilters,
    sortOrder,
    searchQuery,
  } = useVehicleFiltersStore();

  // ===== LISTAS SEGURAS (evita undefined en plantillas "apagadas") =====
  const BRANDS = safeList(brands);
  const MODELS = safeList(models);
  const CATEGORIES = safeList(categories);
  const FUELTYPES = safeList(fuelTypes);
  const CONDITIONS = safeList(conditions);
  const COLORS = safeList(colors);
  const YEARS = safeList(availableYears as any[]);

  // ===== Textos =====
  const filtersTitle = tx('vehicles.filters.title', 'Filtros');
  const clearFiltersText = tx('vehicles.filters.clearFilters', 'Limpiar filtros');
  const priceLabel = tx('vehicles.filters.priceRange', 'Rango de precio');
  const minPriceText = tx('vehicles.filters.minPrice', 'Mínimo');
  const maxPriceText = tx('vehicles.filters.maxPrice', 'Máximo');

  const brandText = tx('vehicles.filters.brand', 'Marca');
  const modelText = tx('vehicles.filters.model', 'Modelo');
  const categoryText = tx('vehicles.filters.category', 'Categoría');
  const fuelText = tx('vehicles.filters.fuelType', 'Combustible');
  const conditionText = tx('vehicles.filters.condition', 'Condición');
  const colorText = tx('vehicles.filters.color', 'Color');
  const yearText = tx('vehicles.filters.year', 'Año');

  // -------- helpers base --------
  const asArray = (v?: string | string[]) => (Array.isArray(v) ? v : v ? [v] : []);
  const setMulti = (key: keyof VehicleFiltersType, next: string[]) => {
    const nf: VehicleFiltersType = { ...filters };
    if (!next.length) delete (nf as any)[key];
    else (nf as any)[key] = next;
    setFilters(nf);
  };
  const toggle = (arr: string[], id: string) =>
    arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  const getName = (list: IdName[], id: string) =>
    list.find((i) => String(i?.id) === String(id))?.name || String(id);

  const [openAccordion, setOpenAccordion] = useState<string | null>(initialOpenAccordion || null);

  // ====== priceRange seguro (por si llega undefined / NaN) ======
  const PR: [number, number] = useMemo(() => {
    const a = Array.isArray(priceRange) ? priceRange : [0, maxPrice];
    const min = isFiniteNum(a[0]) ? a[0] : 0;
    const max = isFiniteNum(a[1]) ? a[1] : maxPrice;
    const clampedMin = Math.max(0, Math.min(min, max));
    const clampedMax = Math.min(Math.max(max, clampedMin), maxPrice);
    return [clampedMin, clampedMax];
  }, [priceRange, maxPrice]);

  // input precio controlado
  const [minInput, setMinInput] = useState<string>('0');
  const [maxInput, setMaxInput] = useState<string>(`${maxPrice}`);
  useEffect(() => {
    setMinInput(String(PR[0] || 0));
    setMaxInput(String(PR[1] || maxPrice));
  }, [PR, maxPrice]);

  const formatCLP = (n: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(isFinite(n) ? n : 0);
  const parseNumber = (s: string) => Number((s || '0').replace(/\D/g, '')) || 0;

  const commitMin = () => {
    const v = parseNumber(minInput);
    const clamped = Math.max(0, Math.min(v, PR[1]));
    setPriceRange([clamped, PR[1]]);
    setMinInput(String(clamped));
  };
  const commitMax = () => {
    const v = parseNumber(maxInput || `${maxPrice}`);
    const clamped = Math.min(Math.max(v, PR[0]), maxPrice);
    setPriceRange([PR[0], clamped]);
    setMaxInput(String(clamped));
  };
  const resetPrice = () => {
    setPriceRange([0, maxPrice]);
    setMinInput('0');
    setMaxInput(`${maxPrice}`);
  };

  // modelos dependientes de marca si hay relación brand_id o model.brand.id
  const selectedBrandIds = asArray(filters.brand);
  const filteredModels: IdName[] = useMemo(() => {
    if (!selectedBrandIds.length) return MODELS;
    const set = new Set(selectedBrandIds.map(String));
    return MODELS.filter((m: any) => {
      const byField = m?.brand_id?.toString && set.has(String(m.brand_id));
      const byObj = m?.brand?.id?.toString && set.has(String(m.brand.id));
      return byField || byObj;
    });
  }, [MODELS, selectedBrandIds]);

  // contador filtros activos
  const activeFiltersCount =
    Object.values(filters).reduce((acc, v) => acc + (Array.isArray(v) ? v.length : v ? 1 : 0), 0) +
    (PR[0] > 0 || PR[1] < maxPrice ? 1 : 0) +
    (sortOrder !== 'date_desc' ? 1 : 0) +
    (safeStr(searchQuery).trim() !== '' ? 1 : 0);

  // presets precio (por si los usas después)
  const pricePresets: { label: string; range: [number, number] }[] = [
    { label: '≤ $10M', range: [0, Math.min(10_000_000, maxPrice)] },
    { label: '≤ $20M', range: [0, Math.min(20_000_000, maxPrice)] },
    { label: '$20M–$35M', range: [20_000_000, Math.min(35_000_000, maxPrice)] },
  ];

  // búsquedas locales para listas largas
  const [brandQuery, setBrandQuery] = useState('');
  const [modelQuery, setModelQuery] = useState('');

  const CTA = ctaColor || undefined;

  // Detect if panel is dark to flip HeroUI component colors
  const isPanelDark = (() => {
    if (!panelBgColor) return false;
    const c = panelBgColor.replace('#', '');
    if (c.length !== 6) return false;
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b < 0.4;
  })();

  return (
    <div
      className={`w-full rounded-2xl overflow-hidden shadow-sm ${isPanelDark ? 'dark' : ''}`}
      style={{
        backgroundColor: panelBgColor || undefined,
        border: panelBorderColor ? `1px solid ${panelBorderColor}` : undefined,
        color: panelTextColor || undefined,
      }}
    >
      {/* HEADER */}
      <div className="px-4 py-3" style={{ borderBottom: panelBorderColor ? `1px solid ${panelBorderColor}` : '1px solid #f1f5f9' }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 rounded-lg transition-colors"
                aria-label={isCollapsed ? 'Expandir filtros' : 'Colapsar filtros'}
              >
                <Icon
                  icon="mdi:chevron-left"
                  className={`text-xl transition-transform duration-300 ${
                    isCollapsed ? 'rotate-180' : 'rotate-0'
                  }`}
                  style={{ color: panelMutedColor || '#6b7280' }}
                />
              </button>
            )}
            <Icon icon="solar:filter-linear" className="text-xl" style={CTA ? { color: CTA } : undefined} />
            <h3 className="text-base font-semibold" style={{ color: panelTextColor || '#111827' }}>{filtersTitle}</h3>
            {activeFiltersCount > 0 && (
              <Chip size="sm" color="primary" variant="flat">
                {activeFiltersCount}
              </Chip>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <Button
              size="sm"
              variant="light"
              color="danger"
              onPress={() => clearFilters(maxPrice)}
              className="text-[13px] h-7 px-2"
              startContent={<Icon icon="mdi:filter-remove-outline" className="text-base" />}
            >
              {clearFiltersText}
            </Button>
          )}
        </div>
      </div>

      {/* CONTENIDO con altura máxima + scroll interno */}
      <div className="max-h-[78vh] overflow-y-auto px-1 pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <Accordion
          selectionMode="single"
          selectedKeys={openAccordion ? [openAccordion] : []}
          onSelectionChange={(keys) => {
            const selectedKey = Array.from(keys)[0]?.toString() || null;
            setOpenAccordion(selectedKey);
          }}
        >
          {/* PRECIO */}
          <AccordionItem
            key="price"
            aria-label={priceLabel}
            startContent={<Icon icon="mdi:cash" className="text-xl" style={CTA ? { color: CTA } : undefined} />}
            title={
              <div className="flex flex-col items-start">
                <div className="font-medium">{priceLabel}</div>
                {(PR[0] > 0 || PR[1] < maxPrice) && (
                  <Chip size="sm" color="primary" variant="flat" className="h-5 mt-1" onClose={resetPrice}>
                    {`${formatCLP(PR[0])} – ${formatCLP(PR[1])}`}
                  </Chip>
                )}
              </div>
            }
            classNames={{
              heading: 'px-2 py-2 hover:opacity-80',
              content: 'px-3 py-3',
            }}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-2">
                <Input
                  type="text"
                  size="sm"
                  inputMode="numeric"
                  placeholder={minPriceText}
                  value={minInput}
                  onChange={(e) => setMinInput(e.target.value.replace(/\D/g, ''))}
                  onBlur={commitMin}
                  onKeyDown={(e) => e.key === 'Enter' && commitMin()}
                  startContent={<span className="text-xs">$</span>}
                  className="w-full text-xs"
                  classNames={{ input: 'text-xs', inputWrapper: 'h-9' }}
                />
                <span className="text-xs" style={{ color: panelMutedColor || '#9ca3af' }}>–</span>
                <Input
                  type="text"
                  size="sm"
                  inputMode="numeric"
                  placeholder={maxPriceText}
                  value={maxInput}
                  onChange={(e) => setMaxInput(e.target.value.replace(/\D/g, ''))}
                  onBlur={commitMax}
                  onKeyDown={(e) => e.key === 'Enter' && commitMax()}
                  startContent={<span className="text-xs">$</span>}
                  className="w-full text-xs"
                  classNames={{ input: 'text-xs', inputWrapper: 'h-9' }}
                />
              </div>

              <div className="px-1">
                <Slider
                  value={[PR[0], PR[1]] as [number, number]}
                  onChange={(value) => {
                    const [min, max] = value as [number, number];
                    // Clamp contra maxPrice por si el sitio trae valores out-of-range al reactivarse
                    const nextMin = Math.max(0, Math.min(min, max, maxPrice));
                    const nextMax = Math.max(nextMin, Math.min(max, maxPrice));
                    setPriceRange([nextMin, nextMax]);
                    setMinInput(String(nextMin));
                    setMaxInput(String(nextMax));
                  }}
                  minValue={0}
                  maxValue={maxPrice}
                  step={1_000_000}
                  size="sm"
                  className="max-w-full"
                  classNames={{
                    track: '',
                    thumb: 'h-3 w-3',
                  }}
                  style={CTA ? ({ '--slider-filler-bg': CTA } as React.CSSProperties) : undefined}
                  aria-label="Rango de precio"
                />
                <div className="flex justify-between mt-1 text-[10px]" style={{ color: panelMutedColor || '#6b7280' }}>
                  <span>{formatCLP(PR[0])}</span>
                  <span>{formatCLP(PR[1])}</span>
                </div>
              </div>
            </div>
          </AccordionItem>

          {/* MARCA (checkbox + buscador) */}
          <AccordionItem
            key="brand"
            aria-label={brandText}
            startContent={<Icon icon="mdi:car-estate" className="text-xl" style={CTA ? { color: CTA } : undefined} />}
            title={<div className="flex items-center gap-2">{brandText}</div>}
            classNames={{ heading: 'px-2 py-2 text-nowrap hover:opacity-80', content: 'px-3 py-3' }}
          >
            <Input
              aria-label="Buscar marca"
              placeholder="Buscar marca…"
              size="sm"
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              className="mb-2"
            />
            <CheckboxGroup
              value={asArray(filters.brand)}
              onChange={(val) => setMulti('brand', (val as string[]) ?? [])}
              className="grid grid-cols-1 gap-1.5"
            >
              {BRANDS
                .filter((b) => safeStr(b?.name).toLowerCase().includes(brandQuery.toLowerCase()))
                .map((b) => {
                  const id = String(b.id);
                  return (
                    <Checkbox
                      key={`brand-${id}`}
                      value={id}
                      classNames={{
                        wrapper: 'rounded-md',
                        label: 'text-sm',
                      }}
                    >
                      {b?.name ?? id}
                    </Checkbox>
                  );
                })}
            </CheckboxGroup>

            {asArray(filters.brand).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {asArray(filters.brand).map((id) => (
                  <Chip
                    key={`brand-chip-${id}`}
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClose={() => setMulti('brand', asArray(filters.brand).filter((x) => x !== String(id)))}
                  >
                    {getName(BRANDS, String(id))}
                  </Chip>
                ))}
              </div>
            )}
          </AccordionItem>

          {/* MODELO (checkbox + buscador, dependiente de marca) */}
          <AccordionItem
            key="model"
            aria-label={modelText}
            startContent={<Icon icon="mdi:clipboard-text-outline" className="text-xl" style={CTA ? { color: CTA } : undefined} />}
            title={<div className="flex text-nowrap items-center gap-2">{modelText}</div>}
            classNames={{ heading: 'px-2 py-2 hover:opacity-80', content: 'px-3 py-3' }}
          >
            <Input
              aria-label="Buscar modelo"
              placeholder="Buscar modelo…"
              size="sm"
              value={modelQuery}
              onChange={(e) => setModelQuery(e.target.value)}
              className="mb-2"
            />
            <CheckboxGroup
              value={asArray(filters.model)}
              onChange={(val) => setMulti('model', (val as string[]) ?? [])}
              className="grid grid-cols-1 gap-1.5"
            >
              {filteredModels
                .filter((m) => safeStr(m?.name).toLowerCase().includes(modelQuery.toLowerCase()))
                .map((m) => {
                  const id = String(m.id);
                  return (
                    <Checkbox key={`model-${id}`} value={id} classNames={{ wrapper: 'rounded-md', label: 'text-sm' }}>
                      {m?.name ?? id}
                    </Checkbox>
                  );
                })}
            </CheckboxGroup>

            {asArray(filters.model).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {asArray(filters.model).map((id) => (
                  <Chip
                    key={`model-chip-${id}`}
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClose={() => setMulti('model', asArray(filters.model).filter((x) => x !== String(id)))}
                  >
                    {getName(MODELS, String(id))}
                  </Chip>
                ))}
              </div>
            )}
          </AccordionItem>

          {/* CATEGORÍA (checkbox grid) */}
          <AccordionItem
            key="category"
            aria-label={categoryText}
            startContent={<Icon icon="mdi:car-side" className="text-xl" style={CTA ? { color: CTA } : undefined} />}
            title={<div className="flex  items-center gap-2">{categoryText}</div>}
            classNames={{ heading: 'px-2 py-2 hover:opacity-80', content: 'px-3 py-3 text-nowrap' }}
          >
            <CheckboxGroup
              value={asArray(filters.category)}
              onChange={(val) => setMulti('category', (val as string[]) ?? [])}
              className="grid grid-cols-2 gap-1.5"
            >
              {CATEGORIES.map((c) => {
                const id = String(c.id);
                return (
                  <Checkbox key={`cat-${id}`} value={id} classNames={{ wrapper: 'rounded-md', label: 'text-sm' }}>
                    {c?.name ?? id}
                  </Checkbox>
                );
              })}
            </CheckboxGroup>

            {asArray(filters.category).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {asArray(filters.category).map((id) => (
                  <Chip
                    key={`cat-chip-${id}`}
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClose={() => setMulti('category', asArray(filters.category).filter((x) => x !== String(id)))}
                  >
                    {getName(CATEGORIES, String(id))}
                  </Chip>
                ))}
              </div>
            )}
          </AccordionItem>

          {/* COMBUSTIBLE (checkbox grid) */}
          <AccordionItem
            key="fuel_type"
            aria-label={fuelText}
            startContent={<Icon icon="mdi:gas-station" className="text-xl" style={CTA ? { color: CTA } : undefined} />}
            title={<div className="flex items-center gap-2">{fuelText}</div>}
            classNames={{ heading: 'px-2 py-2 hover:opacity-80', content: 'px-3 py-3' }}
          >
            <CheckboxGroup
              value={asArray(filters.fuel_type)}
              onChange={(val) => setMulti('fuel_type', (val as string[]) ?? [])}
              className="grid grid-cols-2 gap-1.5"
            >
              {FUELTYPES.map((f) => {
                const id = String(f.id);
                return (
                  <Checkbox key={`fuel-${id}`} value={id} classNames={{ wrapper: 'rounded-md', label: 'text-sm' }}>
                    {f?.name ?? id}
                  </Checkbox>
                );
              })}
            </CheckboxGroup>

            {asArray(filters.fuel_type).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {asArray(filters.fuel_type).map((id) => (
                  <Chip
                    key={`fuel-chip-${id}`}
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClose={() => setMulti('fuel_type', asArray(filters.fuel_type).filter((x) => x !== String(id)))}
                  >
                    {getName(FUELTYPES, String(id))}
                  </Chip>
                ))}
              </div>
            )}
          </AccordionItem>

          {/* AÑO (checkbox grid) */}
          <AccordionItem
            key="year"
            aria-label={yearText}
            startContent={<Icon icon="mdi:calendar" className="text-xl" style={CTA ? { color: CTA } : undefined} />}
            title={<div className="flex items-center gap-2">{yearText}</div>}
            classNames={{ heading: 'px-2 py-2 hover:opacity-80', content: 'px-3 py-3' }}
          >
            <CheckboxGroup
              value={asArray(filters.year)}
              onChange={(val) => setMulti('year', (val as string[]) ?? [])}
              className="grid grid-cols-3 gap-1.5"
            >
              {YEARS.map((y) => {
                const id = String(y);
                return (
                  <Checkbox key={`year-${id}`} value={id} classNames={{ wrapper: 'rounded-md', label: 'text-sm' }}>
                    {id}
                  </Checkbox>
                );
              })}
            </CheckboxGroup>

            {asArray(filters.year).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {asArray(filters.year).map((id) => (
                  <Chip
                    key={`year-chip-${id}`}
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClose={() => setMulti('year', asArray(filters.year).filter((x) => x !== String(id)))}
                  >
                    {String(id)}
                  </Chip>
                ))}
              </div>
            )}
          </AccordionItem>

          {/* CONDICIÓN (checkbox grid) */}
          <AccordionItem
            key="condition"
            aria-label={conditionText}
            startContent={<Icon icon="mdi:car-info" className="text-xl" style={CTA ? { color: CTA } : undefined} />}
            title={<div className="flex items-center gap-2">{conditionText}</div>}
            classNames={{ heading: 'px-2 py-2 hover:opacity-80', content: 'px-3 py-3 text-nowrap' }}
          >
            <CheckboxGroup
              value={asArray(filters.condition)}
              onChange={(val) => setMulti('condition', (val as string[]) ?? [])}
              className="grid grid-cols-2 gap-1.5"
            >
              {CONDITIONS.map((c) => {
                const id = String(c.id);
                return (
                  <Checkbox key={`cond-${id}`} value={id} classNames={{ wrapper: 'rounded-md', label: 'text-sm' }}>
                    {c?.name ?? id}
                  </Checkbox>
                );
              })}
            </CheckboxGroup>

            {asArray(filters.condition).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {asArray(filters.condition).map((id) => (
                  <Chip
                    key={`cond-chip-${id}`}
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClose={() => setMulti('condition', asArray(filters.condition).filter((x) => x !== String(id)))}
                  >
                    {getName(CONDITIONS, String(id))}
                  </Chip>
                ))}
              </div>
            )}
          </AccordionItem>

          {/* COLOR (checkbox con swatch) */}
          <AccordionItem
            key="color"
            aria-label={colorText}
            startContent={<Icon icon="mdi:palette" className="text-xl" style={CTA ? { color: CTA } : undefined} />}
            title={<div className="flex items-center gap-2">{colorText}</div>}
            classNames={{ heading: 'px-2 py-2 hover:opacity-80', content: 'px-3 py-3 ' }}
          >
            <CheckboxGroup
              value={asArray(filters.color)}
              onChange={(val) => setMulti('color', (val as string[]) ?? [])}
              className="grid grid-cols-2 gap-1.5"
            >
              {COLORS.map((c) => {
                const id = String(c.id);
                return (
                  <Checkbox
                    key={`color-${id}`}
                    value={id}
                    classNames={{ wrapper: 'rounded-md', label: 'text-sm flex items-center gap-2' }}
                  >
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-full border border-white/20"
                      style={{ backgroundColor: c?.hex }}
                    />
                    {c?.name ?? id}
                  </Checkbox>
                );
              })}
            </CheckboxGroup>

            {asArray(filters.color).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {asArray(filters.color).map((id) => (
                  <Chip
                    key={`color-chip-${id}`}
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClose={() => setMulti('color', asArray(filters.color).filter((x) => x !== String(id)))}
                  >
                    {getName(COLORS, String(id))}
                  </Chip>
                ))}
              </div>
            )}
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};

export default NewVehicleFilters;
