import { useMemo } from 'react';
import GaugeComponent from '@knowyourdeveloper/react-gauge-component';
import { Activity, ArrowRight, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SalesAnalytics } from '@/hooks/admin/types/inventoryAnalytics';
import { InventoryKpis } from '@/hooks/admin/useInventoryKpis';
import { BusinessKpis } from '@/hooks/admin/useBusinessKpis';

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  // Convert RGB to HSL
  const toHsl = ([r, g, bl]: number[]): [number, number, number] => {
    r /= 255; g /= 255; bl /= 255;
    const max = Math.max(r, g, bl), min = Math.min(r, g, bl);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - bl) / d + (g < bl ? 6 : 0)) / 6;
    else if (max === g) h = ((bl - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return [h * 360, s, l];
  };
  // Convert HSL to hex
  const hslToHex = (h: number, s: number, l: number): string => {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = Math.round(hue2rgb(p, q, h / 360 + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h / 360) * 255);
    const bl = Math.round(hue2rgb(p, q, h / 360 - 1/3) * 255);
    return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
  };
  const [h1, s1, l1] = toHsl(parse(a));
  const [h2, s2, l2] = toHsl(parse(b));
  return hslToHex(h1 + (h2 - h1) * t, s1 + (s2 - s1) * t, l1 + (l2 - l1) * t);
}

function getHealthBadge(score: number): { label: string; color: string } {
  const t = Math.min(Math.max(score / 100, 0), 1);
  const color = lerpColor('#ef4444', '#10b981', t);
  if (score < 40) return { label: score < 30 ? 'Operación en Riesgo' : 'Necesita Atención', color: '#ef4444' };
  if (score < 50) return { label: 'Necesita Atención', color };
  if (score < 70) return { label: 'En Buen Camino', color };
  if (score < 85) return { label: 'Operación Saludable', color };
  return { label: 'Excelente Operación', color };
}

function computeHealthScore(
  salesAnalytics: SalesAnalytics | null,
  inventoryKpis: InventoryKpis,
  kpis: BusinessKpis,
): number {
  // Margin score (25%): -10 → 0, +20 → 100
  const margin = salesAnalytics?.overall.avgMargin ?? 0;
  const marginScore = Math.min(Math.max((margin + 10) / 30 * 100, 0), 100);

  // Closing rate score (20%): 0 → 0, 0.15 → 100
  const closingScore = Math.min(Math.max(kpis.closingRate.value / 0.15 * 100, 0), 100);

  // Published % score (20%)
  const total = inventoryKpis.totalActiveVehicles || 1;
  const publishedScore = Math.min((inventoryKpis.publishedStockCount / total) * 100, 100);

  // Inventory freshness score (20%): 0 days → 100, 120+ days → 0
  const avgDays = kpis.avgDaysInStock.value;
  const freshnessScore = Math.max(100 - (avgDays / 120) * 100, 0);

  // Stock turnover score (15%): 0 → 0, 4x/yr → 100
  const turnoverScore = Math.min((inventoryKpis.inventoryTurnoverRate / 4) * 100, 100);

  return (
    marginScore * 0.25 +
    closingScore * 0.20 +
    publishedScore * 0.20 +
    freshnessScore * 0.20 +
    turnoverScore * 0.15
  );
}

interface CompetitiveRadarProps {
  salesAnalytics: SalesAnalytics | null;
  inventoryKpis: InventoryKpis;
  kpis: BusinessKpis;
  loading: boolean;
}

export default function CompetitiveRadar({ salesAnalytics, inventoryKpis, kpis, loading }: CompetitiveRadarProps) {
  const healthScore = useMemo(
    () => computeHealthScore(salesAnalytics, inventoryKpis, kpis),
    [salesAnalytics, inventoryKpis, kpis],
  );
  const badge = getHealthBadge(healthScore);

  const actionItems = useMemo(() => {
    const items: string[] = [];

    if (salesAnalytics) {
      const slowBrands = salesAnalytics.byBrand
        .filter(b => b.avgDaysFromCreation > 60 && b.totalSold >= 1)
        .sort((a, b) => b.avgDaysFromCreation - a.avgDaysFromCreation);
      if (slowBrands.length > 0) {
        items.push(`Revisar precios de ${slowBrands[0].brandName} (prom. ${Math.round(slowBrands[0].avgDaysFromCreation)} días en stock)`);
      }
    }

    const oldStock = (inventoryKpis.oldestVehicles || []).filter(v => v.daysInStock > 90);
    if (oldStock.length > 0) {
      items.push(`Revisar ${oldStock.length} vehículo${oldStock.length > 1 ? 's' : ''} con más de 90 días en stock`);
    }

    if (inventoryKpis.vehiclesNeverPublished > 0) {
      items.push(`Subir ${inventoryKpis.vehiclesNeverPublished} vehículo${inventoryKpis.vehiclesNeverPublished > 1 ? 's' : ''} sin publicar`);
    }

    if (salesAnalytics && salesAnalytics.recommendations.bestOverall.length > 0) {
      const best = salesAnalytics.recommendations.bestOverall[0];
      items.push(`Aumentar stock de ${best.brandName} (score ${best.overallScore}/100)`);
    }

    if (kpis.closingRate.value > 0 && kpis.closingRate.value < 0.05 && kpis.newLeads.value > 5) {
      items.push('Mejorar seguimiento de leads (tasa de cierre baja)');
    }

    return items.slice(0, 4);
  }, [salesAnalytics, inventoryKpis, kpis]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-24 w-40 mx-auto rounded-xl" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
            <Activity className="h-4 w-4 text-slate-600" />
          </div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-[15px] font-semibold text-slate-800">Salud de tu Operación</h3>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-slate-400 hover:text-slate-500 transition-colors">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6} className="max-w-[240px] rounded-xl bg-slate-900 text-white border-0 px-3 py-2.5">
                  <p className="text-[12px] leading-relaxed">Evalúa 5 aspectos: margen de ventas, tasa de cierre, vehículos publicados, antigüedad del inventario y rotación de stock.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="px-5 pb-5 space-y-4">
        {/* Gauge + badge */}
        <div className="flex flex-col items-center">
          <div className="relative w-[288px]">
            <GaugeComponent
              type="semicircle"
              marginInPercent={0.05}
              value={healthScore}
              minValue={0}
              maxValue={100}
              arc={{
                colorArray: ['#ef4444', '#10b981'],
                padding: 0.02,
                width: 0.25,
                subArcs: [
                  { limit: 40 },
                  { limit: 60 },
                  { limit: 70 },
                  {},
                  {},
                  {},
                  {},
                ],
              }}
              pointer={{ type: 'blob', animationDelay: 0, width: 15 }}
              labels={{
                valueLabel: { hide: true },
                tickLabels: { hideMinMax: true },
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-2xl font-bold text-slate-700 tabular-nums mt-4">
                {Math.round(healthScore)}%
              </p>
            </div>
          </div>
          <span
            className="-mt-6 px-3 py-1 rounded-full text-[12px] font-medium"
            style={{ backgroundColor: `${badge.color}20`, color: badge.color }}
          >
            {badge.label}
          </span>
        </div>

        {/* Action plan */}
        {actionItems.length > 0 && (
          <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-4">
            <p className="text-[11px] font-bold text-slate-500 mb-2.5 uppercase tracking-[0.06em]">Plan de acción</p>
            <div className="space-y-2">
              {actionItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                  <span className="text-[13px] text-slate-600 leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <a
          href="/vehiculos"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-sky-500 hover:text-sky-600 transition-colors"
        >
          Implementar acciones
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
