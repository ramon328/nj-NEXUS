'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useNode } from '@craftjs/core';
import { DeleteButton } from '../../DeleteButton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { VehicleList } from './VehicleList';
import { EditableText } from '../../EditableText';

// ✅ Extiende React.FC para permitir la propiedad estática `.craft`
type CraftComponent<P = {}> = React.FC<P> & { craft?: any };

type StatusName = 'Publicado' | 'Vendido' | 'Reservado';

type VehicleRel = {
  id?: number;
  name?: string;
  show_in_web?: boolean;
};

type VehicleRow = {
  id: number;
  year?: number;
  price?: number;
  mileage?: number;
  transmission?: string | null;
  main_image?: string | null;
  discount_percentage?: number | null;
  created_at?: string | null;
  status?: VehicleRel & { name?: StatusName | string };
  brand?: VehicleRel;
  model?: VehicleRel;
  category?: VehicleRel;
  fuel_type?: VehicleRel;
  condition?: VehicleRel;
  color?: VehicleRel;
  vehicles_sales?: Array<{ created_at: string }> | { created_at: string } | null;
  vehicles_reservations?: Array<{ created_at: string }> | { created_at: string } | null;
  event_date?: string;
};

interface GradientCfg {
  from: string;
  via: string;
  to: string;
  angle?: number; // grados
}

interface Props {
  title?: string;
  subtitle?: string;
  bgColor?: string;
  textColor?: string;
  columns?: 2 | 3 | 4;
  showStatuses?: StatusName[];
  gradient?: GradientCfg; // 👈 NUEVO
  cardSettings?: {
    cardBgColor: string;
    cardBorderColor: string;
    cardTextColor: string;
    cardPriceColor: string;
    cardButtonColor: string;
    cardButtonTextColor: string;
    detailsButtonText: string;
    bannerPosition: 'left' | 'right';
    pricePosition?: 'overlay' | 'below-title';
    featuresConfig?: {
      feature1?: string;
      feature2?: string;
      feature3?: string;
      feature4?: string;
    };
  }[];
  newBadgeText?: string;
  children?: React.ReactNode;
}

