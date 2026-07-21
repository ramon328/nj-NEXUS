// TraditionalVehicleGrid — exact clone of website-gocar NewVehiclesSection (minimal mode)
// Changes from website: HeroUI → native HTML, stores → supabase direct, i18n → hardcoded ES

import React, { useEffect, useState, useMemo } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { supabase } from '@/integrations/supabase/client';
import { DeleteButton } from '../../DeleteButton';
import { Calendar, Gauge, Settings, Fuel, Car } from 'lucide-react';
import { Icon } from '@iconify/react';
import {
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
} from '@heroui/react';
import {
  Drawer as VaulDrawer,
  DrawerContent as VaulDrawerContent,
  DrawerHeader as VaulDrawerHeader,
  DrawerTitle as VaulDrawerTitle,
} from '@/components/ui/drawer';
import NewVehicleFilters from './NewVehicleFilters';
import useVehicleFiltersStore from '@/stores/useVehicleFiltersStore';

// ── hex to HSL for CSS variable override ──
function hexToHsl(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// ── Helpers — copied from website ──
const normalizeFuel = (name?: string) => {
  const k = (name ?? '').trim().toLowerCase();
  if (['gasoline', 'gasolina', 'bencina', 'nafta'].includes(k)) return 'Gasolina';
  if (['diesel', 'diésel'].includes(k)) return 'Diésel';
  if (['hybrid', 'híbrido', 'hibrido'].includes(k)) return 'Híbrido';
  if (['electric', 'eléctrico', 'electrico'].includes(k)) return 'Eléctrico';
  return name || '—';
};

const normalizeTrans = (name?: string) => {
  const k = (name ?? '').trim().toLowerCase();
  if (['manual', 'mecánica', 'mecanica'].includes(k)) return 'Manual';
  if (['automatic', 'automática', 'automatica', 'auto'].includes(k)) return 'Automática';
  if (['cvt'].includes(k)) return 'CVT';
  return name || '—';
};

const formatPrice = (price?: number) => {
  if (!price) return 'Consultar';
  return `$${price.toLocaleString('es-CL')}`;
};

// ── Tag — copied from website VehicleVerticalCard ──
const Tag = ({ text, primary = false }: { text: string; primary?: boolean }) => (
  <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide whitespace-nowrap ${
    primary ? 'bg-neutral-900 text-white' : 'bg-white/90 text-neutral-700'
  }`}>
    {text}
  </span>
);

// ── Vehicle Card — copied from website VehicleVerticalCard ──
// HeroUI Card/CardBody/CardFooter → plain divs with same classes
const VehicleCard = ({ vehicle, primaryColor, cardBgColor, cardBorderColor, cardTitleColor, cardSubtitleColor, cardSpecsColor, cardPriceColor, cardTitleField = 'model' }: {
  vehicle: any; primaryColor: string;
  cardBgColor: string; cardBorderColor: string; cardTitleColor: string;
  cardSubtitleColor: string; cardSpecsColor: string; cardPriceColor: string;
  cardTitleField?: 'model' | 'brand' | 'brand_model';
}) => {
  const status = (vehicle.status?.name || '').trim().toLowerCase();
  const isSold = status === 'vendido';
  const isReserved = status === 'reservado';
  const isUnavailable = isSold || isReserved;

  const promoBadgeText = vehicle.label || undefined;

  const discountedPrice =
    vehicle.discount_percentage && vehicle.discount_percentage > 0 && vehicle.price
      ? vehicle.price * (1 - vehicle.discount_percentage / 100)
      : null;

  const mileageText = typeof vehicle.mileage === 'number' ? `${vehicle.mileage.toLocaleString('es-CL')} km` : '—';
  const transLabel = normalizeTrans(vehicle.transmission);
  const fuelLabel = normalizeFuel(vehicle.fuel_type?.name);

  const specs = [
    { icon: <Gauge size={16} className='opacity-80' />, text: mileageText },
    { icon: <Calendar size={16} className='opacity-80' />, text: vehicle.year ? String(vehicle.year) : '—' },
    { icon: <Settings size={16} className='opacity-80' />, text: transLabel },
    { icon: <Fuel size={16} className='opacity-80' />, text: fuelLabel },
  ];

  const conditionText = vehicle.condition?.name
    ? vehicle.condition.name.charAt(0).toUpperCase() + vehicle.condition.name.slice(1).toLowerCase()
    : undefined;

  let leftChips: string[] = [];
  if (conditionText) leftChips.push(conditionText);

  return (
    <div className={`group h-full ${!isUnavailable ? 'cursor-pointer' : 'cursor-default'}`}>
      {/* Card — same classes as website HeroUI Card */}
      <div className={`h-full flex flex-col overflow-hidden rounded-2xl shadow-sm transition-all duration-300 ${
        isUnavailable ? 'opacity-90' : 'group-hover:shadow-xl group-hover:-translate-y-2'
      }`} style={{ backgroundColor: cardBgColor, borderWidth: 1, borderStyle: 'solid', borderColor: cardBorderColor }}>
        <div className='relative w-full aspect-[16/9] overflow-hidden bg-black'>
          {vehicle.main_image ? (
            <div className='absolute inset-0 bg-center bg-cover' style={{ backgroundImage: `url(${vehicle.main_image})` }} />
          ) : (
            <div className='absolute inset-0 grid place-items-center' style={{ backgroundColor: cardBorderColor }}>
              <Car size={48} style={{ color: cardSubtitleColor }} />
            </div>
          )}
          {isSold && (
            <div className='absolute top-0 right-0 h-[200px] w-[200px] overflow-hidden z-20'>
              <div className='absolute top-[30px] right-[-50px] bg-rose-600 text-white font-bold py-2 w-[250px] text-center rotate-45'>VENDIDO</div>
            </div>
          )}
          {isReserved && (
            <div className='absolute top-0 right-0 h-[200px] w-[200px] overflow-hidden z-20'>
              <div className='absolute top-[30px] right-[-50px] bg-amber-400 text-black font-bold py-2 w-[250px] text-center rotate-45'>RESERVADO</div>
            </div>
          )}
          {(promoBadgeText || leftChips.length > 0) && (
            <div className='absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-start gap-1.5'>
              {promoBadgeText && <Tag text={promoBadgeText} primary />}
              {leftChips.map((txt, i) => <Tag key={i} text={txt} />)}
            </div>
          )}
        </div>

        {/* CardBody */}
        <div className='flex-1 px-5 pt-4 pb-2'>
          <h3 className='text-[20px] font-semibold tracking-tight' style={{ color: cardTitleColor }}>
            {cardTitleField === 'brand_model'
              ? `${vehicle.brand?.name ?? 'Marca'} ${vehicle.model?.name ?? ''}`.trim()
              : cardTitleField === 'brand'
                ? (vehicle.brand?.name ?? 'Marca')
                : (vehicle.model?.name ?? 'Modelo')}
          </h3>
          <p className='mt-0.5 text-sm' style={{ color: cardSubtitleColor }}>
            {cardTitleField === 'brand_model'
              ? (vehicle.year ?? '')
              : `${cardTitleField === 'brand' ? vehicle.model?.name : vehicle.brand?.name} ${vehicle.year ?? ''}`}
          </p>
          <div className='mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-[13px]' style={{ color: cardSpecsColor }}>
            {specs.map((s, i) => (
              <div key={i} className='flex items-center gap-1.5 min-w-0'>
                {s.icon}
                <span className='truncate'>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CardFooter */}
        <div className='px-5 pb-5 pt-3'>
          <div className='w-full flex items-end justify-between'>
            <div className='flex flex-col'>
              {discountedPrice ? (
                <>
                  <span className='text-sm line-through' style={{ color: cardSubtitleColor }}>{formatPrice(vehicle.price)}</span>
                  <span className='text-2xl font-extrabold tracking-tight' style={{ color: primaryColor }}>{formatPrice(discountedPrice)}</span>
                </>
              ) : (
                <span className='text-2xl font-extrabold tracking-tight' style={{ color: cardPriceColor }}>{formatPrice(vehicle.price)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Skeleton — copied from website VehicleCardSkeleton ──
const SkeletonCard = ({ bg, border }: { bg: string; border: string }) => (
  <div className='rounded-2xl overflow-hidden shadow-sm' style={{ backgroundColor: bg, border: `1px solid ${border}` }}>
    <div className='aspect-[16/9] animate-pulse' style={{ backgroundColor: `${border}` }} />
    <div className='px-5 pt-4 pb-2 space-y-3'>
      <div className='h-5 w-3/4 rounded animate-pulse' style={{ backgroundColor: border }} />
      <div className='h-4 w-1/2 rounded animate-pulse' style={{ backgroundColor: border, opacity: 0.6 }} />
      <div className='grid grid-cols-2 gap-2 mt-3'>
        <div className='h-4 rounded animate-pulse' style={{ backgroundColor: border, opacity: 0.6 }} />
        <div className='h-4 rounded animate-pulse' style={{ backgroundColor: border, opacity: 0.6 }} />
        <div className='h-4 rounded animate-pulse' style={{ backgroundColor: border, opacity: 0.6 }} />
        <div className='h-4 rounded animate-pulse' style={{ backgroundColor: border, opacity: 0.6 }} />
      </div>
    </div>
    <div className='px-5 pb-5 pt-3'>
      <div className='h-7 w-2/5 rounded animate-pulse' style={{ backgroundColor: border }} />
    </div>
  </div>
);

// ID interno de la pestaña de ofertas (campaña). No es una categoría real.
const OFFER_TAB_ID = '__offers__';

// ── Category icons — same as website ──
const CATEGORY_ICONS: Record<string, string> = {
  all: 'mdi:car-multiple', SUV: 'mdi:car-suv', Sedan: 'mdi:car',
  Hatchback: 'mdi:car-hatchback', Pickup: 'mdi:truck-pickup',
  Van: 'mdi:van-passenger', Coupe: 'mdi:car-sports', Wagon: 'mdi:car-estate',
};

const ALL_CATEGORIES = [
  { id: 'all', name: 'Todos', icon: CATEGORY_ICONS.all },
  { id: 'SUV', name: 'SUV', icon: CATEGORY_ICONS.SUV },
  { id: 'Sedan', name: 'Sedán', icon: CATEGORY_ICONS.Sedan },
  { id: 'Hatchback', name: 'Hatchback', icon: CATEGORY_ICONS.Hatchback },
  { id: 'Pickup', name: 'Pickup', icon: CATEGORY_ICONS.Pickup },
  { id: 'Van', name: 'Van', icon: CATEGORY_ICONS.Van },
  { id: 'Coupe', name: 'Coupé', icon: CATEGORY_ICONS.Coupe },
  { id: 'Wagon', name: 'Wagon', icon: CATEGORY_ICONS.Wagon },
];

const SORT_OPTIONS = [
  { key: 'date_desc', label: 'Destacados', icon: 'mdi:star-outline' },
  { key: 'price_asc', label: 'Precio ↑', icon: 'mdi:sort-ascending' },
  { key: 'price_desc', label: 'Precio ↓', icon: 'mdi:sort-descending' },
  { key: 'year_desc', label: 'Año ↓', icon: 'mdi:calendar' },
  { key: 'year_asc', label: 'Año ↑', icon: 'mdi:calendar-outline' },
  { key: 'mileage_asc', label: 'Kilometraje ↑', icon: 'mdi:speedometer-slow' },
  { key: 'mileage_desc', label: 'Kilometraje ↓', icon: 'mdi:speedometer' },
];

// ══════════════════════════════════════════════
// MAIN COMPONENT — clone of NewVehiclesSection (minimal=true)
// ══════════════════════════════════════════════
interface TraditionalVehicleGridProps {
  accentColor?: string;
  sectionBgColor?: string;
  // Filter bar
  filterStyle?: 'images' | 'buttons';
  filterBarBgColor?: string;
  filterBarBorderColor?: string;
  filterTextColor?: string;
  filterActiveTextColor?: string;
  // Category image overrides (flat props for Craft.js compatibility)
  categoryImage_all?: string;
  categoryImage_SUV?: string;
  categoryImage_Sedan?: string;
  categoryImage_Hatchback?: string;
  categoryImage_Pickup?: string;
  categoryImage_Van?: string;
  categoryImage_Coupe?: string;
  categoryImage_Wagon?: string;
  // Cards
  cardTitleField?: 'model' | 'brand' | 'brand_model';
  cardBgColor?: string;
  cardBorderColor?: string;
  cardTitleColor?: string;
  cardSubtitleColor?: string;
  cardSpecsColor?: string;
  cardPriceColor?: string;
  // Badge visibility
  showBadgeCondition?: boolean;
  showBadgePromo?: boolean;
  showBadgeNew?: boolean;
  showBadgeCustom?: boolean;
  showRibbonSold?: boolean;
  showRibbonReserved?: boolean;
  showBadgeDiscount?: boolean;
  // Grid columns per breakpoint
  gridColsSm?: string;
  gridColsMd?: string;
  gridColsLg?: string;
  gridColsXl?: string;
  // Campaña de ofertas
  offerTabLabel?: string;
  offerTabFilter?: string;
  // UI texts
  noResultsTitle?: string;
  noResultsText?: string;
  noResultsButtonText?: string;
}

export const TraditionalVehicleGrid = ({
  accentColor = '',
  sectionBgColor = '',
  filterStyle = 'images',
  filterBarBgColor = '#ffffff',
  filterBarBorderColor = '#e5e7eb',
  filterTextColor = '#374151',
  filterActiveTextColor = '#ffffff',
  categoryImage_all = '',
  categoryImage_SUV = '',
  categoryImage_Sedan = '',
  categoryImage_Hatchback = '',
  categoryImage_Pickup = '',
  categoryImage_Van = '',
  categoryImage_Coupe = '',
  categoryImage_Wagon = '',
  cardTitleField = 'model',
  cardBgColor = '#ffffff',
  cardBorderColor = 'rgba(0,0,0,0.1)',
  cardTitleColor = '#171717',
  cardSubtitleColor = '#525252',
  cardSpecsColor = '#262626',
  cardPriceColor = '#171717',
  showBadgeCondition = true,
  showBadgePromo = true,
  showBadgeNew = true,
  showBadgeCustom = true,
  showRibbonSold = true,
  showRibbonReserved = true,
  showBadgeDiscount = true,
  gridColsSm = '2',
  gridColsMd = '3',
  gridColsLg = '3',
  gridColsXl = '4',
  offerTabLabel = '',
  offerTabFilter = '',
  noResultsTitle = 'Sin resultados',
  noResultsText = 'No encontramos vehículos con esos filtros',
  noResultsButtonText = 'Ver todos los vehículos',
}: TraditionalVehicleGridProps) => {
  const { connectors, selected, id } = useNode((s) => ({ selected: s.events.selected }));
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));
  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);
  const finalAccent = accentColor || clientDefaults.primaryColor;
  const finalBg = sectionBgColor || '#f8fafc';

  // Detect dark bg for HeroUI dark mode on internal components
  const isSectionDark = (() => {
    const c = finalBg.replace('#', '');
    if (c.length !== 6) return false;
    const r = parseInt(c.substring(0, 2), 16) / 255;
    const g = parseInt(c.substring(2, 4), 16) / 255;
    const b = parseInt(c.substring(4, 6), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b < 0.4;
  })();

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isSortDrawerOpen, setIsSortDrawerOpen] = useState(false);
  const [showMobileButtons, setShowMobileButtons] = useState(true);

  const { filters, priceRange, sortOrder, setSortOrder, clearFilters } = useVehicleFiltersStore();

  // ── Fetch — same as website useVehiclesStore ──
  useEffect(() => {
    const run = async () => {
      if (!client?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vehicles')
          .select(`*, status:clients_vehicles_states(*), brand:brand_id(*), model:model_id(*),
            category:category_id(*), fuel_type:fuel_type_id(*), condition:condition_id(*),
            vehicles_sales!vehicle_id(created_at), vehicles_reservations!vehicle_id(created_at)`)
          .eq('client_id', client.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        threeDaysAgo.setHours(0, 0, 0, 0);

        const filtered = (data || []).filter((v: any) => {
          if (!v.status) return false;
          let shouldShow = typeof v.status.show_in_web === 'boolean'
            ? v.status.show_in_web
            : ['Publicado', 'Reservado', 'Vendido'].includes(v.status.name || '');
          if (!shouldShow) return false;

          const sn = v.status.name || '';
          if (sn === 'Vendido' || sn === 'Reservado') {
            let ed: string | undefined;
            const sales = Array.isArray(v.vehicles_sales) ? v.vehicles_sales : [];
            const reservations = Array.isArray(v.vehicles_reservations) ? v.vehicles_reservations : [];
            if (sn === 'Vendido' && sales.length > 0) {
              ed = [...sales].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at;
            } else if (sn === 'Reservado' && reservations.length > 0) {
              ed = [...reservations].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at;
            }
            if (!ed) return false;
            return new Date(ed) >= threeDaysAgo;
          }
          return true;
        });
        setVehicles(filtered);
      } catch (e) {
        console.error('TraditionalVehicleGrid fetch error:', e);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [client?.id]);

  // ── Category variant mapping (same as website) ──
  const categoryVariants: Record<string, string[]> = {
    SUV: ['SUV', 'Suv', 'suv', 'Crossover', 'crossover', 'Todoterreno', '4x4'],
    Sedan: ['Sedan', 'Sedán', 'sedan', 'sedán', 'Berlina', 'Automóvil', 'automóvil', 'Clásico', 'clásico'],
    Hatchback: ['Hatchback', 'hatchback', 'Compacto', 'City Car', 'city car'],
    Pickup: ['Pickup', 'pickup', 'Pick-up', 'Camioneta', 'camioneta'],
    Van: ['Van', 'van', 'Minivan', 'minivan', 'Furgoneta', 'Furgón', 'furgón'],
    Coupe: ['Coupe', 'Coupé', 'coupe', 'coupé', 'Deportivo', 'deportivo', 'Convertible', 'convertible'],
    Wagon: ['Wagon', 'wagon', 'Station Wagon', 'station wagon', 'Familiar'],
  };

  const resolveCategoryId = (dbName: string): string | null => {
    for (const [catId, variants] of Object.entries(categoryVariants)) {
      if (variants.some(v => v.toLowerCase() === dbName.toLowerCase())) return catId;
    }
    return null;
  };

  // ── Derived data ──
  const brands = useMemo(() => [...new Set(vehicles.map(v => v.brand?.name).filter(Boolean))].sort() as string[], [vehicles]);
  const fuelTypes = useMemo(() => [...new Set(vehicles.map(v => v.fuel_type?.name).filter(Boolean))].sort() as string[], [vehicles]);
  const categoriesWithVehicles = useMemo(() => {
    const catIds = new Set<string>();
    vehicles.forEach(v => {
      const name = v.category?.name;
      if (name) {
        catIds.add(name);
        const resolved = resolveCategoryId(name);
        if (resolved) catIds.add(resolved);
      }
    });
    return catIds;
  }, [vehicles]);
  const baseCategories = ALL_CATEGORIES.filter(c => c.id === 'all' || categoriesWithVehicles.has(c.id));

  // ── Pestaña de OFERTAS (campaña) — solo aparece si hay autos con la etiqueta ──
  const offerKeyword = (offerTabFilter || '').trim().toLowerCase();
  const hasOfferVehicles = useMemo(() => {
    if (!offerKeyword) return false;
    return vehicles.some(v => (v.label || '').toLowerCase().includes(offerKeyword));
  }, [vehicles, offerKeyword]);
  const vehicleCategories = useMemo(() => {
    if (!hasOfferVehicles) return baseCategories;
    return [{ id: OFFER_TAB_ID, name: (offerTabLabel || '').trim() || 'Ofertas', icon: 'mdi:fire' }, ...baseCategories];
  }, [hasOfferVehicles, baseCategories, offerTabLabel]);

  // Build a map of category → image for photo-style filters
  // Custom images (from settings) take priority over auto-detected vehicle images
  const imageOverrides: Record<string, string> = useMemo(() => {
    const o: Record<string, string> = {};
    if (categoryImage_all) o.all = categoryImage_all;
    if (categoryImage_SUV) o.SUV = categoryImage_SUV;
    if (categoryImage_Sedan) o.Sedan = categoryImage_Sedan;
    if (categoryImage_Hatchback) o.Hatchback = categoryImage_Hatchback;
    if (categoryImage_Pickup) o.Pickup = categoryImage_Pickup;
    if (categoryImage_Van) o.Van = categoryImage_Van;
    if (categoryImage_Coupe) o.Coupe = categoryImage_Coupe;
    if (categoryImage_Wagon) o.Wagon = categoryImage_Wagon;
    return o;
  }, [categoryImage_all, categoryImage_SUV, categoryImage_Sedan, categoryImage_Hatchback, categoryImage_Pickup, categoryImage_Van, categoryImage_Coupe, categoryImage_Wagon]);

  const categoryImages = useMemo(() => {
    const map: Record<string, string | null> = { all: vehicles.find(v => v.main_image)?.main_image ?? null };
    for (const v of vehicles) {
      const catName = v.category?.name;
      if (catName && v.main_image) {
        if (!map[catName]) map[catName] = v.main_image;
        const catId = resolveCategoryId(catName);
        if (catId && !map[catId]) map[catId] = v.main_image;
      }
    }
    // Apply custom overrides from settings
    for (const [key, url] of Object.entries(imageOverrides)) {
      if (url) map[key] = url;
    }
    return map;
  }, [vehicles, imageOverrides]);

  const maxPrice = useMemo(() => Math.max(...vehicles.filter(v => v.price > 0).map(v => v.price || 0), 1), [vehicles]);

  const activeFiltersCount =
    Object.keys(filters).length +
    (priceRange[0] > 0 || priceRange[1] < maxPrice ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    (sortOrder !== 'date_desc' ? 1 : 0);

  // ── Filter + sort — same logic as website ──
  const filteredVehicles = useMemo(() => {
    let r = vehicles;

    // Tab de OFERTAS: filtra por etiqueta del auto en vez de categoría.
    if (selectedCategory === OFFER_TAB_ID) {
      if (offerKeyword) {
        r = r.filter(v => (v.label || '').toLowerCase().includes(offerKeyword));
      }
    } else if (selectedCategory !== 'all') {
      // Category from tabs (using variant matching)
      const variants = categoryVariants[selectedCategory] || [selectedCategory];
      r = r.filter(v => {
        const catName = v.category?.name || '';
        return variants.some(variant => variant.toLowerCase() === catName.toLowerCase());
      });
    }

    // Filters from sidebar store (brand, fuel, etc.)
    const matchesFilter = (filterValue: string | string[] | undefined, vehicleValue: string | undefined): boolean => {
      if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) return true;
      if (!vehicleValue) return false;
      if (Array.isArray(filterValue)) return filterValue.includes(vehicleValue);
      return filterValue === vehicleValue;
    };

    r = r.filter(v => {
      if (!matchesFilter(filters.brand, v.brand?.id?.toString())) return false;
      if (!matchesFilter(filters.model, v.model?.id?.toString())) return false;
      if (!matchesFilter(filters.fuel_type, v.fuel_type?.id?.toString())) return false;
      if (!matchesFilter(filters.condition, v.condition?.id?.toString())) return false;
      if (!matchesFilter(filters.year, v.year?.toString())) return false;
      if (priceRange[1] > 0 && (v.price < priceRange[0] || v.price > priceRange[1])) return false;
      return true;
    });

    // Sort
    return [...r].sort((a, b) => {
      switch (sortOrder) {
        case 'price_asc': {
          const priceA = (a.price || 0) * (1 - (a.discount_percentage || 0) / 100);
          const priceB = (b.price || 0) * (1 - (b.discount_percentage || 0) / 100);
          return priceA - priceB;
        }
        case 'price_desc': {
          const priceA = (a.price || 0) * (1 - (a.discount_percentage || 0) / 100);
          const priceB = (b.price || 0) * (1 - (b.discount_percentage || 0) / 100);
          return priceB - priceA;
        }
        case 'year_desc': return (b.year || 0) - (a.year || 0);
        case 'year_asc': return (a.year || 0) - (b.year || 0);
        case 'mileage_asc': return (a.mileage || 0) - (b.mileage || 0);
        case 'mileage_desc': return (b.mileage || 0) - (a.mileage || 0);
        default: return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });
  }, [vehicles, selectedCategory, filters, priceRange, sortOrder, offerKeyword]);

  const clearAllFilters = () => { clearFilters(maxPrice); setSelectedCategory('all'); };


  // ══════════ RENDER — same structure as website ══════════
  return (
    <div
      ref={(el: HTMLDivElement | null) => { if (el) connectors.connect(el); }}
      style={{
        position: 'relative',
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
        '--primary': hexToHsl(finalAccent),
        '--primary-foreground': '0 0% 100%',
      } as React.CSSProperties}
      className='w-full vehicle-grid-wrapper'
    >
      <style>{`
        .vehicle-grid-wrapper .vehicle-grid {
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
        @media (min-width: 640px) { .vehicle-grid-wrapper .vehicle-grid { grid-template-columns: repeat(var(--grid-sm), minmax(0, 1fr)); } }
        @media (min-width: 768px) { .vehicle-grid-wrapper .vehicle-grid { grid-template-columns: repeat(var(--grid-md), minmax(0, 1fr)); } }
        @media (min-width: 1024px) { .vehicle-grid-wrapper .vehicle-grid { grid-template-columns: repeat(var(--grid-lg), minmax(0, 1fr)); } }
        @media (min-width: 1280px) { .vehicle-grid-wrapper .vehicle-grid { grid-template-columns: repeat(var(--grid-xl), minmax(0, 1fr)); } }
      `}</style>
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      <div className={`min-h-[400px] ${isSectionDark ? 'dark' : ''}`} style={{ backgroundColor: finalBg }}>

        {/* ── Mobile floating buttons — same as website ── */}
        <div className={`md:hidden fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2 transition-all duration-300 ${
          showMobileButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
        }`}>
          <button onClick={() => setIsFilterDrawerOpen(true)}
            className='flex items-center gap-2 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200'
            style={{ backgroundColor: cardBgColor, border: `1px solid ${cardBorderColor}` }}>
            <Icon icon='solar:filter-linear' className='text-lg' style={{ color: finalAccent }} />
            <span className='text-sm font-medium' style={{ color: filterTextColor }}>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className='w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-medium' style={{ backgroundColor: finalAccent }}>{activeFiltersCount}</span>
            )}
          </button>
          <button onClick={() => setIsSortDrawerOpen(true)}
            className='flex items-center gap-2 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200'
            style={{ backgroundColor: cardBgColor, border: `1px solid ${cardBorderColor}` }}>
            <Icon icon='mdi:sort' className='text-lg' style={{ color: finalAccent }} />
            <span className='text-sm font-medium' style={{ color: filterTextColor }}>Ordenar</span>
          </button>
        </div>

        {/* ── Sticky categories ── */}
        <div className='sticky top-0 z-30 border-b' style={{ backgroundColor: filterBarBgColor, borderColor: filterBarBorderColor }}>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3'>
            <div className='flex justify-start lg:justify-center items-center w-full overflow-x-auto'>
              <div className={`flex ${filterStyle === 'images' ? 'gap-2.5' : 'gap-2'} py-1 min-w-max`}>
                {vehicleCategories.map(category => {
                  const isActive = selectedCategory === category.id;
                  const isOfferTab = category.id === OFFER_TAB_ID;

                  {/* ── Button style (no images) ── */}
                  if (filterStyle === 'buttons') {
                    return (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full transition-all duration-200 hover:-translate-y-0.5 text-sm font-medium ${
                          isActive ? 'shadow-md' : ''
                        }`}
                        style={isOfferTab
                          ? { color: '#ffffff', backgroundColor: isActive ? '#b91c1c' : '#dc2626', fontWeight: 600 }
                          : {
                              color: isActive ? filterActiveTextColor : filterTextColor,
                              backgroundColor: isActive ? finalAccent : 'transparent',
                            }}
                      >
                        <Icon icon={category.icon} className='text-xl' />
                        {category.name}
                      </button>
                    );
                  }

                  {/* ── Image style (photo cards) ── */}
                  const img = categoryImages[category.id];
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`relative flex flex-col items-center gap-1 transition-all duration-200 hover:-translate-y-0.5 group ${
                        isActive ? 'scale-[1.02]' : ''
                      }`}
                    >
                      <div
                        className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden transition-all duration-200 ${
                          isActive
                            ? 'ring-2 shadow-md'
                            : 'ring-1 group-hover:ring-2 group-hover:shadow-sm'
                        }`}
                        style={{
                          ringColor: isActive ? finalAccent : cardBorderColor,
                          '--tw-ring-color': isActive ? finalAccent : cardBorderColor,
                        } as React.CSSProperties}
                      >
                        {img ? (
                          <div
                            className='absolute inset-0 bg-center bg-cover transition-transform duration-300 group-hover:scale-105'
                            style={{ backgroundImage: `url(${img})` }}
                          />
                        ) : (
                          <div className='absolute inset-0 flex items-center justify-center' style={{ backgroundColor: cardBorderColor }}>
                            <Icon icon={category.icon} className='text-2xl' style={{ color: cardSubtitleColor }} />
                          </div>
                        )}
                        <div className={`absolute inset-0 transition-opacity duration-200 ${
                          isActive ? 'bg-black/30' : 'bg-black/10 group-hover:bg-black/20'
                        }`} />
                        {isActive && (
                          <div className='absolute bottom-0 left-0 right-0 h-[3px]' style={{ backgroundColor: finalAccent }} />
                        )}
                      </div>
                      <span
                        className={`text-[11px] sm:text-xs font-medium transition-colors duration-200 ${
                          isActive || isOfferTab ? 'font-semibold' : ''
                        }`}
                        style={{ color: isOfferTab ? '#dc2626' : (isActive ? finalAccent : filterTextColor) }}
                      >
                        {category.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content — same layout as website ── */}
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20'>
          <div className='flex flex-col md:flex-row gap-8'>

            {/* Desktop filter sidebar — same as website */}
            {!isFiltersCollapsed && (
              <aside className='hidden md:block w-72 shrink-0'>
                <div className='sticky top-24'>
                  <div className='max-h-[600px] overflow-y-auto overflow-x-hidden'>
                    <NewVehicleFilters
                      brands={brands.map((b, i) => ({ id: i, name: b }))}
                      fuelTypes={fuelTypes.map((f, i) => ({ id: i, name: f }))}
                      availableYears={[...new Set(vehicles.map(v => v.year).filter(Boolean))].sort((a: any, b: any) => b - a).map(String)}
                      maxPrice={Math.max(...vehicles.filter(v => v.price > 0).map(v => v.price || 0), 1)}
                      isCollapsed={isFiltersCollapsed}
                      onToggleCollapse={() => setIsFiltersCollapsed(true)}
                      panelBgColor={cardBgColor}
                      panelBorderColor={cardBorderColor}
                      panelTextColor={cardTitleColor}
                      panelMutedColor={cardSubtitleColor}
                    />
                  </div>
                </div>
              </aside>
            )}

            {/* Desktop collapsed filter/sort buttons — same as website */}
            {isFiltersCollapsed && (
              <div className='hidden md:flex sticky top-24 h-fit shrink-0 flex-col items-center gap-2'>
                <button
                  onClick={() => setIsFiltersCollapsed(false)}
                  className='p-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center gap-2'
                  style={{ backgroundColor: cardBgColor, border: `1px solid ${cardBorderColor}` }}
                  aria-label='Mostrar filtros'
                >
                  <Icon icon='solar:filter-linear' className='text-xl' style={{ color: finalAccent }} />
                  {activeFiltersCount > 0 && (
                    <span className='w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-medium' style={{ backgroundColor: finalAccent }}>{activeFiltersCount}</span>
                  )}
                </button>

                <Dropdown placement='right' className={isSectionDark ? 'dark' : ''}>
                  <DropdownTrigger>
                    <button
                      className='p-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col items-center gap-2'
                      style={{ backgroundColor: cardBgColor, border: `1px solid ${cardBorderColor}` }}
                      aria-label='Ordenar'
                    >
                      <Icon icon='mdi:sort' className='text-xl' style={{ color: finalAccent }} />
                    </button>
                  </DropdownTrigger>
                  <DropdownMenu
                    selectionMode='single'
                    selectedKeys={new Set([sortOrder])}
                    onSelectionChange={(keys) => {
                      const k = Array.from(keys)[0];
                      if (k) setSortOrder(String(k));
                    }}
                    style={isSectionDark ? { backgroundColor: cardBgColor, color: cardTitleColor, border: `1px solid ${cardBorderColor}`, borderRadius: '12px' } : undefined}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <DropdownItem key={option.key} startContent={<Icon icon={option.icon} className='text-sm' />} style={isSectionDark ? { color: cardTitleColor } : undefined}>
                        {option.label}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>
              </div>
            )}

            {/* Vehicle grid */}
            <div className='flex-1 min-w-0'>
              <div
                className='vehicle-grid grid gap-4 sm:gap-5 transition-all duration-500 grid-cols-1 mx-auto'
                style={{
                  '--grid-sm': gridColsSm,
                  '--grid-md': gridColsMd,
                  '--grid-lg': gridColsLg,
                  '--grid-xl': gridColsXl,
                } as React.CSSProperties}
              >
                {loading
                  ? Array(6).fill(null).map((_, i) => <SkeletonCard key={i} bg={cardBgColor} border={cardBorderColor} />)
                  : filteredVehicles.map(vehicle => (
                      <VehicleCard key={vehicle.id} vehicle={vehicle} primaryColor={finalAccent} cardBgColor={cardBgColor} cardBorderColor={cardBorderColor} cardTitleColor={cardTitleColor} cardSubtitleColor={cardSubtitleColor} cardSpecsColor={cardSpecsColor} cardPriceColor={cardPriceColor} cardTitleField={cardTitleField} />
                    ))
                }
              </div>

              {/* No results — same as website */}
              {!loading && filteredVehicles.length === 0 && (
                <div className='text-center py-12 max-w-md mx-auto'>
                  <div className='w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6' style={{ backgroundColor: cardBgColor }}>
                    <Icon icon='mdi:car-search' className='text-4xl' style={{ color: cardSubtitleColor }} />
                  </div>
                  <h3 className='text-xl font-semibold mb-2' style={{ color: cardTitleColor }}>{noResultsTitle}</h3>
                  <p className='mb-6' style={{ color: cardSubtitleColor }}>{noResultsText}</p>
                  <button onClick={clearAllFilters}
                    className='px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors'
                    style={{ backgroundColor: finalAccent }}>
                    <Icon icon='mdi:refresh' className='inline mr-1' /> {noResultsButtonText}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile Filter Drawer — Vaul (same as website) ── */}
      <VaulDrawer open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
        <VaulDrawerContent className={`max-h-[90vh] ${isSectionDark ? 'dark' : ''}`} style={{ backgroundColor: isSectionDark ? cardBgColor : undefined, color: isSectionDark ? cardTitleColor : undefined }}>
          <VaulDrawerHeader><VaulDrawerTitle style={{ color: isSectionDark ? cardTitleColor : undefined }}>Filtros</VaulDrawerTitle></VaulDrawerHeader>
          <div className='overflow-y-auto px-4 pb-4 flex-1'>
            <NewVehicleFilters
              brands={brands.map((b, i) => ({ id: i, name: b }))}
              fuelTypes={fuelTypes.map((f, i) => ({ id: i, name: f }))}
              availableYears={[...new Set(vehicles.map(v => v.year).filter(Boolean))].sort((a: any, b: any) => b - a).map(String)}
              maxPrice={Math.max(...vehicles.filter(v => v.price > 0).map(v => v.price || 0), 1)}
              panelBgColor={cardBgColor}
              panelBorderColor={cardBorderColor}
              panelTextColor={cardTitleColor}
              panelMutedColor={cardSubtitleColor}
            />
          </div>
          <div className='px-4 py-4' style={{ borderTop: `1px solid ${cardBorderColor}` }}>
            <button onClick={() => setIsFilterDrawerOpen(false)}
              className='w-full py-2.5 rounded-xl text-sm font-medium text-white'
              style={{ backgroundColor: finalAccent }}>
              Aplicar filtros
            </button>
          </div>
        </VaulDrawerContent>
      </VaulDrawer>

      {/* ── Sort Drawer — Vaul (same as website) ── */}
      <VaulDrawer open={isSortDrawerOpen} onOpenChange={setIsSortDrawerOpen}>
        <VaulDrawerContent className={isSectionDark ? 'dark' : ''} style={{ backgroundColor: isSectionDark ? cardBgColor : undefined }}>
          <VaulDrawerHeader><VaulDrawerTitle style={{ color: isSectionDark ? cardTitleColor : undefined }}>Ordenar</VaulDrawerTitle></VaulDrawerHeader>
          <div className='flex flex-col pb-6'>
            {SORT_OPTIONS.map(option => (
              <button key={option.key}
                onClick={() => { setSortOrder(option.key); setIsSortDrawerOpen(false); }}
                className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                  sortOrder === option.key ? 'font-medium' : ''
                }`}
                style={sortOrder === option.key
                  ? { color: finalAccent, backgroundColor: `${finalAccent}15` }
                  : { color: isSectionDark ? cardTitleColor : filterTextColor }
                }>
                <Icon icon={option.icon} className='text-lg' />
                <span className='text-sm'>{option.label}</span>
                {sortOrder === option.key && <Icon icon='mdi:check' className='ml-auto text-lg' style={{ color: finalAccent }} />}
              </button>
            ))}
          </div>
        </VaulDrawerContent>
      </VaulDrawer>
    </div>
  );
};

