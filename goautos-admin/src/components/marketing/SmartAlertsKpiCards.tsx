import { useState, useEffect, useRef } from 'react';
import { Eye, Users, Percent, Car, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BusinessKpis } from '@/hooks/admin/useBusinessKpis';

/* ── Animated counter ── */
function useAnimatedNumber(target: number, isLoading: boolean, duration = 900): number {
  const [current, setCurrent] = useState(0);
  const prevRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (isLoading) return;
    const from = prevRef.current;
    const to = target;
    prevRef.current = target;
    if (from === to) { setCurrent(to); return; }
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrent(from + (to - from) * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, isLoading, duration]);

  return current;
}

function computeChange(current: number, prev: number | null | undefined): number | null {
  if (prev == null || prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

interface SmartAlertsKpiCardsProps {
  totalVisits: number;
  kpis: BusinessKpis;
  loading: boolean;
}

export default function SmartAlertsKpiCards({ totalVisits, kpis, loading }: SmartAlertsKpiCardsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cards = [
    {
      label: 'Visitas Web',
      value: totalVisits,
      format: (n: number) => Math.round(n).toLocaleString('es-CL'),
      change: null as number | null,
      icon: Eye,
    },
    {
      label: 'Leads Generados',
      value: kpis.newLeads.value,
      format: (n: number) => Math.round(n).toLocaleString('es-CL'),
      change: computeChange(kpis.newLeads.value, kpis.newLeads.prevValue),
      icon: Users,
    },
    {
      label: 'Tasa de Conversión',
      value: kpis.closingRate.value * 100,
      format: (n: number) => `${n.toFixed(1)}%`,
      change: computeChange(kpis.closingRate.value, kpis.closingRate.prevValue),
      icon: Percent,
    },
    {
      label: 'Vehículos Vendidos',
      value: kpis.vehiclesSold.value,
      format: (n: number) => Math.round(n).toLocaleString('es-CL'),
      change: computeChange(kpis.vehiclesSold.value, kpis.vehiclesSold.prevValue),
      icon: Car,
    },
  ];

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.children.length === 0) return;
    const child = el.children[0] as HTMLElement;
    const step = child.offsetWidth + 12;
    const idx = Math.round(el.scrollLeft / step);
    setActiveIndex(Math.min(Math.max(idx, 0), cards.length - 1));
  };

  return (
    <div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-3 sm:grid sm:gap-3 sm:overflow-visible sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((kpi) => {
          const Icon = kpi.icon;
          const animated = useAnimatedNumber(kpi.value, loading);
          const hasChange = kpi.change != null;
          const isPositive = (kpi.change ?? 0) >= 0;

          return (
            <div
              key={kpi.label}
              className={cn(
                'rounded-2xl bg-white border border-slate-200/60',
                'min-w-[88%] shrink-0 snap-start sm:min-w-0 sm:shrink',
              )}
            >
              {/* Desktop layout — matches Inicio StatCard */}
              <div className="hidden sm:flex items-start justify-between py-3 px-3 md:py-4 md:px-4">
                <div className="flex-1 min-w-0">
                  {loading ? (
                    <div className="h-7 w-20 bg-slate-100 animate-pulse rounded-lg" />
                  ) : (
                    <h4 className="font-semibold text-lg md:text-xl tracking-tight text-slate-900 truncate tabular-nums">
                      {kpi.format(animated)}
                    </h4>
                  )}
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <p className="text-[13px] text-slate-500">{kpi.label}</p>
                    {hasChange && !loading ? (
                      <p className={cn('text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-rose-600')}>
                        {isPositive ? '↑' : '↓'} {Math.abs(kpi.change!).toFixed(1)}%
                      </p>
                    ) : (
                      <p className="text-xs invisible" aria-hidden>-</p>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-slate-600" />
                  </div>
                </div>
              </div>

              {/* Mobile layout */}
              <div className="sm:hidden p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-slate-500 font-medium">{kpi.label}</p>
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-slate-600" />
                  </div>
                </div>
                {loading ? (
                  <div className="h-8 w-24 bg-slate-100 animate-pulse rounded-lg" />
                ) : (
                  <span className="text-[28px] font-bold text-slate-900 tracking-tight leading-none tabular-nums">
                    {kpi.format(animated)}
                  </span>
                )}
                {hasChange && !loading ? (
                  <p className={cn('text-xs font-medium', isPositive ? 'text-emerald-600' : 'text-rose-600')}>
                    {isPositive ? '↑' : '↓'} {Math.abs(kpi.change!).toFixed(1)}%
                  </p>
                ) : (
                  <p className="text-xs invisible" aria-hidden>-</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination dots — mobile only */}
      <div className="flex justify-center gap-2 pt-3 sm:hidden">
        {cards.map((_, i) => (
          <button
            key={i}
            aria-label={`Card ${i + 1}`}
            className={cn(
              'rounded-full transition-all duration-300',
              activeIndex === i ? 'h-2 w-6 bg-slate-400' : 'h-2 w-2 bg-slate-200'
            )}
            onClick={() => {
              const el = scrollRef.current;
              if (!el) return;
              const child = el.children[i] as HTMLElement;
              if (child) el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
            }}
          />
        ))}
      </div>
    </div>
  );
}
