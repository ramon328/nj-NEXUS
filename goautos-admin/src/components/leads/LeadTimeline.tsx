import { useTranslation } from 'react-i18next';
import { History, UserPlus, UserMinus, RefreshCw, Plus, ArrowRightLeft, FileText } from 'lucide-react';
import { LeadActivityEntry } from '@/hooks/useLeadActivityLog';
import { AssignableSeller } from '@/hooks/useAssignableSellers';

interface LeadTimelineProps {
  entries: LeadActivityEntry[];
  isLoading: boolean;
  /** Para resolver nombres de vendedor en eventos de asignación (si está disponible). */
  sellers?: AssignableSeller[];
}

const EVENT_ICON: Record<string, typeof Plus> = {
  created: Plus,
  assigned: UserPlus,
  reassigned: ArrowRightLeft,
  unassigned: UserMinus,
  status_changed: RefreshCw,
  notes_changed: FileText,
};

function actorName(e: LeadActivityEntry): string | null {
  if (e.actor) {
    const n = `${e.actor.first_name || ''} ${e.actor.last_name || ''}`.trim();
    if (n) return n;
  }
  return null;
}

export default function LeadTimeline({ entries, isLoading, sellers = [] }: LeadTimelineProps) {
  const { t } = useTranslation('leadsPage');

  const sellerNameById = (id: unknown): string => {
    const n = Number(id);
    if (!Number.isFinite(n)) return '';
    const s = sellers.find((x) => x.id === n);
    if (s) return `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email || `#${n}`;
    return `#${n}`;
  };

  const statusLabel = (s: unknown): string => (s ? t(`status.${s}`, String(s)) : '—');

  const sourceLabel = (src: LeadActivityEntry['source']): string => {
    if (!src) return '';
    return t(`timeline.source.${src}`, src);
  };

  const describe = (e: LeadActivityEntry): string => {
    const md = e.metadata || {};
    switch (e.event_type) {
      case 'created': {
        const src = sourceLabel(e.source);
        return src ? t('timeline.created_from', { source: src, defaultValue: `Lead creado ({{source}})` }) : t('timeline.created', 'Lead creado');
      }
      case 'assigned':
        return t('timeline.assigned', { name: sellerNameById(md.to), defaultValue: 'Asignado a {{name}}' });
      case 'reassigned':
        return t('timeline.reassigned', { name: sellerNameById(md.to), defaultValue: 'Reasignado a {{name}}' });
      case 'unassigned':
        return t('timeline.unassigned', 'Asignación quitada');
      case 'notes_changed':
        return t('timeline.notes_changed', 'Notas actualizadas');
      case 'status_changed':
        return t('timeline.status_changed', {
          from: statusLabel(md.from),
          to: statusLabel(md.to),
          defaultValue: 'Estado: {{from}} → {{to}}',
        });
      default:
        return e.event_type;
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-slate-400" />
        <h4 className="text-[13px] font-semibold text-slate-700 tracking-tight">
          {t('timeline.title', 'Historial')}
        </h4>
      </div>

      {isLoading ? (
        <p className="text-[12px] text-slate-400">{t('timeline.loading', 'Cargando…')}</p>
      ) : entries.length === 0 ? (
        <p className="text-[12px] text-slate-400 italic">{t('timeline.empty', 'Sin actividad registrada todavía.')}</p>
      ) : (
        <ol className="relative ml-1">
          {entries.map((e, i) => {
            const Icon = EVENT_ICON[e.event_type] || History;
            const who = actorName(e);
            const when = new Date(e.created_at).toLocaleString('es-CL', {
              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
            });
            return (
              <li key={e.id} className="relative pl-6 pb-3 last:pb-0">
                {/* Línea vertical */}
                {i < entries.length - 1 && (
                  <span className="absolute left-[7px] top-4 bottom-0 w-px bg-slate-200" aria-hidden />
                )}
                {/* Punto/ícono */}
                <span className="absolute left-0 top-0.5 w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <Icon className="w-2 h-2 text-slate-500" />
                </span>
                <p className="text-[12px] font-medium text-slate-800">{describe(e)}</p>
                <p className="text-[11px] text-slate-400">
                  {when}
                  {who ? ` · ${who}` : ''}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