(TraditionalVehicleGrid as any).craft = {
  displayName: 'TraditionalVehicleGrid',
  props: {
    accentColor: '',
    sectionBgColor: '',
    filterStyle: 'buttons',
    filterBarBgColor: '#ffffff',
    filterBarBorderColor: '#e5e7eb',
    filterTextColor: '#374151',
    filterActiveTextColor: '#ffffff',
    categoryImage_all: '',
    categoryImage_SUV: '',
    categoryImage_Sedan: '',
    categoryImage_Hatchback: '',
    categoryImage_Pickup: '',
    categoryImage_Van: '',
    categoryImage_Coupe: '',
    categoryImage_Wagon: '',
    cardTitleField: 'model',
    cardBgColor: '#ffffff',
    cardBorderColor: 'rgba(0,0,0,0.1)',
    cardTitleColor: '#171717',
    cardSubtitleColor: '#525252',
    cardSpecsColor: '#262626',
    cardPriceColor: '#171717',
    showBadgeCondition: true,
    showBadgePromo: true,
    showBadgeNew: true,
    showBadgeCustom: true,
    showRibbonSold: true,
    showRibbonReserved: true,
    showBadgeDiscount: true,
    gridColsSm: '2',
    gridColsMd: '3',
    gridColsLg: '3',
    gridColsXl: '4',
    offerTabLabel: '',
    offerTabFilter: '',
    noResultsTitle: 'Sin resultados',
    noResultsText: 'No encontramos vehículos con esos filtros',
    noResultsButtonText: 'Ver todos los vehículos',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
