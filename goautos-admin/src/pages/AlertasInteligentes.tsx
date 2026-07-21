import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminDashboardData } from '@/hooks/admin/useAdminDashboardData';
import { useInventoryKpis } from '@/hooks/admin/useInventoryKpis';
import { useSalesAnalytics } from '@/hooks/admin/useSalesAnalytics';
import { useSmartAlerts, SmartAlert, AlertSeverity } from '@/hooks/admin/useSmartAlerts';
import { DateFilter, ConsignmentFilter } from '@/hooks/admin/useSellerPerformance';
import { supabase } from '@/integrations/supabase/client';
import posthog from '@/utils/posthog';
import DashboardLayout from '@/components/DashboardLayout';
import SmartAlertsKpiCards from '@/components/marketing/SmartAlertsKpiCards';
import CompetitiveRadar from '@/components/marketing/CompetitiveRadar';
import OperationAnalyst from '@/components/marketing/OperationAnalyst';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, CheckCircle, ArrowRight, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type TimeKey = 'today' | 'last3' | 'week' | 'month';
type VehicleTab = 'all' | 'own' | 'consigned';
type AlertTab = 'all' | 'alerts' | 'recommendations';

const TIME_OPTIONS: { key: TimeKey; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'last3', label: 'Últimos 3 días' },
  { key: 'week', label: 'Última semana' },
  { key: 'month', label: 'Último mes' },
];

const VEHICLE_TABS: { key: VehicleTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'own', label: 'Propios' },
  { key: 'consigned', label: 'Consignados' },
];

const VEHICLE_TAB_TO_FILTER: Record<VehicleTab, ConsignmentFilter> = {
  all: 'all',
  own: 'not_consigned',
  consigned: 'consigned',
};

const SEVERITY_STYLES: Record<AlertSeverity, { border: string; bg: string; text: string }> = {
  critical: { border: 'border-l-red-400', bg: 'bg-red-100', text: 'text-red-600' },
  warning:  { border: 'border-l-amber-400', bg: 'bg-amber-100', text: 'text-amber-600' },
  info:     { border: 'border-l-sky-400', bg: 'bg-sky-100', text: 'text-sky-600' },
};

function parseBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

function buildDateFilter(timeKey: TimeKey, consignment: ConsignmentFilter): DateFilter {
  const now = new Date();
  const base: DateFilter = { consignmentFilter: consignment };

  switch (timeKey) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { ...base, startDate: start, endDate: now };
    }
    case 'last3': {
      const start = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return { ...base, startDate: start, endDate: now };
    }
    case 'week': {
      const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
      return { ...base, startDate: start, endDate: now };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { ...base, startDate: start, endDate: now };
    }
    default:
      return base;
  }
}

