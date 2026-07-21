import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/utils/posthog';
import type { CalendarEvent, CreateCalendarEventData } from '@/types/calendarEvent';

export function useCalendarEvents() {
  const { clientId, user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async (rangeStart?: string, rangeEnd?: string) => {
    if (!clientId) return;

    let query = supabase
      .from('calendar_events')
      .select(`
        *,
        assigned_user:assigned_to_user_id(id, first_name, last_name)
      `)
      .eq('client_id', clientId)
      .order('start_at', { ascending: true });

    if (rangeStart) query = query.gte('start_at', rangeStart);
    if (rangeEnd) query = query.lte('start_at', rangeEnd);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching calendar events:', error);
      setIsLoading(false);
      return;
    }

    const creatorIds = [...new Set((data || []).filter(e => e.created_by).map(e => e.created_by))];
    let creatorMap = new Map<string, string>();
    if (creatorIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('auth_id, first_name, last_name')
        .in('auth_id', creatorIds);
      if (users) {
        creatorMap = new Map(users.map(u => [u.auth_id, `${u.first_name} ${u.last_name}`.trim()]));
      }
    }

    const enriched: CalendarEvent[] = (data || []).map((e: any) => ({
      ...e,
      assigned_user: e.assigned_user || null,
      creator_name: e.created_by ? creatorMap.get(e.created_by) : undefined,
    }));

    setEvents(enriched);
    setIsLoading(false);
  }, [clientId]);

  const createEvent = useCallback(async (data: CreateCalendarEventData) => {
    if (!clientId || !user?.id) return { error: 'No client/user' };

    const { error } = await supabase.from('calendar_events').insert({
      client_id: clientId,
      created_by: user.id,
      title: data.title,
      description: data.description || null,
      event_type: data.event_type,
      start_at: data.start_at,
      end_at: data.end_at || null,
      all_day: data.all_day || false,
      location: data.location || null,
      assigned_to_user_id: data.assigned_to_user_id || null,
      notify_before_minutes: data.notify_before_minutes ?? 30,
      photo_urls: data.photo_urls ?? [],
    });

    if (error) {
      console.error('Error creating calendar event:', error);
      return { error: error.message };
    }

    // Notification for assigned user
    if (data.assigned_to_user_id) {
      const { data: userData } = await supabase
        .from('users')
        .select('auth_id')
        .eq('id', data.assigned_to_user_id)
        .single();
      if (userData?.auth_id) {
        await supabase.from('notifications').insert({
          client_id: clientId,
          type: 'calendar_event',
          title: 'Nuevo evento en calendario',
          body: data.title,
          icon: 'calendar',
          url: '/calendario',
          data: { event_title: data.title },
          created_by: user.id,
          target_user_id: userData.auth_id,
        });
      }
    }

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'calendar_event_created',
      properties: {
        event_type: data.event_type,
        all_day: data.all_day || false,
        client_id: clientId,
      },
    });

    await fetchEvents();
    return { error: null };
  }, [clientId, user?.id, fetchEvents]);

  const updateEvent = useCallback(async (id: string, data: Partial<CreateCalendarEventData>) => {
    const { error } = await supabase
      .from('calendar_events')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating calendar event:', error);
      return { error: error.message };
    }

    posthog.capture({
      distinctId: user?.id || 'anonymous',
      event: 'calendar_event_edited',
      properties: {
        event_id: id,
        client_id: clientId,
      },
    });

    await fetchEvents();
    return { error: null };
  }, [clientId, user?.id, fetchEvents]);

  const deleteEvent = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting calendar event:', error);
      return { error: error.message };
    }

    await fetchEvents();
    return { error: null };
  }, [fetchEvents]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Realtime
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel('calendar-events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `client_id=eq.${clientId}` }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, fetchEvents]);

  return { events, isLoading, createEvent, updateEvent, deleteEvent, refetch: fetchEvents };
}
