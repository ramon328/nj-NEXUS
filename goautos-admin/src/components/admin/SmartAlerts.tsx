import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, CheckCircle, ArrowRight, X } from 'lucide-react';
import { SmartAlert, AlertSeverity } from '@/hooks/admin/useSmartAlerts';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES: Record<AlertSeverity, { border: string; bg: string; text: string }> = {
  critical: { border: 'border-l-red-400', bg: 'bg-red-100', text: 'text-red-600' },
  warning:  { border: 'border-l-amber-400', bg: 'bg-amber-100', text: 'text-amber-600' },
  info:     { border: 'border-l-blue-400', bg: 'bg-blue-100', text: 'text-blue-600' },
};

function parseBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

type Tab = 'all' | 'alerts' | 'recommendations';

interface Props {
  alerts: SmartAlert[];
  loading: boolean;
}

export default function SmartAlerts({ alerts, loading }: Props) {
  const [, navigate] = useLocation();
  const { t } = useTranslation('dashboard');
  const [tab, setTab] = useState<Tab>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const { alertItems, recommendationItems } = useMemo(() => {
    const alertItems = alerts.filter(a => a.kind === 'alert');
    const recommendationItems = alerts.filter(a => a.kind === 'recommendation');
    return { alertItems, recommendationItems };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    let items = alerts;
    if (tab === 'alerts') items = alertItems;
    if (tab === 'recommendations') items = recommendationItems;
    return items.filter(a => !dismissedIds.has(a.id));
  }, [alerts, alertItems, recommendationItems, tab, dismissedIds]);

  const dismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const totalCount = alerts.filter(a => !dismissedIds.has(a.id)).length;
  const alertsCount = alertItems.filter(a => !dismissedIds.has(a.id)).length;
  const recsCount = recommendationItems.filter(a => !dismissedIds.has(a.id)).length;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: totalCount },
    { key: 'alerts', label: 'Alertas', count: alertsCount },
    { key: 'recommendations', label: 'Sugerencias', count: recsCount },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white h-full flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-semibold text-[#171717] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-500" />
            {t('smartAlerts.title')}
            {!loading && alertsCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                {alertsCount}
              </span>
            )}
          </h3>
          <button
            onClick={() => navigate('/alertas-inteligentes')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-semibold transition-colors"
          >
            Ir a alertas
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Tabs */}
        {!loading && (
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 mt-3">
            {tabs.map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex-1 px-2.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all',
                  tab === key
                    ? 'bg-white text-slate-900 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.08)]'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 px-5 pb-5 pt-3">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('smartAlerts.allGood')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('smartAlerts.allGoodDesc')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map(alert => {
                const styles = SEVERITY_STYLES[alert.severity];
                const Icon = alert.icon;
                const isClickable = !!alert.href;

                return (
                  <div
                    key={alert.id}
                    className={cn("flex items-start gap-3 p-3 rounded-xl border-l-[3px] hover:bg-slate-50/50 transition-colors group", styles.border)}
                  >
                    {/* Icon */}
                    <div className={cn('h-9 w-9 rounded-full flex items-center justify-center shrink-0', styles.bg)}>
                      <Icon className={cn('h-4 w-4', styles.text)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-slate-700 leading-snug">
                        {parseBold(alert.message)}
                      </p>
                      {alert.actionLabel && isClickable && (
                        <button
                          onClick={() => navigate(alert.href!)}
                          className="text-xs text-primary font-medium mt-1 inline-flex items-center gap-0.5 hover:text-primary/80 transition-colors"
                        >
                          {alert.actionLabel} <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Dismiss */}
                    <button
                      onClick={() => dismiss(alert.id)}
                      className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
