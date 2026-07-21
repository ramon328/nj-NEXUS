import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationStore } from '@/stores/notificationStore';

export interface Notification {
  id: string;
  client_id: number;
  type: string;
  title: string;
  body: string;
  icon: string | null;
  url: string | null;
  data: Record<string, unknown>;
  target_user_id: string | null;
  target_role: string | null;
  created_by: string | null;
  created_at: string;
  is_read?: boolean;
}

export function useNotifications() {
  const { clientId, user } = useAuth();
  const { setUnreadCount } = useNotificationStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setLocalUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!clientId || !user?.id) return;

    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      setIsLoading(false);
      return;
    }

    // Get read status for current user
    const { data: reads } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', user.id);

    const readIds = new Set((reads || []).map((r: { notification_id: string }) => r.notification_id));

    const withReadStatus = (notifs || []).map((n: Notification) => ({
      ...n,
      is_read: readIds.has(n.id),
    }));

    setNotifications(withReadStatus);
    const unread = withReadStatus.filter((n: Notification) => !n.is_read).length;
    setLocalUnreadCount(unread);
    setUnreadCount(unread);
    setIsLoading(false);
  }, [clientId, user?.id, setUnreadCount]);

  const fetchUnreadCount = useCallback(async () => {
    if (!clientId || !user?.id) return;

    // Get all notification IDs for this client (RLS filters by target)
    const { data: notifs } = await supabase
      .from('notifications')
      .select('id')
      .eq('client_id', clientId);

    if (!notifs || notifs.length === 0) {
      setLocalUnreadCount(0);
      setUnreadCount(0);
      return;
    }

    // Get read notifications
    const { data: reads } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', user.id);

    const readIds = new Set((reads || []).map((r: { notification_id: string }) => r.notification_id));
    const unread = notifs.filter((n: { id: string }) => !readIds.has(n.id)).length;
    setLocalUnreadCount(unread);
    setUnreadCount(unread);
  }, [clientId, user?.id, setUnreadCount]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('notification_reads')
      .upsert({ notification_id: notificationId, user_id: user.id });

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setLocalUnreadCount((prev) => Math.max(0, prev - 1));
      setUnreadCount(Math.max(0, unreadCount - 1));
    }
  }, [user?.id, setUnreadCount, unreadCount]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    const unreadNotifs = notifications.filter((n) => !n.is_read);
    if (unreadNotifs.length === 0) return;

    const rows = unreadNotifs.map((n) => ({
      notification_id: n.id,
      user_id: user.id,
    }));

    const { error } = await supabase
      .from('notification_reads')
      .upsert(rows);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setLocalUnreadCount(0);
      setUnreadCount(0);
    }
  }, [user?.id, notifications, setUnreadCount]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, fetchNotifications]);

  return {
    notifications,
    unreadCount: unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
