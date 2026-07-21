import { LeadTypes } from '@/types/leads';

export type LeadStatus = 'pending' | 'assigned' | 'completed' | 'cancelled';
export type TabType = 'buy' | 'sell';
export type ViewMode = 'kanban' | 'table';

export const LEAD_STATUSES: LeadStatus[] = ['pending', 'assigned', 'completed', 'cancelled'];

export const STATUS_COLORS: Record<LeadStatus, {
  dot: string;
  bg: string;
  text: string;
  ring: string;
  columnBg: string;
}> = {
  pending: {
    dot: 'bg-amber-400',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
    columnBg: 'bg-amber-50/50',
  },
  assigned: {
    dot: 'bg-blue-400',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-blue-200',
    columnBg: 'bg-blue-50/50',
  },
  completed: {
    dot: 'bg-emerald-400',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
    columnBg: 'bg-emerald-50/50',
  },
  cancelled: {
    dot: 'bg-rose-400',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    ring: 'ring-rose-200',
    columnBg: 'bg-rose-50/50',
  },
};

export const STATUS_ICONS: Record<LeadStatus, string> = {
  pending: 'clock',
  assigned: 'user-check',
  completed: 'check-circle',
  cancelled: 'x-circle',
};

export const BUY_TYPES = [LeadTypes.BUY_DIRECT, LeadTypes.BUY_CONSIGNMENT, LeadTypes.SEARCH_REQUEST];
export const SELL_TYPES = [LeadTypes.SELL_VEHICLE, LeadTypes.SELL_FINANCING, LeadTypes.SELL_TRANSFER, LeadTypes.CONTACT_GENERAL];

export function getTimeAgo(dateString: string, t: (key: string, opts?: any) => string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return t('timeAgo.justNow');
  if (diffMins < 60) return t('timeAgo.minutes', { count: diffMins });
  if (diffHours < 24) return t('timeAgo.hours', { count: diffHours });
  if (diffDays === 1) return t('timeAgo.yesterday');
  if (diffDays < 30) return t('timeAgo.days', { count: diffDays });
  return new Date(dateString).toLocaleDateString('es-CL');
}

export function getLeadInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0]?.toUpperCase() || '';
  const l = lastName?.[0]?.toUpperCase() || '';
  return f + l || '?';
}

export function getLeadFullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Sin nombre';
}
