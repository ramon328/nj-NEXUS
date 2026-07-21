import type { CalendarEventType, UnifiedEventSource } from '@/types/calendarEvent';

export const SOURCE_COLORS: Record<UnifiedEventSource, { bg: string; dot: string; text: string; border: string; label: string }> = {
  task:       { bg: 'bg-blue-50',    dot: 'bg-blue-500',    text: 'text-blue-700',    border: 'border-blue-200',    label: 'Tareas' },
  request:    { bg: 'bg-purple-50',  dot: 'bg-purple-500',  text: 'text-purple-700',  border: 'border-purple-200',  label: 'Solicitudes' },
  event:      { bg: 'bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Eventos' },
  scheduling: { bg: 'bg-amber-50',   dot: 'bg-amber-500',   text: 'text-amber-700',   border: 'border-amber-200',   label: 'Agendamientos' },
};

export const EVENT_TYPE_CONFIG: Record<CalendarEventType, { label: string; color: string; dotColor: string }> = {
  meeting:  { label: 'Reunion',       color: 'bg-emerald-50 text-emerald-700', dotColor: 'bg-emerald-500' },
  training: { label: 'Capacitacion',  color: 'bg-indigo-50 text-indigo-700',   dotColor: 'bg-indigo-500' },
  vendor:   { label: 'Proveedor',     color: 'bg-orange-50 text-orange-700',   dotColor: 'bg-orange-500' },
  deadline: { label: 'Fecha Limite',  color: 'bg-red-50 text-red-700',         dotColor: 'bg-red-500' },
  reminder: { label: 'Recordatorio',  color: 'bg-amber-50 text-amber-700',     dotColor: 'bg-amber-500' },
  other:    { label: 'Otro',          color: 'bg-slate-50 text-slate-600',      dotColor: 'bg-slate-400' },
};

export type CalendarViewMode = 'month' | 'week' | 'day';
