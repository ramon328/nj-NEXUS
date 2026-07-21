import { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/utils/posthog';
import CreateNotificationDialog from './CreateNotificationDialog';
import {
  Bell, CheckCheck, Search, Zap, CheckCircle, Info, ExternalLink,
  Plus, MailPlus, Megaphone, Inbox, Calendar, Handshake, Package,
  ShoppingCart, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/hooks/useNotifications';

const ICON_MAP: Record<string, React.ElementType> = {
  search: Search,
  zap: Zap,
  'check-circle': CheckCircle,
  bell: Bell,
  info: Info,
  'mail-plus': MailPlus,
  megaphone: Megaphone,
  calendar: Calendar,
  handshake: Handshake,
  package: Package,
  'shopping-cart': ShoppingCart,
};

const TYPE_KEYS: Record<string, string> = {
  vehicle_request: 'types.vehicleRequest',
  fast_sale_restock: 'types.fastSale',
  sale_completed: 'types.saleCompleted',
  new_lead: 'types.newLead',
  lead_assigned: 'types.leadAssigned',
  reservation_created: 'types.reservationCreated',
  deal_closed: 'types.dealClosed',
  consignment_created: 'types.consignmentCreated',
  purchase_created: 'types.purchaseCreated',
  general: 'types.general',
};

const TYPE_ICON_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  vehicle_request: { bg: 'bg-blue-500/10', text: 'text-blue-600', badge: 'bg-blue-50 text-blue-600' },
  fast_sale_restock: { bg: 'bg-amber-500/10', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-600' },
  sale_completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-600' },
  new_lead: { bg: 'bg-violet-500/10', text: 'text-violet-600', badge: 'bg-violet-50 text-violet-600' },
  lead_assigned: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', badge: 'bg-cyan-50 text-cyan-600' },
  reservation_created: { bg: 'bg-orange-500/10', text: 'text-orange-600', badge: 'bg-orange-50 text-orange-600' },
  deal_closed: { bg: 'bg-teal-500/10', text: 'text-teal-600', badge: 'bg-teal-50 text-teal-600' },
  consignment_created: { bg: 'bg-indigo-500/10', text: 'text-indigo-600', badge: 'bg-indigo-50 text-indigo-600' },
  purchase_created: { bg: 'bg-pink-500/10', text: 'text-pink-600', badge: 'bg-pink-50 text-pink-600' },
  general: { bg: 'bg-slate-500/10', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-500' },
};

const FILTER_KEYS = [
  { value: 'all', types: [] as string[], labelKey: 'filters.all' },
  { value: 'leads', types: ['new_lead', 'lead_assigned'], labelKey: 'filters.leads' },
  { value: 'ventas', types: ['fast_sale_restock', 'sale_completed', 'reservation_created', 'deal_closed'], labelKey: 'filters.sales' },
  { value: 'solicitudes', types: ['vehicle_request', 'consignment_created', 'purchase_created'], labelKey: 'filters.requests' },
  { value: 'general', types: ['general'], labelKey: 'filters.general' },
];

function getRelativeTime(dateStr: string, t: (key: string, opts?: any) => string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('time.now');
  if (minutes < 60) return t('time.minutesAgo', { count: minutes });
  if (hours < 24) return t('time.hoursAgo', { count: hours });
  if (days === 1) return t('time.yesterday');
  if (days < 7) return t('time.daysAgo', { count: days });
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function groupByDay(items: Notification[], t: (key: string) => string): { label: string; items: Notification[] }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const olderItems: Notification[] = [];

  for (const n of items) {
    const d = new Date(n.created_at);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) todayItems.push(n);
    else if (d.getTime() === yesterday.getTime()) yesterdayItems.push(n);
    else olderItems.push(n);
  }

  const groups: { label: string; items: Notification[] }[] = [];
  if (todayItems.length > 0) groups.push({ label: t('time.today') || 'Hoy', items: todayItems });
  if (yesterdayItems.length > 0) groups.push({ label: t('time.yesterday'), items: yesterdayItems });
  if (olderItems.length > 0) groups.push({ label: t('time.older') || 'Anteriores', items: olderItems });
  return groups;
}

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  canCreate: boolean;
  refetch: () => void;
  onClose?: () => void;
}

export default function NotificationDropdown({
  notifications,
  unreadCount,
  isLoading,
  markAsRead,
  markAllAsRead,
  canCreate,
  refetch,
  onClose,
}: NotificationDropdownProps) {
  const { t } = useTranslation('notifications');
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [typeFilter, setTypeFilter] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const activeFilter = FILTER_KEYS.find((f) => f.value === typeFilter);
  const filtered = notifications.filter((n) => {
    if (typeFilter !== 'all' && activeFilter && !activeFilter.types.includes(n.type)) return false;
    if (showUnreadOnly && n.is_read) return false;
    return true;
  });

  const groups = useMemo(() => groupByDay(filtered, t), [filtered, t]);

  const handleClick = useCallback(
    (notification: Notification) => {
      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'notification_clicked',
        properties: {
          notification_type: notification.type,
          notification_id: notification.id,
          has_url: !!notification.url,
        },
      });

      if (!notification.is_read) {
        markAsRead(notification.id);
      }
      if (notification.url) {
        navigate(notification.url);
        onClose?.();
      }
    },
    [markAsRead, navigate, onClose, user?.id]
  );

  const handleMarkAllRead = () => {
    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'notifications_marked_all_read',
      properties: { unread_count: unreadCount },
    });
    markAllAsRead();
  };

  const renderCard = (notification: Notification) => {
    const IconComp = ICON_MAP[notification.icon || ''] || Bell;
    const colors = TYPE_ICON_COLORS[notification.type] || TYPE_ICON_COLORS.general;
    const isUnread = !notification.is_read;

    return (
      <button
        key={notification.id}
        onClick={() => handleClick(notification)}
        className={cn(
          'w-full flex items-start gap-3 px-4 py-3 text-left transition-all group relative',
          'border-b border-slate-100 last:border-b-0',
          isUnread
            ? 'bg-white hover:bg-slate-50/80'
            : 'bg-transparent hover:bg-white/60'
        )}
      >
        {isUnread && (
          <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-sky-400" />
        )}

        <div
          className={cn(
            'flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center',
            isUnread ? `${colors.bg} ${colors.text}` : 'bg-slate-100 text-slate-400'
          )}
        >
          <IconComp className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={cn(
                'text-[13px] leading-snug',
                isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-600'
              )}>
                {notification.title}
              </p>
              <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                {notification.body}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
              <span className="text-[11px] text-slate-400 tabular-nums">
                {formatTime(notification.created_at)}
              </span>
              {notification.url && (
                <ExternalLink className="h-3 w-3 text-slate-300 group-hover:text-sky-400 transition-colors" />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] text-slate-400">
              {getRelativeTime(notification.created_at, t)}
            </span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', colors.badge)}>
              {t(TYPE_KEYS[notification.type] || 'types.general')}
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-5 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-900 tracking-tight">{t('page.title')}</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              {unreadCount > 0
                ? t('page.unreadCount', { count: unreadCount })
                : t('page.allRead')
              }
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title={t('actions.markAllRead')}
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            {canCreate && (
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-sky-400 hover:bg-sky-500 text-white transition-colors"
                title={t('actions.send')}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onClose?.()}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto -mx-5 px-5 pb-0.5 scrollbar-hide">
          {FILTER_KEYS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                posthog.capture({
                  distinctId: user?.id || 'anonymous',
                  event: 'notification_filtered',
                  properties: { filter_type: opt.value },
                });
                setTypeFilter(opt.value);
              }}
              className={cn(
                'px-2.5 py-1 text-[11px] rounded-full transition-all font-medium whitespace-nowrap',
                typeFilter === opt.value
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              )}
            >
              {t(opt.labelKey)}
            </button>
          ))}
          <div className="w-px h-3.5 bg-slate-200 mx-0.5 shrink-0" />
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={cn(
              'px-2.5 py-1 text-[11px] rounded-full transition-all font-medium whitespace-nowrap',
              showUnreadOnly
                ? 'bg-sky-50 text-sky-600'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            )}
          >
            {t('filters.unreadOnly')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Inbox className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-[14px] font-semibold text-slate-700">{t('empty.title')}</p>
            <p className="text-[12px] text-slate-400 mt-1 max-w-xs">
              {typeFilter !== 'all' || showUnreadOnly
                ? t('empty.filtered')
                : t('empty.default')
              }
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {group.label}
                  </h3>
                  <div className="flex-1 h-px bg-slate-200/50" />
                </div>

                <div className="bg-white rounded-xl ring-1 ring-slate-200/60 overflow-hidden shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)]">
                  {group.items.map(renderCard)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateNotificationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={refetch}
      />
    </div>
  );
}
