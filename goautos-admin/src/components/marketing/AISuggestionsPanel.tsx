import { ArrowRight, Lightbulb } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SmartAlert } from '@/hooks/admin/useSmartAlerts';
import { cn } from '@/lib/utils';

function parseBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{part}</strong> : part
  );
}

function getRelativeTime(index: number): string {
  const times = ['Hace 2 horas', 'Hace 5 horas', 'Hace 8 horas', 'Ahora', 'Hace 1 día', 'Hace 3 horas'];
  return times[index % times.length];
}

const SEVERITY_CTA: Record<string, string> = {
  critical: 'text-red-600 border-red-200 hover:bg-red-50',
  warning: 'text-amber-600 border-amber-200 hover:bg-amber-50',
  info: 'text-blue-600 border-blue-200 hover:bg-blue-50',
};

interface AISuggestionsPanelProps {
  alerts: SmartAlert[];
  loading: boolean;
}

export default function AISuggestionsPanel({ alerts, loading }: AISuggestionsPanelProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 shrink-0">
        <h3 className="text-sm sm:text-base font-semibold text-gray-900">
          Sugerencias de la IA para tu Inventario
        </h3>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-4 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-3 pt-1">
                  <Skeleton className="h-8 w-36 rounded-full" />
                  <Skeleton className="h-8 w-32 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
              <Lightbulb className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">Todo en orden</p>
            <p className="text-[13px] text-gray-400 mt-1">No hay sugerencias pendientes.</p>
          </div>
        ) : (
          <div>
            {alerts.map((alert, index) => {
              const Icon = alert.icon;
              const ctaStyle = SEVERITY_CTA[alert.severity] || SEVERITY_CTA.info;

              return (
                <div
                  key={alert.id}
                  className="py-4 border-b border-gray-100 last:border-b-0"
                >
                  {/* Icon + message + time */}
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      alert.severity === 'critical' ? 'bg-red-50' :
                      alert.severity === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                    )}>
                      <Icon className={cn(
                        'h-4 w-4',
                        alert.severity === 'critical' ? 'text-red-500' :
                        alert.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 mb-1">
                        <p className="text-[13px] sm:text-[14px] text-gray-600 leading-relaxed">
                          {parseBold(alert.message)}
                        </p>
                        <span className="text-[11px] sm:text-[12px] text-gray-400 whitespace-nowrap shrink-0">
                          {getRelativeTime(index)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2.5">
                        {alert.actionLabel && alert.href && (
                          <a
                            href={alert.href}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-[12px] sm:text-[13px] font-medium border rounded-full transition-colors',
                              ctaStyle
                            )}
                          >
                            {alert.actionLabel}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
