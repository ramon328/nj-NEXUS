import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity, Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { StateMetrics } from '@/hooks/admin/usePreparationMetrics';
import { Status } from '@/hooks/useStatuses';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';

interface PreparationMetricsCardProps {
  metrics: StateMetrics;
  loading: boolean;
  availableStates: Status[];
  selectedStateId: number | undefined;
  onStateChange: (stateId: number) => void;
  statesLoading?: boolean;
}

export default function PreparationMetricsCard({
  metrics,
  loading,
  availableStates,
  selectedStateId,
  onStateChange,
  statesLoading,
}: PreparationMetricsCardProps) {
  const { i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const locale = i18n.language?.toLowerCase().startsWith('es') ? es : enUS;
  const dv = (esText: string, enText: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? esText : enText;

  const selectedState = availableStates.find(s => s.id === selectedStateId);
  const selectedStateName = selectedState?.name || dv('Estado', 'State');

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy', { locale });
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-48 bg-slate-100 animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="h-40 bg-slate-50 animate-pulse rounded-xl" />
      </div>
    );
  }

  const displayedRecords = isExpanded ? metrics.records : metrics.records.slice(0, 5);

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-slate-900">
                {dv('Métricas por Estado', 'Metrics by State')}
              </h3>
              <p className="text-[12px] text-slate-400">
                {dv('Seguimiento por estado del flujo', 'Tracking by workflow state')}
              </p>
            </div>
          </div>
          <Select
            value={selectedStateId?.toString() || ''}
            onValueChange={(value) => onStateChange(Number(value))}
            disabled={statesLoading || availableStates.length === 0}
          >
            <SelectTrigger className={`h-auto px-3 py-2 rounded-xl border shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] text-[13px] font-medium gap-2 w-auto min-w-[180px] ${
              selectedStateId
                ? 'border-transparent bg-violet-50 text-violet-700 ring-2 ring-violet-500'
                : 'border-slate-200/60 bg-white text-slate-700'
            }`}>
              <SelectValue placeholder={dv('Seleccionar estado', 'Select state')} />
            </SelectTrigger>
            <SelectContent>
              {availableStates.map((state) => (
                <SelectItem key={state.id} value={state.id.toString()}>
                  <div className="flex items-center gap-2">
                    {state.color && (
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: state.color }}
                      />
                    )}
                    {state.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="px-5 pb-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50/60 rounded-xl p-3 text-center">
            <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-emerald-700">{metrics.totalCompleted}</p>
            <p className="text-[11px] text-emerald-600">{dv('Completados', 'Completed')}</p>
          </div>
          <div className="bg-blue-50/60 rounded-xl p-3 text-center">
            <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-blue-700">{metrics.averageDays}</p>
            <p className="text-[11px] text-blue-600">{dv('Días promedio', 'Avg. days')}</p>
          </div>
          <div className="bg-amber-50/60 rounded-xl p-3 text-center">
            <AlertCircle className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-700">{metrics.currentlyInState}</p>
            <p className="text-[11px] text-amber-600">{dv('En estado', 'In state')}</p>
          </div>
        </div>
      </div>

      {/* Records Table */}
      {metrics.records.length > 0 ? (
        <div className="overflow-x-auto">
          {/* Desktop header */}
          <div className="hidden lg:grid grid-cols-[1.5fr_0.8fr_1fr_1fr_0.5fr_0.8fr] px-5 py-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider border-t border-slate-100">
            <span>{dv('Vehículo', 'Vehicle')}</span>
            <span>{dv('Patente', 'License')}</span>
            <span>{dv('Entrada', 'Entry')}</span>
            <span>{dv('Salida', 'Exit')}</span>
            <span className="text-center">{dv('Días', 'Days')}</span>
            <span>{dv('Estado', 'Status')}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {displayedRecords.map((record, index) => (
              <div key={`${record.vehicleId}-${record.enteredAt}-${index}`}>
                {/* Desktop row */}
                <div className="hidden lg:grid grid-cols-[1.5fr_0.8fr_1fr_1fr_0.5fr_0.8fr] items-center px-5 py-2.5 hover:bg-slate-50/50 transition-colors">
                  <span className="text-[13px] font-medium text-slate-900 truncate">{record.vehicleName}</span>
                  <span className="text-[12px] text-slate-500">{record.licensePlate}</span>
                  <span className="text-[12px] text-slate-500">{formatDate(record.enteredAt)}</span>
                  <span className="text-[12px] text-slate-500">{record.exitedAt ? formatDate(record.exitedAt) : '—'}</span>
                  <span className="text-[13px] font-semibold text-slate-900 text-center">{record.daysInState}</span>
                  <span>
                    {record.isCurrentlyInState ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-amber-700 bg-amber-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {dv('En estado', 'In state')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-emerald-700 bg-emerald-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {dv('Completado', 'Completed')}
                      </span>
                    )}
                  </span>
                </div>

                {/* Mobile card */}
                <div className="lg:hidden px-5 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-slate-900 truncate">{record.vehicleName}</p>
                    {record.isCurrentlyInState ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 text-amber-700 bg-amber-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {dv('En estado', 'In state')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 text-emerald-700 bg-emerald-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {dv('Completado', 'Completed')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{record.licensePlate}</span>
                    <span className="text-slate-300">·</span>
                    <span>{record.daysInState} {dv('días', 'days')}</span>
                    <span className="text-slate-300">·</span>
                    <span>{formatDate(record.enteredAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show more/less button */}
          {metrics.records.length > 5 && (
            <div className="px-5 pb-4">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full mt-2 py-2 text-[12px] text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 transition-colors rounded-xl hover:bg-slate-50"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    {dv('Ver menos', 'Show less')}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    {dv(`Ver todos (${metrics.records.length})`, `Show all (${metrics.records.length})`)}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="px-5 pb-5">
          <div className="text-center py-8 rounded-xl bg-slate-50/50">
            <Activity className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-[13px] text-slate-400">
              {dv(
                `No hay registros de "${selectedStateName}" en este período`,
                `No "${selectedStateName}" records in this period`
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
