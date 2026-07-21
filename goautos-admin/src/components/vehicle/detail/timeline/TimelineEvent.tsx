import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Icon } from '@iconify/react';
import { Edit, Trash2, Paperclip, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTransactionCategory } from '@/hooks/useTransactionCategories';
import { lineCostBasis } from '@/utils/fiscalCredit';

type TimelineEventProps = {
  event: {
    id: string;
    title: string;
    description: string;
    amount: number;
    type: string;
    date: string;
    iconType?: string;
    category_id?: number;
    assumed_by?: 'dealership' | 'customer' | 'consignor' | null;
    genera_credito_fiscal?: boolean | null;
    docs_urls?: string[];
  };
  isConsigned: boolean;
  onSelect?: (event: any) => void;
  onEdit?: (event: any) => void;
  onDelete?: (event: any) => void;
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n || 0);

const TimelineEvent = ({ event, isConsigned, onSelect, onEdit, onDelete }: TimelineEventProps) => {
  const { t, i18n } = useTranslation('vehicleTimeline');
  const { category } = useTransactionCategory(event.category_id);

  const type = event.type;
  const isIncome = type === 'income' || type === 'sale';
  const isAcq = type === 'acquisition';
  const isExpenseLike = type === 'expense' || isAcq;
  const isCommission = type === 'commission';

  // Paleta por tipo: punto del riel, color del monto, fondo suave del ícono.
  const palette = isIncome
    ? { dot: 'bg-emerald-500', text: 'text-emerald-600', soft: 'bg-emerald-50 text-emerald-600' }
    : isAcq && isConsigned
    ? { dot: 'bg-sky-500', text: 'text-sky-600', soft: 'bg-sky-50 text-sky-600' }
    : isExpenseLike
    ? { dot: 'bg-red-500', text: 'text-red-600', soft: 'bg-red-50 text-red-600' }
    : isCommission
    ? { dot: 'bg-amber-500', text: 'text-amber-600', soft: 'bg-amber-50 text-amber-600' }
    : type === 'status_change'
    ? { dot: 'bg-violet-500', text: 'text-violet-600', soft: 'bg-violet-50 text-violet-600' }
    : type === 'document'
    ? { dot: 'bg-sky-500', text: 'text-sky-600', soft: 'bg-sky-50 text-sky-600' }
    : { dot: 'bg-slate-400', text: 'text-slate-600', soft: 'bg-slate-100 text-slate-600' };

  const icon = isAcq
    ? 'material-symbols-light:car-tag-rounded'
    : type === 'expense'
    ? 'mdi:trending-down'
    : isIncome
    ? 'mdi:trending-up'
    : type === 'document'
    ? 'mdi:file-document-outline'
    : type === 'status_change'
    ? 'mdi:swap-horizontal'
    : isCommission
    ? 'mdi:account-cash'
    : 'mdi:calendar';

  // Regla 3: si el gasto genera crédito fiscal, lo que carga al costo es el NETO.
  const conIva =
    (type === 'expense' || type === 'income') && !!event.genera_credito_fiscal;
  const neto = conIva ? lineCostBasis(event.amount, true) : event.amount;
  const iva = event.amount - neto;

  const canEdit =
    !!onEdit &&
    Number.isFinite(Number(event.id)) &&
    type !== 'document' &&
    type !== 'acquisition' &&
    type !== 'sale' &&
    type !== 'status_change' &&
    type !== 'commission';
  const canDelete =
    !!onDelete &&
    type !== 'status_change' &&
    type !== 'commission' &&
    type !== 'acquisition' &&
    type !== 'sale' &&
    type !== 'document';

  const docUrl = event.docs_urls && event.docs_urls.length > 0 ? event.docs_urls[0] : null;
  const sign = isIncome ? '+' : isExpenseLike ? '−' : '';
  const showAmount = type !== 'status_change' && type !== 'document';

  return (
    <div className='relative pl-10 group'>
      {/* Punto sobre el riel continuo */}
      <span
        className={`absolute left-[15px] top-[18px] z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-4 ring-white ${palette.dot}`}
      />

      <div
        role={onSelect ? 'button' : undefined}
        onClick={onSelect ? () => onSelect(event) : undefined}
        className={`rounded-xl border border-slate-200/60 bg-white p-3.5 transition-colors hover:border-slate-300 ${
          onSelect ? 'cursor-pointer hover:bg-slate-50/60' : ''
        }`}
      >
        <div className='flex items-start justify-between gap-3'>
          {/* Izquierda: ícono + título + descripción */}
          <div className='flex min-w-0 items-start gap-2.5'>
            <span
              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${palette.soft}`}
            >
              <Icon icon={icon} className='h-4 w-4' />
            </span>
            <div className='min-w-0'>
              <p className='truncate text-sm font-medium text-slate-800'>{event.title}</p>
              {event.description && (
                <p className='mt-0.5 truncate text-xs text-slate-500'>{event.description}</p>
              )}
            </div>
          </div>

          {/* Derecha: monto + acciones (hover) */}
          <div className='flex shrink-0 items-start gap-1.5'>
            {showAmount && (
              <div className='text-right'>
                <div className={`text-sm font-semibold tabular-nums ${palette.text}`}>
                  {sign}
                  {fmt(Math.abs(event.amount))}
                </div>
                {conIva && (
                  <div className='text-[10px] text-slate-400'>
                    {type === 'income'
                      ? `IVA débito incluido ${fmt(iva)}`
                      : `neto ${fmt(neto)} · IVA −${fmt(iva)}`}
                  </div>
                )}
              </div>
            )}
            {(canEdit || canDelete) && (
              <div className='flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100'>
                {canEdit && (
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit!(event);
                    }}
                    title={t('event.editEvent')}
                    className='rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                  >
                    <Edit className='h-3.5 w-3.5' />
                  </button>
                )}
                {canDelete && (
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete!(event);
                    }}
                    title={t('event.deleteEvent')}
                    className='rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600'
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Meta: fecha + chips (categoría / asumido por / IVA / documento) */}
        <div className='mt-2.5 flex flex-wrap items-center gap-1.5'>
          <span className='inline-flex items-center gap-1 text-[11px] text-slate-400'>
            <Calendar className='h-3 w-3' />
            {format(new Date(event.date), "dd MMM yyyy · HH:mm", { locale: es })}
          </span>
          {type === 'status_change' && (
            <span className='rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600'>
              {t('event.statusChange')}
            </span>
          )}
          {(type === 'expense' || type === 'income') && category && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                type === 'expense'
                  ? 'border-red-200 bg-red-50 text-red-600'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-600'
              }`}
            >
              {i18n.language === 'es' ? category.label_es : category.label_en}
            </span>
          )}
          {(type === 'expense' || type === 'income') && event.assumed_by && (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                event.assumed_by === 'dealership'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : event.assumed_by === 'consignor'
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-sky-200 bg-sky-50 text-sky-700'
              }`}
            >
              {event.assumed_by === 'dealership'
                ? 'Automotora'
                : event.assumed_by === 'consignor'
                ? 'Consignador'
                : 'Cliente'}
            </span>
          )}
          {conIva && (
            <span className='rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600'>
              {type === 'income' ? 'IVA débito' : 'IVA recuperable'}
            </span>
          )}
          {docUrl && (
            <a
              href={docUrl}
              target='_blank'
              rel='noopener noreferrer'
              onClick={(e) => e.stopPropagation()}
              className='inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-600 hover:bg-sky-100'
            >
              <Paperclip className='h-2.5 w-2.5' /> {t('event.document')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelineEvent;