export default function AlertasInteligentes() {
  const { clientId, user } = useAuth();
  const [, navigate] = useLocation();
  const clientIdNumber = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;

  const [timeFilter, setTimeFilter] = useState<TimeKey>('month');
  const [vehicleTab, setVehicleTab] = useState<VehicleTab>('all');
  const [alertTab, setAlertTab] = useState<AlertTab>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Track page view
  useEffect(() => {
    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'smart_alerts_viewed',
      properties: { client_id: clientIdNumber },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const consignmentFilter = VEHICLE_TAB_TO_FILTER[vehicleTab];
  const dateFilter = useMemo(
    () => buildDateFilter(timeFilter, consignmentFilter),
    [timeFilter, consignmentFilter]
  );

  const { stats, loading: dashLoading, kpis } = useAdminDashboardData(dateFilter);
  const { kpis: inventoryKpis, loading: invLoading } = useInventoryKpis(clientIdNumber, dateFilter);
  const { analytics: salesAnalytics, loading: salesLoading } = useSalesAnalytics(clientIdNumber, dateFilter);

  const dataLoading = dashLoading || invLoading || salesLoading;

  const { alerts, loading: alertsLoading } = useSmartAlerts(
    clientIdNumber, stats, inventoryKpis, kpis, salesAnalytics, dataLoading,
  );

  // ── Alert filtering ──
  const { alertItems, recommendationItems } = useMemo(() => {
    const alertItems = alerts.filter(a => a.kind === 'alert');
    const recommendationItems = alerts.filter(a => a.kind === 'recommendation');
    return { alertItems, recommendationItems };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    let items = alerts;
    if (alertTab === 'alerts') items = alertItems;
    if (alertTab === 'recommendations') items = recommendationItems;
    return items.filter(a => !dismissedIds.has(a.id));
  }, [alerts, alertItems, recommendationItems, alertTab, dismissedIds]);

  const totalCount = alerts.filter(a => !dismissedIds.has(a.id)).length;
  const alertsCount = alertItems.filter(a => !dismissedIds.has(a.id)).length;
  const recsCount = recommendationItems.filter(a => !dismissedIds.has(a.id)).length;

  const dismiss = (id: string) => setDismissedIds(prev => new Set(prev).add(id));

  const alertTabs: { key: AlertTab; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: totalCount },
    { key: 'alerts', label: 'Alertas', count: alertsCount },
    { key: 'recommendations', label: 'Sugerencias', count: recsCount },
  ];

  // ── Notify on new alerts ──
  const seenAlertIds = useRef<Set<string>>(new Set());
  const initialLoad = useRef(true);

  useEffect(() => {
    if (alertsLoading || !clientIdNumber || alerts.length === 0) return;

    if (initialLoad.current) {
      seenAlertIds.current = new Set(alerts.map(a => a.id));
      initialLoad.current = false;
      return;
    }

    const newAlerts = alerts.filter(a => !seenAlertIds.current.has(a.id));
    if (newAlerts.length === 0) return;

    newAlerts.forEach(a => seenAlertIds.current.add(a.id));

    (async () => {
      try {
        const { data: client } = await supabase
          .from('clients')
          .select('push_notification_settings')
          .eq('id', clientIdNumber)
          .single();

        const prefs = client?.push_notification_settings as Record<string, boolean> | null;
        if (prefs && prefs.smart_alert === false) return;

        for (const alert of newAlerts) {
          try {
            await supabase.from('notifications').insert({
              client_id: clientIdNumber,
              type: 'smart_alert',
              title: 'Alerta Inteligente',
              body: alert.message.replace(/\*\*/g, ''),
              icon: 'zap',
              url: alert.href || '/alertas-inteligentes',
              data: { alert_id: alert.id, severity: alert.severity },
            });
          } catch (err) {
            console.error('[AlertasInteligentes] Error creating notification:', err);
          }
        }

        try {
          await supabase.functions.invoke('send-push-notification', {
            body: { processQueue: true },
          });
        } catch {}

        posthog.capture({
          distinctId: user?.id || 'anonymous',
          event: 'smart_alert_auto_notification_configured',
          properties: {
            alerts_count: newAlerts.length,
            alert_severities: newAlerts.map(a => a.severity),
            client_id: clientIdNumber,
          },
        });
      } catch (err) {
        console.error('[AlertasInteligentes] Error checking preferences:', err);
      }
    })();
  }, [alerts, alertsLoading, clientIdNumber]);

  return (
    <DashboardLayout>
      <main className="flex flex-col h-full bg-[#f5f5f7]">
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-[#f5f5f7] border-b border-slate-200/60">
          <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-2 sm:pb-3 max-w-[1400px] mx-auto">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-[15px] font-semibold text-slate-800">Alertas</h1>
              </div>

              <div className="flex items-center gap-2">
                {/* Vehicle type pills */}
                <div className="flex gap-1">
                  {VEHICLE_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setVehicleTab(tab.key)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap transition-all',
                        vehicleTab === tab.key
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-500 hover:bg-slate-200/60'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Time filter dropdown */}
                <Select
                  value={timeFilter}
                  onValueChange={(val: string) => {
                    const key = val as TimeKey;
                    posthog.capture({
                      distinctId: user?.id || 'anonymous',
                      event: 'smart_alert_time_filter_changed',
                      properties: { filter_period: key },
                    });
                    setTimeFilter(key);
                  }}
                >
                  <SelectTrigger className="h-8 w-auto min-w-[130px] rounded-xl border-slate-200/60 bg-white text-[12px] font-medium text-slate-600 focus:ring-1 focus:ring-sky-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key} className="text-[12px]">{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-3 max-w-[1400px] mx-auto space-y-3">

            {/* ── KPI Cards ── */}
            <SmartAlertsKpiCards
              totalVisits={stats.totalVisits}
              kpis={kpis}
              loading={dataLoading}
            />

            {/* ── Analista IA: briefing + jugadas accionables (Claude vía servidor GAIA) ── */}
            <OperationAnalyst
              stats={stats}
              kpis={kpis}
              inventoryKpis={inventoryKpis}
              salesAnalytics={salesAnalytics}
              alerts={alerts}
              dataLoading={dataLoading}
            />

            {/* ── Alerts + Radar (side by side) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Alerts Panel */}
            <div className="rounded-2xl border border-slate-200/60 bg-white">
              {/* Header */}
              <div className="px-5 pt-5 pb-0">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-slate-500" />
                    Alertas
                    {!alertsLoading && alertsCount > 0 && (
                      <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                        {alertsCount}
                      </span>
                    )}
                  </h3>

                  {/* Tabs */}
                  {!alertsLoading && (
                    <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
                      {alertTabs.map(({ key, label, count }) => (
                        <button
                          key={key}
                          onClick={() => setAlertTab(key)}
                          className={cn(
                            'px-2.5 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all',
                            alertTab === key
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
              </div>

              {/* Alert items */}
              <div className="px-5 pb-5 pt-3">
                {alertsLoading ? (
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
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-900">Todo en orden</p>
                    <p className="text-xs text-slate-400">No hay alertas pendientes por revisar</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAlerts.map(alert => {
                      const styles = SEVERITY_STYLES[alert.severity];
                      const Icon = alert.icon;

                      return (
                        <div
                          key={alert.id}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-xl border-l-[3px] hover:bg-slate-50/50 transition-colors group',
                            styles.border
                          )}
                        >
                          <div className={cn('h-9 w-9 rounded-full flex items-center justify-center shrink-0', styles.bg)}>
                            <Icon className={cn('h-4 w-4', styles.text)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-slate-700 leading-snug">
                              {parseBold(alert.message)}
                            </p>
                            {alert.actionLabel && alert.href && (
                              <button
                                onClick={() => navigate(alert.href!)}
                                className="text-xs text-sky-500 font-medium mt-1 inline-flex items-center gap-0.5 hover:text-sky-600 transition-colors"
                              >
                                {alert.actionLabel} <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>

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
              </div>
            </div>

              {/* Competitive Radar */}
              <CompetitiveRadar
                salesAnalytics={salesAnalytics}
                inventoryKpis={inventoryKpis}
                kpis={kpis}
                loading={dataLoading}
              />
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
