import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import {
  Sparkles,
  RefreshCw,
  Loader2,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOperationAnalysis } from '@/hooks/useOperationAnalysis';

interface OperationAnalystProps {
  stats: any;
  kpis: any;
  inventoryKpis: any;
  salesAnalytics: any;
  alerts: { id: string; severity: string; message: string }[];
  dataLoading: boolean;
}

const HEALTH: Record<string, { label: string; chip: string }> = {
  critico: { label: 'Operación en riesgo', chip: 'bg-red-100 text-red-700' },
  atencion: { label: 'Necesita atención', chip: 'bg-amber-100 text-amber-700' },
  bien: { label: 'En buen camino', chip: 'bg-emerald-100 text-emerald-700' },
  excelente: { label: 'Operación saludable', chip: 'bg-emerald-100 text-emerald-700' },
};

const IMPACT: Record<string, { label: string; chip: string; dot: string }> = {
  alto: { label: 'Alto impacto', chip: 'text-red-600', dot: 'bg-red-500' },
  medio: { label: 'Impacto medio', chip: 'text-amber-600', dot: 'bg-amber-500' },
  bajo: { label: 'Impacto bajo', chip: 'text-slate-500', dot: 'bg-slate-400' },
};

export default function OperationAnalyst({
  stats,
  kpis,
  inventoryKpis,
  salesAnalytics,
  alerts,
  dataLoading,
}: OperationAnalystProps) {
  const [, navigate] = useLocation();
  const { analysis, loading, error, run } = useOperationAnalysis();
  const hasRun = useRef(false);

  // Snapshot compacto de la operación para mandarle a la IA. Defensivo: si un dato
  // no está, queda undefined y el prompt lo ignora.
  const context = useMemo(() => {
    const pct = (v: any) =>
      typeof v === 'number' ? Math.round(v * 1000) / 10 : undefined;
    return {
      kpis: {
        visitas_web: stats?.totalVisits,
        ventas_pendientes_de_aprobar: stats?.pendingSales,
        tasa_cierre_pct: pct(kpis?.closingRate?.value),
        leads_nuevos: kpis?.newLeads?.value,
        dias_promedio_en_stock: kpis?.avgDaysInStock?.value,
      },
      inventario: {
        total_activos: inventoryKpis?.totalActiveVehicles,
        publicados: inventoryKpis?.publishedStockCount,
        sin_publicar: inventoryKpis?.vehiclesNeverPublished,
        rotacion_anual: inventoryKpis?.inventoryTurnoverRate,
        autos_mas_antiguos: (inventoryKpis?.oldestVehicles || [])
          .slice(0, 6)
          .map((v: any) => ({
            marca: v?.brands?.name ?? v?.brand ?? v?.brand_name,
            modelo: v?.models?.name ?? v?.model ?? v?.model_name,
            patente: v?.license_plate,
            dias_en_stock: v?.daysInStock,
            precio: v?.price,
          })),
      },
      margenes: {
        margen_promedio_pct: salesAnalytics?.overall?.avgMargin,
        por_marca: (salesAnalytics?.byBrand || []).slice(0, 6).map((b: any) => ({
          marca: b?.brandName,
          vendidos: b?.totalSold,
          margen_prom_pct: b?.avgMargin,
          dias_prom_hasta_venta: b?.avgDaysFromCreation,
        })),
      },
      alertas_activas: (alerts || []).map((a) => ({
        tipo: a.id,
        severidad: a.severity,
        mensaje: a.message?.replace(/\*\*/g, ''),
      })),
    };
  }, [stats, kpis, inventoryKpis, salesAnalytics, alerts]);

  // Auto-análisis una vez cuando los datos están listos.
  useEffect(() => {
    if (dataLoading || hasRun.current) return;
    hasRun.current = true;
    run(context);
  }, [dataLoading, context, run]);

  const health = analysis ? HEALTH[analysis.health_label] ?? HEALTH.bien : null;

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-white to-violet-50/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-sky-500 flex items-center justify-center shadow-sm">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-800">Analista IA</h3>
            <p className="text-[11px] text-slate-400 leading-tight">
              Tu operación, leída por IA
            </p>
          </div>
        </div>
        <button
          onClick={() => run(context)}
          disabled={loading || dataLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {loading ? 'Analizando…' : 'Actualizar'}
        </button>
      </div>

      <div className="px-5 py-4">
        {/* Loading */}
        {loading && !analysis && (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 w-3/4 rounded bg-slate-100" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
            <div className="h-16 w-full rounded-xl bg-slate-100" />
            <div className="h-16 w-full rounded-xl bg-slate-100" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-amber-800">{error}</p>
              <button
                onClick={() => run(context)}
                className="mt-1 text-[12px] font-semibold text-amber-700 hover:text-amber-800"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Analysis */}
        {analysis && !loading && (
          <div className="space-y-4">
            {/* Briefing */}
            <div className="flex items-start gap-3">
              <p className="flex-1 text-[14px] leading-snug text-slate-700 font-medium">
                {analysis.headline}
              </p>
              {health && (
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    health.chip
                  )}
                >
                  {health.label}
                </span>
              )}
            </div>

            {/* Plays */}
            {analysis.plays?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">
                  Qué hacer ahora
                </p>
                {analysis.plays.map((play, i) => {
                  const imp = IMPACT[play.impact] ?? IMPACT.medio;
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-200/70 bg-white p-3.5 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[12px] font-bold text-white">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-[13.5px] font-semibold text-slate-800">
                              {play.title}
                            </h4>
                            <span
                              className={cn(
                                'shrink-0 inline-flex items-center gap-1 text-[10.5px] font-medium',
                                imp.chip
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', imp.dot)} />
                              {imp.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">
                            {play.why}
                          </p>
                          {play.action_label && play.href && (
                            <button
                              onClick={() => navigate(play.href!)}
                              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-900 text-white text-[12px] font-semibold px-2.5 py-1.5 hover:bg-slate-800 transition-colors"
                            >
                              {play.action_label}
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Patterns */}
            {analysis.patterns?.length > 0 && (
              <div className="rounded-xl bg-slate-50/80 border border-slate-200/60 p-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-400">
                  <Lightbulb className="h-3.5 w-3.5" /> Lo que quizás no viste
                </p>
                <ul className="space-y-1.5">
                  {analysis.patterns.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12.5px] text-slate-600">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                      <span className="leading-snug">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[10.5px] text-slate-300">
              Generado por IA a partir de tus datos. Verifica antes de decisiones grandes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
