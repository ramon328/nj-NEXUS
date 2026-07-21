export type RequestStatus = 'open' | 'in_progress' | 'fulfilled' | 'cancelled';

export const REQUEST_STATUSES: RequestStatus[] = ['open', 'in_progress', 'fulfilled', 'cancelled'];

export const STATUS_COLORS: Record<RequestStatus, {
  dot: string;
  bg: string;
  text: string;
  ring: string;
  columnBg: string;
}> = {
  open:        { dot: 'bg-blue-400',    bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200',    columnBg: 'bg-blue-50/50' },
  in_progress: { dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200',   columnBg: 'bg-amber-50/50' },
  fulfilled:   { dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', columnBg: 'bg-emerald-50/50' },
  cancelled:   { dot: 'bg-rose-400',    bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200',    columnBg: 'bg-rose-50/50' },
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  open: 'Abiertas',
  in_progress: 'En Progreso',
  fulfilled: 'Cumplidas',
  cancelled: 'Canceladas',
};

export function getRelativeTime(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return t('time.today');
  if (days === 1) return t('time.yesterday');
  if (days < 7) return t('time.daysAgo', { count: days });
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatBudget(min: number | null, max: number | null, t: (key: string, opts?: Record<string, unknown>) => string): string | null {
  if (!min && !max) return null;
  const fmt = (v: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v);
  if (min && max) return `${fmt(min)} — ${fmt(max)}`;
  if (min) return t('budget.from', { amount: fmt(min) });
  return t('budget.upTo', { amount: fmt(max!) });
}

export function getRequestInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}