// ✅ Componente listo para Craft (sin settings, edición inline)
export const VehicleGrid2: CraftComponent<Props> = ({
  title = 'Explora nuestro stock',
  subtitle = '',
  bgColor = '#ffffff',
  textColor = '#111827',
  columns = 3,
  showStatuses = ['Publicado', 'Reservado'],
  gradient = { from: '#000000', via: '#171717', to: '#404040', angle: 135 }, // 👈 default
  cardSettings = [
    {
      cardBgColor: '#ffffff',
      cardBorderColor: '#e5e7eb',
      cardTextColor: '#1f2937',
      cardPriceColor: '#ffffff',
      cardButtonColor: '#224887',
      cardButtonTextColor: '#ffffff',
      detailsButtonText: 'Ver detalles',
      bannerPosition: 'right',
      pricePosition: 'overlay',
      featuresConfig: {
        feature1: 'category',
        feature2: 'year',
        feature3: 'fuel',
        feature4: 'mileage',
      },
    },
  ],
  newBadgeText = 'Recién publicado',
  children,
}) => {
  const { connectors, selected, id } = useNode((s) => ({ selected: s.events.selected }));
  const { actions } = useNode(); // para setProp
  const { client } = useAuth();

  // data
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [filtered, setFiltered] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(true);

  // options
  const [brands, setBrands] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [fuels, setFuels] = useState<string[]>([]);
  const [trans, setTrans] = useState<string[]>([]);
  const [minMaxPrice, setMinMaxPrice] = useState({ min: 0, max: 100000 });
  const [minMaxYear, setMinMaxYear] = useState({ min: 1990, max: new Date().getFullYear() });

  // filters
  const [typeSel, setTypeSel] = useState('Todos');
  const [brandSel, setBrandSel] = useState('Todas');
  const [transSel, setTransSel] = useState('Todas');
  const [fuelSel, setFuelSel] = useState('Todos');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(100000);
  const [yearMin, setYearMin] = useState(1990);
  const [yearMax, setYearMax] = useState(new Date().getFullYear());

  // ✅ Ordenamiento (recientes, antiguos, precio asc/desc)
  const [sortOrder, setSortOrder] =
    useState<'price_asc' | 'price_desc' | 'date_asc' | 'date_desc'>('date_desc');

  const hasActive =
    typeSel !== 'Todos' ||
    brandSel !== 'Todas' ||
    transSel !== 'Todas' ||
    fuelSel !== 'Todos' ||
    priceMin !== minMaxPrice.min ||
    priceMax !== minMaxPrice.max ||
    yearMin !== minMaxYear.min ||
    yearMax !== minMaxYear.max;

  // ---------- TÍTULO EDITABLE INLINE ----------
  const [localTitle, setLocalTitle] = useState(title || '');
  useEffect(() => {
    setLocalTitle(title || '');
  }, [title]);

  const saveTitle = (val: string) => {
    const v = (val || '').trim();
    setLocalTitle(v);
    actions.setProp((props: any) => {
      props.title = v;
    });
  };
  // -------------------------------------------

  // ---------- GRADIENT EDITABLE INLINE ----------
  const [localGradient, setLocalGradient] = useState<GradientCfg>(gradient);
  useEffect(() => setLocalGradient(gradient), [gradient]);
  const saveGradient = (g: GradientCfg) => {
    setLocalGradient(g);
    actions.setProp((props: any) => {
      props.gradient = { ...props.gradient, ...g };
    });
  };
  const gradientStyle: React.CSSProperties = {
    background: `linear-gradient(${(localGradient.angle ?? 135)}deg, ${localGradient.from} 0%, ${localGradient.via} 55%, ${localGradient.to} 100%)`,
    color: '#fff',
  };
  // ---------------------------------------------

  // fetch vehicles
  useEffect(() => {
    const run = async () => {
      if (!client?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vehicles')
          .select(`
            id, year, price, mileage, transmission, main_image,
            discount_percentage, created_at,
            status:status_id(id, name, show_in_web),
            brand:brand_id(id, name),
            model:model_id(id, name),
            category:category_id(id, name),
            fuel_type:fuel_type_id(id, name),
            condition:condition_id(id, name),
            color:color_id(id, name),
            vehicles_sales!vehicle_id(*),
            vehicles_reservations!vehicle_id(*)
          `)
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        const processed: VehicleRow[] = (data || []).map((v: any) => {
          let event_date: string | undefined;
          if (v.status?.name === 'Vendido' && v.vehicles_sales) {
            const arr = Array.isArray(v.vehicles_sales) ? v.vehicles_sales : [v.vehicles_sales];
            if (arr.length)
              event_date = arr.sort(
                (a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at)
              )[0].created_at;
          } else if (v.status?.name === 'Reservado' && v.vehicles_reservations) {
            const arr = Array.isArray(v.vehicles_reservations)
              ? v.vehicles_reservations
              : [v.vehicles_reservations];
            if (arr.length)
              event_date = arr.sort(
                (a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at)
              )[0].created_at;
          }
          return { ...v, event_date };
        });

        // Filter vehicles that should be visible on web
        // Always exclude "Vendido" vehicles — they should never appear on the website
        // Use show_in_web field if defined, fallback to name-based logic for backward compatibility
        const byStatus = processed.filter((v) => {
          if (!v.status) return false;
          // Hard exclude: never show sold vehicles
          if ((v.status.name || '').toLowerCase().includes('vendido')) return false;
          // If show_in_web is explicitly set, use it
          if (typeof v.status.show_in_web === 'boolean') {
            return v.status.show_in_web;
          }
          // Fallback: use name-based filtering for legacy states without show_in_web
          return showStatuses.includes((v.status.name || '') as StatusName);
        });
        const sorted = [...byStatus].sort((a, b) => {
          if (a.status?.name === 'Publicado' && b.status?.name !== 'Publicado') return -1;
          if (a.status?.name !== 'Publicado' && b.status?.name === 'Publicado') return 1;
          return +new Date(b.created_at || 0) - +new Date(a.created_at || 0);
        });

        setVehicles(sorted);
        setFiltered(sorted);

        // options
        const b = [...new Set(sorted.map((v) => v.brand?.name).filter(Boolean))] as string[];
        const t = [...new Set(sorted.map((v) => v.category?.name).filter(Boolean))] as string[];
        const f = [...new Set(sorted.map((v) => v.fuel_type?.name).filter(Boolean))] as string[];
        const tr = [...new Set(sorted.map((v) => v.transmission).filter(Boolean))] as string[];

        const prices = sorted.map((v) => v.price).filter((p): p is number => p != null);
        const minP = prices.length ? Math.min(...prices) : 0;
        const maxP = prices.length ? Math.max(...prices) : 100000;

        const years = sorted.map((v) => v.year).filter((y): y is number => !!y);
        const minY = years.length ? Math.min(...years) : 1990;
        const maxY = years.length ? Math.max(...years) : new Date().getFullYear();

        setBrands(b);
        setTypes(t);
        setFuels(f);
        setTrans(tr);
        setMinMaxPrice({ min: minP, max: maxP });
        setPriceMin(minP);
        setPriceMax(maxP);
        setMinMaxYear({ min: minY, max: maxY });
        setYearMin(minY);
        setYearMax(maxY);
      } catch (e) {
        console.error('VehicleGrid2 fetch error:', e);
        setVehicles([]);
        setFiltered([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [client?.id, showStatuses]);

  // apply filters + sort
  useEffect(() => {
    if (!vehicles.length) return;
    let f = [...vehicles];

    if (typeSel !== 'Todos') f = f.filter((v) => v.category?.name === typeSel);
    if (brandSel !== 'Todas') f = f.filter((v) => v.brand?.name === brandSel);
    if (transSel !== 'Todas') f = f.filter((v) => (v.transmission || '') === transSel);
    if (fuelSel !== 'Todos') f = f.filter((v) => v.fuel_type?.name === fuelSel);

    f = f.filter((v) => (v.price ?? 0) >= priceMin && (v.price ?? 0) <= priceMax);
    f = f.filter((v) => (v.year ?? 0) >= yearMin && (v.year ?? 0) <= yearMax);

    // ✅ ORDENAMIENTO (considera descuento)
    const effectivePrice = (v: VehicleRow) => {
      const p = v.price ?? Infinity;
      const d = v.discount_percentage ?? 0;
      return d > 0 ? p * (1 - d / 100) : p;
    };

    f.sort((a, b) => {
      if (sortOrder === 'price_asc') {
        return effectivePrice(a) - effectivePrice(b);
      } else if (sortOrder === 'price_desc') {
        return effectivePrice(b) - effectivePrice(a);
      } else if (sortOrder === 'date_asc') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      } else {
        // 'date_desc'
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });

    setFiltered(f);
  }, [
    vehicles,
    typeSel,
    brandSel,
    transSel,
    fuelSel,
    priceMin,
    priceMax,
    yearMin,
    yearMax,
    sortOrder,
  ]);

  const refHandler = (el: HTMLDivElement | null) => {
    if (el && connectors.connect) connectors.connect(el);
  };

  // ✅ imágenes por categoría (incluye “Moto, ATV y UTV”)
  const typeIcons: Record<string, string> = {
    CAMIONETA: 'https://sarret.cl/wp-content/uploads/2024/06/04.webp',
    CONVERTIBLE: 'https://sarret.cl/wp-content/uploads/2024/06/02.webp',
    COUPE: 'https://sarret.cl/wp-content/uploads/2024/06/06-1.webp',
    HATCHBACK: 'https://sarret.cl/wp-content/uploads/2024/06/05.webp',
    'MOTO, ATV Y UTV': 'https://sarret.cl/wp-content/uploads/2024/09/tipo-moto.png',
    RANGER: 'https://static.wixstatic.com/media/991a87_6c8838796437422696582f21261abefa~mv2.png/v1/fill/w_480,h_480,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/991a87_6c8838796437422696582f21261abefa~mv2.png',
    SEDAN: 'https://sarret.cl/wp-content/uploads/2024/06/01.webp',
    SUV: 'https://sarret.cl/wp-content/uploads/2024/06/03.webp',
  };

  // 🔥 helpers para glow/pills
  const pngGlow = (active: boolean) =>
    [
      'max-h-14 object-contain transition-transform duration-200',
      active
        ? 'drop-shadow-[0_0_22px_rgba(255,255,255,0.55)] scale-[1.03]'
        : 'hover:drop-shadow-[0_0_18px_rgba(255,255,255,0.35)] hover:scale-[1.02]',
    ].join(' ');

  const allPillClasses = (active: boolean, size: 'sm' | 'md') =>
    [
      'rounded-full flex items-center justify-center font-semibold select-none',
      size === 'sm' ? 'min-w-[5.75rem] h-9 px-4 text-[11px]' : 'min-w-[6.25rem] h-10 px-4 text-sm',
      'backdrop-blur-sm border border-white/20',
      active
        ? 'bg-white/15 text-white shadow-[0_0_24px_rgba(255,255,255,0.45)]'
        : 'bg-white/10 text-white/85 hover:bg-white/12 hover:shadow-[0_0_18px_rgba(255,255,255,0.28)]',
      'focus:outline-none focus:ring-2 focus:ring-white/30',
    ].join(' ');

  // ✅ tarjetas de tipo (incluye “Todos” y fuerza “Moto, ATV y UTV”)
  const typeCards = useMemo(() => {
    const ciMap = new Map<string, string>();
    types.filter(Boolean).forEach((t) => {
      const key = String(t).toLowerCase();
      if (!ciMap.has(key)) ciMap.set(key, t as string);
    });
    const dbTypes = Array.from(ciMap.values());

    if (!dbTypes.some((t) => (t || '').toUpperCase() === 'MOTO, ATV Y UTV')) {
      dbTypes.push('Moto, ATV y UTV');
    }

    const withAll = ['Todos', ...dbTypes];

    return withAll.map((t) => {
      if (t === 'Todos') return { name: t, img: undefined as string | undefined };
      const k = (t || '').toUpperCase();
      return { name: t, img: typeIcons[k] ?? typeIcons['SUV'] };
    });
  }, [types]);

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Publicado': return 'bg-green-100 text-green-800';
      case 'Vendido': return 'bg-red-100 text-red-800';
      case 'Reservado': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <section
      ref={refHandler}
      className="w-full"
      style={{
        background: bgColor,
        color: textColor,
        padding: '0',
        position: 'relative',
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
      data-section="vehicles"
      id="vehicles-section-2"
    >
      {selected && <DeleteButton nodeId={id} />}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* ===== FULL-BLEED HEADER + FILTROS con gradient configurable ===== */}
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-[100vw] max-w-[100vw] overflow-hidden">
          <section className="text-white" style={gradientStyle}>
            <div className="max-w-[1200px] mx-auto">
              {/* Panel inline de gradient (sólo si está seleccionado) */}
              {selected && (
                <div className="px-4 pt-4 pb-2">
                  <div className="inline-flex flex-wrap gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3">
                    <label className="text-xs text-white/90">
                      From
                      <input
                        type="color"
                        value={localGradient.from}
                        onChange={(e) => saveGradient({ ...localGradient, from: e.target.value })}
                        className="ml-2 align-middle h-6 w-10 bg-transparent cursor-pointer"
                        title="Color inicial"
                      />
                    </label>
                    <label className="text-xs text-white/90">
                      Via
                      <input
                        type="color"
                        value={localGradient.via}
                        onChange={(e) => saveGradient({ ...localGradient, via: e.target.value })}
                        className="ml-2 align-middle h-6 w-10 bg-transparent cursor-pointer"
                        title="Color medio"
                      />
                    </label>
                    <label className="text-xs text-white/90">
                      To
                      <input
                        type="color"
                        value={localGradient.to}
                        onChange={(e) => saveGradient({ ...localGradient, to: e.target.value })}
                        className="ml-2 align-middle h-6 w-10 bg-transparent cursor-pointer"
                        title="Color final"
                      />
                    </label>
                    <label className="text-xs text-white/90">
                      Ángulo
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={localGradient.angle ?? 135}
                        onChange={(e) =>
                          saveGradient({ ...localGradient, angle: Number(e.target.value) || 0 })
                        }
                        className="ml-2 h-7 w-20 rounded-md border border-white/20 bg-white/10 px-2 text-white"
                        title="Ángulo del gradiente (grados)"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Título (editable inline) */}
              <div className="text-center mb-5 pt-6 sm:pt-4">
                <EditableText tag="h2" value={title} nodeId={id} propName="title"
                  className="text-2xl sm:text-4xl font-extrabold tracking-tight outline-none"
                />
                {subtitle ? <EditableText tag="p" value={subtitle} nodeId={id} propName="subtitle" className="text-white/80 mt-2 text-sm sm:text-base" /> : null}
              </div>

              {/* Categorías – mobile (glow) */}
              <div className="md:hidden mb-5 -mx-4 px-4">
                <div
                  className="flex gap-4 items-center overflow-x-auto snap-x snap-mandatory scroll-px-4 pb-1
                             [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain"
                >
                  {typeCards.map(({ name, img }) => {
                    const isAll = name === 'Todos';
                    const active = typeSel === name || (isAll && typeSel === 'Todos');

                    return (
                      <button
                        type="button"
                        key={`mobile-${name}`}
                        onClick={() =>
                          setTypeSel(isAll ? 'Todos' : (typeSel === name ? 'Todos' : (name || 'Todos')))
                        }
                        className={[
                          'group flex flex-col items-center transition-transform duration-200 snap-start',
                          active ? '-translate-y-0.5' : 'hover:-translate-y-0.5',
                        ].join(' ')}
                        title={name}
                        style={{ minWidth: '6.75rem' }}
                      >
                        <div className="w-28 h-16 flex items-center justify-center rounded-xl bg-transparent">
                          {isAll ? (
                            <div className={allPillClasses(active, 'sm')}>
                              {name.toUpperCase()}
                            </div>
                          ) : (
                            img && <img src={img} alt={name || ''} className={pngGlow(active)} />
                          )}
                        </div>
                        <span
                          className={[
                            'mt-2 text-[11px] tracking-widest',
                            active ? 'text-white' : 'text-white/80 group-hover:text-white/90',
                          ].join(' ')}
                        >
                          {(name || '').toUpperCase()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Categorías – desktop (glow) */}
              <div className="hidden md:grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6 place-items-center mb-6 px-4">
                {typeCards.map(({ name, img }) => {
                  const isAll = name === 'Todos';
                  const active = typeSel === name || (isAll && typeSel === 'Todos');

                  return (
                    <button
                      type="button"
                      key={`grid-${name}`}
                      onClick={() =>
                        setTypeSel(isAll ? 'Todos' : (typeSel === name ? 'Todos' : (name || 'Todos')))
                      }
                      className={[
                        'group flex flex-col items-center transition-transform duration-200',
                        active ? '-translate-y-1' : 'hover:-translate-y-1',
                      ].join(' ')}
                      title={name}
                    >
                      <div className="w-28 h-16 flex items-center justify-center rounded-xl bg-transparent">
                        {isAll ? (
                          <div className={allPillClasses(active, 'md')}>
                            {name.toUpperCase()}
                          </div>
                        ) : (
                          img && <img src={img} alt={name || ''} className={pngGlow(active)} />
                        )}
                      </div>

                      <span
                        className={[
                          'mt-2 text-xs tracking-widest',
                          active ? 'text-white' : 'text-white/80 group-hover:text-white/90',
                        ].join(' ')}
                      >
                        {(name || '').toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Barra de filtros (inputs blancos sobre gradient) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 place-items-center px-4">
                <div className="w-full max-w-[240px]">
                  <label className="text-[11px] sm:text-sm text-white/90 block mb-1 text-center">Tipo de auto</label>
                  <select
                    className="w-full border border-white/15 rounded-xl px-3 py-2 text-sm bg-white text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                    value={typeSel}
                    onChange={(e) => setTypeSel(e.target.value)}
                  >
                    <option>Todos</option>
                    {!types.some((t) => (t || '').toUpperCase() === 'MOTO, ATV Y UTV') && (
                      <option value="Moto, ATV y UTV">Moto, ATV y UTV</option>
                    )}
                    {types.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full max-w-[240px]">
                  <label className="text-[11px] sm:text-sm text-white/90 block mb-1 text-center">Marca</label>
                  <select
                    className="w-full border border-white/15 rounded-xl px-3 py-2 text-sm bg-white text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                    value={brandSel}
                    onChange={(e) => setBrandSel(e.target.value)}
                  >
                    <option>Todas</option>
                    {brands.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full max-w-[240px]">
                  <label className="text-[11px] sm:text-sm text-white/90 block mb-1 text-center">Transmisión</label>
                  <select
                    className="w-full border border-white/15 rounded-xl px-3 py-2 text-sm bg-white text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                    value={transSel}
                    onChange={(e) => setTransSel(e.target.value)}
                  >
                    <option>Todas</option>
                    {trans.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="w-full max-w-[240px]">
                  <label className="text-[11px] sm:text-sm text-white/90 block mb-1 text-center">Combustible</label>
                  <select
                    className="w-full border border-white/15 rounded-xl px-3 py-2 text-sm bg-white text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                    value={fuelSel}
                    onChange={(e) => setFuelSel(e.target.value)}
                  >
                    <option>Todos</option>
                    {fuels.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sliders con estilos sobre gradient */}
              <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 place-items-center px-4 pb-8 md:pb-10">
                <div className="w-full max-w-[520px]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/90">Precio Desde - Hasta</span>
                    <span className="text-xs text-white/70">
                      ${priceMin.toLocaleString()} — ${priceMax.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:gap-4">
                    <input
                      type="range"
                      min={minMaxPrice.min}
                      max={minMaxPrice.max}
                      value={priceMin}
                      onChange={(e) => setPriceMin(Math.min(Number(e.target.value), priceMax))}
                      className="w-full accent-white/90 h-2"
                    />
                    <input
                      type="range"
                      min={minMaxPrice.min}
                      max={minMaxPrice.max}
                      value={priceMax}
                      onChange={(e) => setPriceMax(Math.max(Number(e.target.value), priceMin))}
                      className="w-full accent-white/90 h-2"
                    />
                  </div>
                </div>

                <div className="w-full max-w-[520px]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/90">Año Desde - Hasta</span>
                    <span className="text-xs text-white/70">{yearMin} — {yearMax}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:gap-4">
                    <input
                      type="range"
                      min={minMaxYear.min}
                      max={minMaxYear.max}
                      value={yearMin}
                      onChange={(e) => setYearMin(Math.min(Number(e.target.value), yearMax))}
                      className="w-full accent-white/90 h-2"
                    />
                    <input
                      type="range"
                      min={minMaxYear.min}
                      max={minMaxYear.max}
                      value={yearMax}
                      onChange={(e) => setYearMax(Math.max(Number(e.target.value), yearMin))}
                      className="w-full accent-white/90 h-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
        {/* ===== /FULL-BLEED ===== */}

        {/* Resultados */}
        <div className="mt-8 sm:mt-10">
          {loading ? (
            <div className="flex justify-center items-center h-60">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neutral-900" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-2xl border border-gray-200 max-w-xl mx-auto">
              <h3 className="text-lg font-medium text-neutral-900 mb-2">No se encontraron vehículos</h3>
              <p className="text-neutral-600 mb-4">Intenta ajustar los filtros</p>
              {hasActive && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setTypeSel('Todos');
                    setBrandSel('Todas');
                    setTransSel('Todas');
                    setFuelSel('Todos');
                    setPriceMin(minMaxPrice.min);
                    setPriceMax(minMaxPrice.max);
                    setYearMin(minMaxYear.min);
                    setYearMax(minMaxYear.max);
                  }}
                  className="rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 border-neutral-800"
                >
                  Quitar todos los filtros
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 sm:mb-4 text-center">
                <p className="text-sm text-neutral-600">
                  <span className="font-semibold text-neutral-900">{filtered.length}</span> vehículos encontrados
                </p>
              </div>
              <VehicleList
                vehicles={filtered as any}
                columns={columns}
                getStatusColor={(s: string) => getStatusColor(s)}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                cardSettings={cardSettings}
                newBadgeText={newBadgeText}
                source="grid2"
              />
            </>
          )}
        </div>

        {children}
      </div>
    </section>
  );
};

// ✅ Propiedad craft sin errores TS gracias a CraftComponent
VehicleGrid2.craft = {
  displayName: 'VehicleGrid2',
  props: {
    title: 'Explora nuestro stock',
    subtitle: '',
    bgColor: '#ffffff',
    textColor: '#111827',
    columns: 3,
    showStatuses: ['Publicado', 'Reservado'],
    gradient: { from: '#000000', via: '#171717', to: '#404040', angle: 135 }, // 👈 default compartible
    cardSettings: [
      {
        cardBgColor: '#ffffff',
        cardBorderColor: '#e5e7eb',
        cardTextColor: '#1f2937',
        cardPriceColor: '#ffffff',
        cardButtonColor: '#224887',
        cardButtonTextColor: '#ffffff',
        detailsButtonText: 'Ver detalles',
        bannerPosition: 'right',
        pricePosition: 'overlay',
        featuresConfig: { feature1: 'category', feature2: 'year', feature3: 'fuel', feature4: 'mileage' },
      },
    ],
    newBadgeText: 'Recién publicado',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => true },
  isCanvas: true,
};
