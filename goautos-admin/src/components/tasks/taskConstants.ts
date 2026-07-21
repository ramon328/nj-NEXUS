import type { TaskStatus, TaskPriority } from '@/types/task';

export const TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'pending_approval', 'completed', 'cancelled'];

export const STATUS_COLORS: Record<TaskStatus, {
  dot: string;
  bg: string;
  text: string;
  ring: string;
  columnBg: string;
}> = {
  pending:          { dot: 'bg-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200',    columnBg: 'bg-blue-50/50' },
  in_progress:      { dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   columnBg: 'bg-amber-50/50' },
  pending_approval: { dot: 'bg-violet-400',  bg: 'bg-violet-50',  text: 'text-violet-700',  ring: 'ring-violet-200',  columnBg: 'bg-violet-50/50' },
  completed:        { dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', columnBg: 'bg-emerald-50/50' },
  cancelled:        { dot: 'bg-rose-400',    bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    columnBg: 'bg-rose-50/50' },
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendientes',
  in_progress: 'En Progreso',
  pending_approval: 'Por Aprobar',
  completed: 'Completadas',
  cancelled: 'Canceladas',
};

export const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; label: string }> = {
  low:    { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Baja' },
  medium: { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Media' },
  high:   { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Alta' },
};

export const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  operativo:     { label: 'Operativo',     color: 'bg-blue-100 text-blue-700' },
  documentacion: { label: 'Documentación', color: 'bg-amber-100 text-amber-700' },
  venta:         { label: 'Venta',         color: 'bg-green-100 text-green-700' },
  general:       { label: 'General',       color: 'bg-slate-100 text-slate-600' },
};

export function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
}

export function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(dateStr).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export function formatDueDate(dateStr: string | null): { label: string; isOverdue: boolean } | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  const days = Math.ceil(diff / 86400000);
  const isOverdue = days < 0;

  if (days === 0) return { label: 'Hoy', isOverdue: false };
  if (days === 1) return { label: 'Mañana', isOverdue: false };
  if (days < 0) return { label: `Vencida hace ${Math.abs(days)}d`, isOverdue: true };
  if (days < 7) return { label: `En ${days} días`, isOverdue: false };
  return { label: due.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }), isOverdue: false };
}
