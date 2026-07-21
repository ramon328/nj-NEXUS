import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, addDays, subDays } from 'date-fns';
import type { UnifiedCalendarEvent, UnifiedEventSource } from '@/types/calendarEvent';
import { SOURCE_COLORS } from '@/components/calendar/calendarConstants';

interface UseUnifiedCalendarOptions {
  currentMonth: Date;
  enabledSources?: UnifiedEventSource[];
}

export function useUnifiedCalendar({ currentMonth, enabledSources }: UseUnifiedCalendarOptions) {
  const { clientId } = useAuth();
  const [events, setEvents] = useState<UnifiedCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const sources = enabledSources || ['task', 'request', 'event', 'scheduling'];

  const rangeStart = subDays(startOfMonth(currentMonth), 7).toISOString();
  const rangeEnd = addDays(endOfMonth(currentMonth), 7).toISOString();

  const fetchAll = useCallback(async () => {
    if (!clientId) return;
    setIsLoading(true);

    const results: UnifiedCalendarEvent[] = [];

    // 1. Tasks with due_date
    if (sources.includes('task')) {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, description, status, due_date, priority, category')
        .eq('client_id', clientId)
        .not('due_date', 'is', null)
        .gte('due_date', rangeStart.split('T')[0])
        .lte('due_date', rangeEnd.split('T')[0]);

      if (data) {
        const colors = SOURCE_COLORS.task;
        for (const t of data) {
          results.push({
            id: `task-${t.id}`,
            source: 'task',
            title: t.title,
            description: t.description,
            start: new Date(t.due_date),
            end: null,
            allDay: true,
            color: colors.bg,
            dotColor: colors.dot,
            textColor: colors.text,
            status: t.status,
            url: '/tareas',
            metadata: { taskId: t.id, priority: t.priority, category: t.category },
          });
        }
      }
    }

    // 2. Vehicle requests (by created_at as reference date)
    if (sources.includes('request')) {
      const { data } = await supabase
        .from('vehicle_requests')
        .select('id, customer_name, brand_name, model_name, status, created_at, expires_at')
        .eq('client_id', clientId)
        .gte('created_at', rangeStart)
        .lte('created_at', rangeEnd);

      if (data) {
        const colors = SOURCE_COLORS.request;
        for (const r of data) {
          const label = [r.brand_name, r.model_name].filter(Boolean).join(' ') || 'Solicitud';
          results.push({
            id: `request-${r.id}`,
            source: 'request',
            title: `${r.customer_name} - ${label}`,
            description: null,
            start: new Date(r.created_at),
            end: r.expires_at ? new Date(r.expires_at) : null,
            allDay: false,
            color: colors.bg,
            dotColor: colors.dot,
            textColor: colors.text,
            status: r.status,
            url: '/solicitudes',
            metadata: { requestId: r.id },
          });
        }
      }
    }

    // 3. Calendar events (manual)
    if (sources.includes('event')) {
      const { data } = await supabase
        .from('calendar_events')
        .select('*, assigned_user:assigned_to_user_id(id, first_name, last_name)')
        .eq('client_id', clientId)
        .gte('start_at', rangeStart)
        .lte('start_at', rangeEnd);

      if (data) {
        const colors = SOURCE_COLORS.event;
        for (const e of data) {
          results.push({
            id: `event-${e.id}`,
            source: 'event',
            title: e.title,
            description: e.description,
            start: new Date(e.start_at),
            end: e.end_at ? new Date(e.end_at) : null,
            allDay: e.all_day || false,
            color: colors.bg,
            dotColor: colors.dot,
            textColor: colors.text,
            status: null,
            url: '/calendario',
            metadata: {
              eventId: e.id,
              eventType: e.event_type,
              location: e.location,
              assignedUser: e.assigned_user,
              photoUrls: (e.photo_urls as string[] | null) || [],
              rawEvent: e,
            },
          });
        }
      }
    }

    // 4. Appointments (scheduling)
    if (sources.includes('scheduling')) {
      const { data } = await supabase
        .from('appointments_public')
        .select('id, service_name, slot_start, slot_end, status, notes, customer_id, vehicle_id')
        .eq('client_id', clientId)
        .gte('slot_start', rangeStart)
        .lte('slot_start', rangeEnd);

      if (data) {
        const colors = SOURCE_COLORS.scheduling;
        for (const a of data) {
          results.push({
            id: `scheduling-${a.id}`,
            source: 'scheduling',
            title: a.service_name || 'Agendamiento',
            description: a.notes,
            start: new Date(a.slot_start),
            end: a.slot_end ? new Date(a.slot_end) : null,
            allDay: false,
            color: colors.bg,
            dotColor: colors.dot,
            textColor: colors.text,
            status: a.status,
            url: '/calendario',
            metadata: { appointmentId: a.id, customerId: a.customer_id, vehicleId: a.vehicle_id },
          });
        }
      }
    }

    results.sort((a, b) => a.start.getTime() - b.start.getTime());
    setEvents(results);
    setIsLoading(false);
  }, [clientId, rangeStart, rangeEnd, sources.join(',')]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime for calendar_events
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel('unified-calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `client_id=eq.${clientId}` }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `client_id=eq.${clientId}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, fetchAll]);

  const eventsBySource = useMemo(() => {
    const map: Record<UnifiedEventSource, UnifiedCalendarEvent[]> = {
      task: [], request: [], event: [], scheduling: [],
    };
    for (const e of events) map[e.source].push(e);
    return map;
  }, [events]);

  return { events, eventsBySource, isLoading, refetch: fetchAll };
}
