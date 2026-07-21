import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { startOfMonth, endOfMonth, format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import VehiclesPagination from '@/components/vehiculos/VehiclesPagination';
import AppointmentsViewToggle from '@/components/appointments/AppointmentsViewToggle';
import AppointmentsCalendarGrid from '@/components/appointments/AppointmentsCalendarGrid';
import CalendarMonthView from '@/components/calendar/CalendarMonthView';
import CreateCalendarEventDrawer from '@/components/calendar/CreateCalendarEventDrawer';
import CalendarEventDetailDrawer from '@/components/calendar/CalendarEventDetailDrawer';
import { useUnifiedCalendar } from '@/hooks/useUnifiedCalendar';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import posthog from '@/utils/posthog';
import type { UnifiedCalendarEvent, UnifiedEventSource } from '@/types/calendarEvent';

import {
  Loader2, Save, RefreshCw, Filter,
  CalendarCheck2, CheckCircle2, Clock, XCircle,
  CalendarDays, User, Car,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

// -------------------- Tipos --------------------
type Weekday = 0|1|2|3|4|5|6;
type AdminStatus = 'pending' | 'confirmed' | 'canceled';
const ADMIN_STATUSES: AdminStatus[] = ['pending', 'confirmed', 'canceled'];

interface DbDealership {
  id: number;
  address: string;
  phone: string | null;
  email: string | null;
  client_id: number;
}

interface DayConfig {
  weekday: Weekday;
  is_open: boolean;
  open_time: string;   // 'HH:MM'
  close_time: string;  // 'HH:MM'
  slot_minutes: number;
  capacity_per_slot: number;
}

interface AppointmentRow {
  id: number;
  client_id: number;
  dealership_id: number;
  service_name: string | null;
  vehicle_id: number | null;
  customer_id: string | null; // UUID
  slot_start: string | Date;
  slot_end: string | Date;
  created_at: string | Date;
  status: AdminStatus;
  channel: string | null;
  notes: string | null;
  address?: string | null;
}

interface CustomerLite {
  id: string; // UUID
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

// -------------------- Utilidades --------------------
const pickHHMM = (ts?: unknown) => {
  if (!ts) return '';
  let s = '';
  if (ts instanceof Date) s = ts.toISOString(); else s = String(ts);
  s = s.replace(' ', 'T');
  const m = s.match(/(?:T| )(\d{2}:\d{2})(?::\d{2})?/);
  if (m) return m[1];
  const m2 = s.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  return m2 ? `${m2[1]}:${m2[2]}` : '';
};

const pickDateYMD = (ts?: unknown): string => {
  if (!ts) return '';
  if (ts instanceof Date) {
    const y = ts.getFullYear();
    const m = String(ts.getMonth() + 1).padStart(2, '0');
    const d = String(ts.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(ts);

  let m = s.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (m) {
    const yy = m[1];
    const mm = String(Number(m[2])).padStart(2, '0');
    const dd = String(Number(m[3])).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  m = s.match(/\b(\d{4})(\d{2})(\d{2})\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }
  return '';
};

const prettyDate = (ts?: unknown) => {
  const ymd = pickDateYMD(ts);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString();
};

const toHHMM = (val?: string | null) => {
  if (!val) return '';
  const [hh, mm] = val.split(':');
  return `${hh?.padStart(2, '0')}:${mm?.padStart(2, '0')}`;
};

const emptyWeek = (): DayConfig[] =>
  [0,1,2,3,4,5,6].map((d) => ({
    weekday: d as Weekday,
    is_open: false,
    open_time: '10:00',
    close_time: '19:00',
    slot_minutes: 30,
    capacity_per_slot: 1,
  }));

const agendamientosTabs = [
  { value: 'calendar', key: 'tabs.calendar', fallback: 'Calendario' },
  { value: 'hours', key: 'tabs.hours', fallback: 'Horarios' },
  { value: 'preview', key: 'tabs.preview', fallback: 'Vista previa' },
];

const APPOINTMENTS_PAGE_SIZE = 10;

// -------------------- Página --------------------
const Calendario: React.FC = () => {
  const { t } = useTranslation('appointments');
  const qc = useQueryClient();
  const { clientId, user } = useAuth();

  const [activeTab, setActiveTab] = useState('calendar');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const [selectedDealershipId, setSelectedDealershipId] = useState<number | null>(null);
  const [apptDealershipId, setApptDealershipId] = useState<number | null>(null);
  const [days, setDays] = useState<DayConfig[]>(emptyWeek());
  const [saving, setSaving] = useState(false);

  // ===== Calendario unificado =====
  const [unifiedMonth, setUnifiedMonth] = useState(() => startOfMonth(new Date()));
  const [unifiedSelectedDay, setUnifiedSelectedDay] = useState(new Date());
  const [enabledSources, setEnabledSources] = useState<UnifiedEventSource[]>(['task', 'request', 'event', 'scheduling']);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [createEventDate, setCreateEventDate] = useState<Date | undefined>();
  const [detailEvent, setDetailEvent] = useState<UnifiedCalendarEvent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);

  const { events: unifiedEvents, isLoading: unifiedLoading, refetch: refetchUnified } = useUnifiedCalendar({
    currentMonth: unifiedMonth,
    enabledSources,
  });
  const { createEvent, updateEvent, deleteEvent, events: rawCalendarEvents } = useCalendarEvents();

  const filteredUnifiedEvents = useMemo(
    () => unifiedEvents.filter(e => enabledSources.includes(e.source)),
    [unifiedEvents, enabledSources],
  );

  const selectedDayEvents = useMemo(
    () => filteredUnifiedEvents.filter(e => isSameDay(e.start, unifiedSelectedDay)),
    [filteredUnifiedEvents, unifiedSelectedDay],
  );

  const handleToggleSource = useCallback((source: UnifiedEventSource) => {
    setEnabledSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  }, []);

  const handleCreateClick = useCallback((date?: Date) => {
    setCreateEventDate(date);
    setEditEventId(null);
    setCreateEventOpen(true);
  }, []);

  const handleEventClick = useCallback((event: UnifiedCalendarEvent) => {
    setDetailEvent(event);
    setDetailOpen(true);
  }, []);

  const handleEditEvent = useCallback((eventId: string) => {
    // Extract the raw ID from the unified ID (e.g., "event-uuid" → "uuid")
    const rawId = eventId.replace('event-', '');
    setEditEventId(rawId);
    setDetailOpen(false);
    setCreateEventOpen(true);
  }, []);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    const rawId = eventId.replace('event-', '');
    const result = await deleteEvent(rawId);
    if (!result.error) {
      setDetailOpen(false);
      refetchUnified();
    }
    return result;
  }, [deleteEvent, refetchUnified]);

  const editEventData = useMemo(() => {
    if (!editEventId) return null;
    return rawCalendarEvents.find(e => e.id === editEventId) || null;
  }, [editEventId, rawCalendarEvents]);

  // Appointment status change handler for the detail drawer
  const [drawerApptUpdating, setDrawerApptUpdating] = useState(false);
  const handleDrawerAppointmentStatus = useCallback(async (appointmentId: number, newStatus: 'pending' | 'confirmed' | 'canceled') => {
    setDrawerApptUpdating(true);
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      // Update the detail event in-place so the drawer reflects the change
      setDetailEvent(prev => prev ? { ...prev, status: newStatus } : null);
      refetchUnified();
    } finally {
      setDrawerApptUpdating(false);
    }
  }, [refetchUnified]);

  // ===== Vista previa de disponibilidad =====
  const [previewDate, setPreviewDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago';
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<Array<{ slot_start: string | Date; slot_end: string | Date; capacity: number }>>([]);

  // ===== Listado de citas =====
  const [apptFrom, setApptFrom] = useState<string>(() => previewDate);
  const [apptTo, setApptTo] = useState<string>(() => previewDate);
  const [apptStatus, setApptStatus] = useState<AdminStatus | 'all'>('all');
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsSourceMissing, setAppointmentsSourceMissing] = useState<null | 'appointments_public' | 'appointments_view' | 'both'>(null);

  // ===== Calendar view state =====
  const [appointmentsView, setAppointmentsView] = useState<'calendar' | 'table'>('calendar');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(new Date());
  const [calendarAppointments, setCalendarAppointments] = useState<AppointmentRow[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Paginación client-side para citas
  const [apptPage, setApptPage] = useState(1);
  const apptTotalPages = Math.max(1, Math.ceil(appointments.length / APPOINTMENTS_PAGE_SIZE));
  const paginatedAppointments = useMemo(() => {
    const start = (apptPage - 1) * APPOINTMENTS_PAGE_SIZE;
    return appointments.slice(start, start + APPOINTMENTS_PAGE_SIZE);
  }, [appointments, apptPage]);

  // Reset page when appointments change
  useEffect(() => { setApptPage(1); }, [appointments.length]);

  // estado de actualización de estado por fila
  const [updatingStatus, setUpdatingStatus] = useState<Record<number, boolean>>({});

  // ===== Etiquetas de vehículos =====
  const [vehicleLabels, setVehicleLabels] = useState<Record<number, string>>({});
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  // ===== Datos de clientes =====
  const [customersMap, setCustomersMap] = useState<Record<string, CustomerLite>>({});
  const [customersLoading, setCustomersLoading] = useState(false);

  // Flat map: customer UUID -> display name (for calendar grid)
  const calendarCustomerNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [id, c] of Object.entries(customersMap)) {
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ').trim();
      if (name) map[id] = name;
    }
    return map;
  }, [customersMap]);

  const makeVehicleLabel = (row: any) => {
    const brand = row?.brand?.name || row?.brand_name || row?.brand || '';
    const model = row?.model?.name || row?.model_name || row?.model || '';
    const year  = row?.year ? String(row.year) : '';
    const parts = [brand, model, year].filter(Boolean);
    return parts.length ? parts.join(' ') : null;
  };

  // ---------- KPI counts ----------
  const kpiSource = appointmentsView === 'calendar' ? calendarAppointments : appointments;
  const kpiCounts = useMemo(() => {
    const total = kpiSource.length;
    let confirmed = 0, pending = 0, canceled = 0;
    for (const a of kpiSource) {
      if (a.status === 'confirmed') confirmed++;
      else if (a.status === 'pending') pending++;
      else if (a.status === 'canceled') canceled++;
    }
    return { total, confirmed, pending, canceled };
  }, [kpiSource]);

  // ---------- Fetch sucursales ----------
  const { data: dealerships, isLoading: loadingDealerships } = useQuery({
    queryKey: ['dealerships', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<DbDealership[]> => {
      const { data, error } = await supabase
        .from('dealerships')
        .select('id, address, phone, email, client_id')
        .eq('client_id', clientId);

      if (error) {
        console.error('Error fetching dealerships:', error);
        toast({
          title: t('errors.title', 'Error'),
          description: t('errors.fetchDealerships', 'No se pudieron cargar las sucursales'),
          variant: 'destructive'
        });
        return [];
      }
      return (data || []) as DbDealership[];
    },
  });

  useEffect(() => {
    if (!dealerships || dealerships.length === 0) return;
    if (selectedDealershipId == null) {
      setSelectedDealershipId(dealerships[0].id);
    }
    if (apptDealershipId === undefined) {
      setApptDealershipId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealerships]);

  const selectedDealership = useMemo(
    () => (selectedDealershipId ? dealerships?.find((d) => d.id === selectedDealershipId) || null : null),
    [dealerships, selectedDealershipId]
  );

  // ---------- Fetch horarios ----------
  const { data: hoursRows, isLoading: loadingHours, refetch: refetchHours } = useQuery({
    queryKey: ['dealership_hours', clientId, selectedDealershipId],
    enabled: !!clientId && !!selectedDealershipId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dealership_hours')
        .select('weekday, is_open, open_time, close_time, slot_minutes, capacity_per_slot')
        .eq('client_id', clientId!)
        .eq('dealership_id', selectedDealershipId!);

      if (error) {
        console.error('Error fetching hours:', error);
        toast({
          title: t('errors.title', 'Error'),
          description: t('errors.fetchHours', 'No se pudieron cargar los horarios'),
          variant: 'destructive'
        });
        return [];
      }
      return data || [];
    },
  });

  useEffect(() => {
    if (!hoursRows || hoursRows.length === 0) {
      setDays(emptyWeek());
      return;
    }
    const merged = emptyWeek().map((base) => {
      const found = (hoursRows as any[]).find((r) => r.weekday === base.weekday);
      if (!found) return base;
      return {
        weekday: base.weekday,
        is_open: !!found.is_open,
        open_time: toHHMM(found.open_time) || base.open_time,
        close_time: toHHMM(found.close_time) || base.close_time,
        slot_minutes: Number(found.slot_minutes ?? base.slot_minutes),
        capacity_per_slot: Number(found.capacity_per_slot ?? base.capacity_per_slot),
      } as DayConfig;
    });
    setDays(merged);
  }, [hoursRows]);

  // ---------- Guardar horarios ----------
  const updateDay = (weekday: Weekday, patch: Partial<DayConfig>) => {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  };

  const handleSave = async () => {
    if (!clientId || !selectedDealershipId) {
      toast({
        title: t('errors.title', 'Error'),
        description: t('errors.missingClientOrDealership', 'Falta cliente o sucursal'),
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const payload = days.map((d) => ({
        client_id: clientId,
        dealership_id: selectedDealershipId,
        weekday: d.weekday,
        is_open: d.is_open,
        open_time: `${d.open_time}:00`,
        close_time: `${d.close_time}:00`,
        slot_minutes: d.slot_minutes,
        capacity_per_slot: d.capacity_per_slot,
        buffer_pre_min: 0,
        buffer_post_min: 0,
      }));

      const { error } = await supabase.rpc('upsert_dealership_hours_public', { p_rows: payload as any });
      if (error) {
        console.error('RPC error:', error);
        toast({
          title: t('errors.title', 'Error'),
          description: t('errors.saveHours', 'No se pudo guardar la configuración'),
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: t('success.saved', 'Guardado'),
        description: t('success.hoursSaved', 'Horarios guardados correctamente')
      });
      await refetchHours();
      qc.invalidateQueries({ queryKey: ['availability-preview', clientId, selectedDealershipId, previewDate] });
    } catch (e: any) {
      console.error(e);
      toast({
        title: t('errors.title', 'Error'),
        description: t('errors.unexpected', 'Ocurrió un error inesperado'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // ---------- Vista previa ----------
  const fetchPreviewSlots = async () => {
    if (!clientId || !selectedDealershipId || !previewDate) return;
    setSlotsLoading(true);
    setSlots([]);
    const { data, error } = await supabase.rpc('fn_compute_availability', {
      p_client_id: clientId,
      p_dealership_id: selectedDealershipId,
      p_date: previewDate,
      p_timezone: timezone,
    });
    setSlotsLoading(false);
    if (error) {
      toast({
        title: t('errors.title', 'Error'),
        description: `${t('errors.fetchSlots', 'No se pudieron cargar los slots')}: ${error.message}`,
        variant: 'destructive'
      });
      return;
    }
    setSlots((data || []) as any);
  };

  useEffect(() => {
    if (selectedDealershipId) {
      fetchPreviewSlots();
    } else {
      setSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, selectedDealershipId, previewDate]);

  // ---------- Listar citas ----------
  const fetchAppointments = async () => {
    if (!clientId) return;
    if (!apptFrom || !apptTo) return;

    setAppointmentsLoading(true);
    setAppointmentsSourceMissing(null);
    try {
      let query = supabase.from('appointments_public')
        .select('id, client_id, dealership_id, service_name, vehicle_id, customer_id, slot_start, slot_end, created_at, status, channel, notes, address:dealership_address')
        .eq('client_id', clientId)
        .order('slot_start', { ascending: true });

      if (apptDealershipId) query = query.eq('dealership_id', apptDealershipId);
      if (apptStatus !== 'all') query = query.eq('status', apptStatus);
      query = query.gte('slot_start', `${apptFrom}T00:00:00`).lte('slot_start', `${apptTo}T23:59:59`);

      let { data, error } = await query;
      if (error) {
        setAppointmentsSourceMissing('appointments_public');
        let q2 = supabase.from('appointments_view' as any)
          .select('id, client_id, dealership_id, service_name, vehicle_id, customer_id, slot_start, slot_end, created_at, status, channel, notes')
          .eq('client_id', clientId)
          .order('slot_start', { ascending: true });

        if (apptDealershipId) q2 = q2.eq('dealership_id', apptDealershipId);
        if (apptStatus !== 'all') q2 = q2.eq('status', apptStatus);
        q2 = q2.gte('slot_start', `${apptFrom}T00:00:00`).lte('slot_start', `${apptTo}T23:59:59`);

        const res2 = await q2;
        data = res2.data as any[];
        if (res2.error) {
          setAppointmentsSourceMissing('both');
          data = [];
        }
      }
      setAppointments((data || []) as AppointmentRow[]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, apptDealershipId, apptFrom, apptTo, apptStatus]);

  // ---------- Cargar citas del mes para calendario ----------
  const fetchCalendarAppointments = useCallback(async () => {
    if (!clientId) return;

    setCalendarLoading(true);
    try {
      const monthStart = format(startOfMonth(calendarMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(calendarMonth), 'yyyy-MM-dd');

      let query = supabase.from('appointments_public')
        .select('id, client_id, dealership_id, service_name, vehicle_id, customer_id, slot_start, slot_end, created_at, status, channel, notes, address:dealership_address')
        .eq('client_id', clientId)
        .gte('slot_start', `${monthStart}T00:00:00`)
        .lte('slot_start', `${monthEnd}T23:59:59`)
        .order('slot_start', { ascending: true });

      if (apptDealershipId) query = query.eq('dealership_id', apptDealershipId);
      if (apptStatus !== 'all') query = query.eq('status', apptStatus);

      let { data, error } = await query;
      if (error) {
        let q2 = supabase.from('appointments_view' as any)
          .select('id, client_id, dealership_id, service_name, vehicle_id, customer_id, slot_start, slot_end, created_at, status, channel, notes')
          .eq('client_id', clientId)
          .gte('slot_start', `${monthStart}T00:00:00`)
          .lte('slot_start', `${monthEnd}T23:59:59`)
          .order('slot_start', { ascending: true });

        if (apptDealershipId) q2 = q2.eq('dealership_id', apptDealershipId);
        if (apptStatus !== 'all') q2 = q2.eq('status', apptStatus);

        const res2 = await q2;
        data = res2.error ? [] : (res2.data as any[]);
      }
      setCalendarAppointments((data || []) as AppointmentRow[]);
    } finally {
      setCalendarLoading(false);
    }
  }, [clientId, calendarMonth, apptDealershipId, apptStatus]);

  useEffect(() => {
    if (appointmentsView === 'calendar') {
      fetchCalendarAppointments();
    }
  }, [fetchCalendarAppointments, appointmentsView]);

  // ---------- Cambiar estado (ADMIN) ----------
  const updateAppointmentStatus = async (appointmentId: number, newStatus: AdminStatus) => {
    setUpdatingStatus((prev) => ({ ...prev, [appointmentId]: true }));
    try {
      const { error } = await supabase.rpc('fn_appointments_set_status_admin', {
        p_appointment_id: appointmentId,
        p_status: newStatus,
        p_reason: null,
        p_admin_note: null,
      } as any);
      if (error) {
        throw error;
      }
      toast({
        title: t('success.saved', 'Guardado'),
        description: t('appointments.statusUpdated', 'Estado actualizado correctamente'),
      });

      const prevAppt = [...appointments, ...calendarAppointments].find(a => a.id === appointmentId);
      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'appointment_status_changed',
        properties: {
          appointment_id: appointmentId,
          from_status: prevAppt?.status || 'unknown',
          to_status: newStatus,
          client_id: clientId,
        },
      });

      await fetchAppointments();
      if (appointmentsView === 'calendar') await fetchCalendarAppointments();
    } catch (e: any) {
      toast({
        title: t('errors.title', 'Error'),
        description: e?.message || t('appointments.updateStatusError', 'No se pudo actualizar el estado'),
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus((prev) => ({ ...prev, [appointmentId]: false }));
    }
  };

  // ---------- Cargar etiquetas de vehículos ----------
  const fetchVehiclesLabels = async (ids: number[]) => {
    if (!ids.length) {
      setVehicleLabels({});
      return;
    }

    try {
      setVehiclesLoading(true);

      const { data, error } = await supabase
        .from('vehicles')
        .select('id, year, brand:brands(name), model:models(name)')
        .in('id', ids);

      if (error) {
        const alt = await supabase
          .from('vehicles')
          .select('id, year, brand_name, model_name')
          .in('id', ids);

        if (alt.error) {
          console.error('Error fetching vehicles:', error, alt.error);
          setVehicleLabels(Object.fromEntries(ids.map((id) => [id, `Vehículo #${id}`])));
          return;
        }

        const labels = Object.fromEntries(
          (alt.data || []).map((v: any) => [v.id, makeVehicleLabel(v) || `Vehículo #${v.id}`])
        );
        setVehicleLabels(labels);
        return;
      }

      const labels = Object.fromEntries(
        (data || []).map((v: any) => [v.id, makeVehicleLabel(v) || `Vehículo #${v.id}`])
      );
      setVehicleLabels(labels);
    } finally {
      setVehiclesLoading(false);
    }
  };

  // ---------- Cargar info de clientes (UUID) ----------
  const fetchCustomersInfo = async (ids: string[]) => {
    if (!ids.length) {
      setCustomersMap({});
      return;
    }
    try {
      setCustomersLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, phone')
        .in('id', ids as any);

      if (error) {
        console.error('Error fetching customers:', error);
        const fallback = Object.fromEntries(ids.map((id) => [id, { id, first_name: null, last_name: null, email: null, phone: null } as CustomerLite]));
        setCustomersMap(fallback);
        return;
      }

      const map: Record<string, CustomerLite> = {};
      for (const row of (data || []) as any[]) {
        map[row.id] = {
          id: row.id,
          first_name: row.first_name ?? null,
          last_name: row.last_name ?? null,
          email: row.email ?? null,
          phone: row.phone ?? null,
        };
      }
      setCustomersMap(map);
    } finally {
      setCustomersLoading(false);
    }
  };

  // Cuando cambian las citas o los eventos unificados, cargar vehículos y clientes en lote
  useEffect(() => {
    const allAppts = [...(appointments || []), ...(calendarAppointments || [])];
    // Also extract IDs from unified scheduling events
    const schedulingEvents = unifiedEvents.filter(e => e.source === 'scheduling');

    const vIds = Array.from(new Set([
      ...allAppts.map((a) => a.vehicle_id).filter((x): x is number => !!x),
      ...schedulingEvents.map(e => e.metadata?.vehicleId as number).filter((x): x is number => !!x),
    ]));
    fetchVehiclesLabels(vIds);

    const cIds = Array.from(new Set([
      ...allAppts.map((a) => a.customer_id).filter((x): x is string => !!x),
      ...schedulingEvents.map(e => e.metadata?.customerId as string).filter((x): x is string => !!x),
    ]));
    fetchCustomersInfo(cIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, calendarAppointments, unifiedEvents]);

  // Resolve customer name and vehicle label for the currently open detail event
  const detailCustomerName = useMemo(() => {
    if (!detailEvent || detailEvent.source !== 'scheduling') return undefined;
    const custId = detailEvent.metadata?.customerId as string | undefined;
    if (!custId) return undefined;
    const c = customersMap[custId];
    if (!c) return undefined;
    return [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || undefined;
  }, [detailEvent, customersMap]);

  const detailVehicleLabel = useMemo(() => {
    if (!detailEvent || detailEvent.source !== 'scheduling') return undefined;
    const vehId = detailEvent.metadata?.vehicleId as number | undefined;
    if (!vehId) return undefined;
    return vehicleLabels[vehId] || undefined;
  }, [detailEvent, vehicleLabels]);

  // -------------------- KPI cards config --------------------
  const kpiCards = [
    { label: t('kpi.total', 'Total'), value: kpiCounts.total, icon: CalendarCheck2, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', dot: 'bg-blue-500' },
    { label: t('kpi.confirmed', 'Confirmadas'), value: kpiCounts.confirmed, icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', dot: 'bg-emerald-500' },
    { label: t('kpi.pending', 'Pendientes'), value: kpiCounts.pending, icon: Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', dot: 'bg-amber-500' },
    { label: t('kpi.canceled', 'Canceladas'), value: kpiCounts.canceled, icon: XCircle, iconBg: 'bg-red-50', iconColor: 'text-red-500', dot: 'bg-red-400' },
  ];

  const kpiContainerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };

  const kpiItemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
  };

  // -------------------- Render --------------------
  return (
    <DashboardLayout>
      <main className="flex flex-col h-full bg-white">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center gap-4">
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {agendamientosTabs.map((tab) => {
                const isActive = activeTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                        : 'hover:bg-slate-200/60 text-slate-600'
                    }`}
                  >
                    <span>{t(tab.key, tab.fallback)}</span>
                  </button>
                );
              })}
            </div>
            <Button
              size="sm"
              onClick={() => handleCreateClick()}
              className="ml-auto h-9 rounded-xl text-[12px] font-medium bg-sky-400 hover:bg-sky-500 border-0 shadow-none"
            >
              Nuevo Evento
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto relative z-0">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            {/* Tab: Calendario unificado */}
            {activeTab === 'calendar' && (
              <div className="flex flex-col xl:flex-row gap-4">
                {/* Calendar grid */}
                <div className="flex-1 min-w-0">
                  <CalendarMonthView
                    events={filteredUnifiedEvents}
                    currentMonth={unifiedMonth}
                    selectedDay={unifiedSelectedDay}
                    onMonthChange={setUnifiedMonth}
                    onDaySelect={(day) => {
                      setUnifiedSelectedDay(day);
                    }}
                    onCreateClick={handleCreateClick}
                    isLoading={unifiedLoading}
                    enabledSources={enabledSources}
                    onToggleSource={handleToggleSource}
                  />
                </div>

                {/* Day detail sidebar */}
                <div className="w-full xl:w-80 shrink-0">
                  <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_6px_-2px_rgba(0,0,0,0.08)] p-4 sticky top-4">
                    <h3 className="text-[13px] font-bold text-slate-900 mb-3">
                      {format(unifiedSelectedDay, "EEEE d 'de' MMMM", { locale: es })}
                    </h3>
                    {selectedDayEvents.length === 0 ? (
                      <div className="flex flex-col items-center py-8">
                        <div className="w-16 h-16 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-center mb-4">
                          <CalendarDays className="h-7 w-7 text-slate-300" />
                        </div>
                        <p className="text-[13px] font-semibold text-slate-700 mb-1">Sin eventos</p>
                        <p className="text-[12px] text-slate-400">No hay eventos para este día</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedDayEvents.map((ev) => {
                          const evPhotos = ((ev.metadata?.photoUrls as string[] | undefined) || []);
                          return (
                            <button
                              key={ev.id}
                              onClick={() => handleEventClick(ev)}
                              className={`w-full text-left rounded-xl p-2.5 border transition-all hover:shadow-sm ${ev.color} border-transparent hover:border-slate-200`}
                            >
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`h-2 w-2 rounded-full shrink-0 ${ev.dotColor}`} />
                                <span className={`text-[12px] font-semibold truncate flex-1 ${ev.textColor}`}>{ev.title}</span>
                                {evPhotos.length > 0 && (
                                  <div className="flex items-center -space-x-1.5 shrink-0">
                                    {evPhotos.slice(0, 3).map((url, i) => (
                                      <span
                                        key={url}
                                        className="inline-block h-4 w-4 rounded-full ring-[1.5px] ring-white bg-slate-200 overflow-hidden shadow-sm"
                                        style={{ zIndex: 10 - i }}
                                      >
                                        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                                      </span>
                                    ))}
                                    {evPhotos.length > 3 && (
                                      <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full ring-[1.5px] ring-white bg-slate-700 text-white text-[8px] font-bold leading-none">
                                        +{evPhotos.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              {!ev.allDay && (
                                <span className="text-[11px] text-slate-500 ml-4">
                                  {format(ev.start, 'HH:mm')}{ev.end ? ` – ${format(ev.end, 'HH:mm')}` : ''}
                                </span>
                              )}
                              {evPhotos.length > 0 && (
                                <div className="mt-2 ml-4 grid grid-cols-4 gap-1">
                                  {evPhotos.slice(0, 4).map((url, i) => {
                                    const showOverlay = evPhotos.length > 4 && i === 3;
                                    return (
                                      <div
                                        key={url}
                                        className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 border border-white shadow-sm"
                                      >
                                        <img src={url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                                        {showOverlay && (
                                          <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center text-white text-[11px] font-bold">
                                            +{evPhotos.length - 4}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Horarios */}
            {activeTab === 'hours' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label className="text-[13px] font-medium text-slate-600 whitespace-nowrap">
                    {t('dealerships.select', 'Sucursal')}
                  </Label>
                  <Select
                    value={selectedDealershipId ? String(selectedDealershipId) : ''}
                    onValueChange={(val) => setSelectedDealershipId(Number(val))}
                    disabled={loadingDealerships}
                  >
                    <SelectTrigger className="w-full max-w-xs h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]">
                      <SelectValue placeholder={t('dealerships.placeholder', 'Selecciona una sucursal')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(dealerships || []).map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.address || t('dealerships.noAddress', 'Sin dirección')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedDealershipId ? (
                  <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 text-amber-700 text-[13px] p-3.5">
                    {t('hours.needDealership', 'Selecciona una sucursal específica para configurar los horarios.')}
                  </div>
                ) : (
                  <>
                    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-slate-100">
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium w-[160px]">{t('table.weekday', 'Día')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium w-[110px]">{t('table.open', 'Abierto')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('table.openTime', 'Apertura')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('table.closeTime', 'Cierre')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium w-[150px]">{t('table.slotMinutes', 'Duración (min)')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium w-[180px]">{t('table.capacity', 'Capacidad por slot')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {days.map((d) => (
                            <TableRow key={d.weekday} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                              <TableCell className="font-medium text-[13px] text-slate-700">{['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.weekday]}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={d.is_open}
                                    onCheckedChange={(val) => updateDay(d.weekday, { is_open: val })}
                                    aria-label={t('a11y.toggleOpen', 'Alternar abierto/cerrado')}
                                  />
                                  <span className="text-[13px] text-slate-500">
                                    {d.is_open ? t('labels.open', 'Abierto') : t('labels.closed', 'Cerrado')}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="time"
                                  value={d.open_time}
                                  onChange={(e) => updateDay(d.weekday, { open_time: e.target.value })}
                                  disabled={!d.is_open}
                                  className="h-9 rounded-xl border-slate-200/60 text-[13px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="time"
                                  value={d.close_time}
                                  onChange={(e) => updateDay(d.weekday, { close_time: e.target.value })}
                                  disabled={!d.is_open}
                                  className="h-9 rounded-xl border-slate-200/60 text-[13px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={5}
                                  step={5}
                                  value={d.slot_minutes}
                                  onChange={(e) => updateDay(d.weekday, { slot_minutes: Number(e.target.value || 0) })}
                                  disabled={!d.is_open}
                                  className="h-9 rounded-xl border-slate-200/60 text-[13px]"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={d.capacity_per_slot}
                                  onChange={(e) => updateDay(d.weekday, { capacity_per_slot: Number(e.target.value || 1) })}
                                  disabled={!d.is_open}
                                  className="h-9 rounded-xl border-slate-200/60 text-[13px]"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" onClick={() => refetchHours()} disabled={loadingHours} className="h-9 rounded-xl text-[13px] border-slate-200/60">
                        {loadingHours ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        {t('actions.refresh', 'Actualizar')}
                      </Button>
                      <Button onClick={handleSave} disabled={saving || !selectedDealershipId} className="h-9 rounded-xl text-[13px]">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {t('actions.save', 'Guardar')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: Vista previa */}
            {activeTab === 'preview' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label className="text-[13px] font-medium text-slate-600 whitespace-nowrap">
                    {t('dealerships.select', 'Sucursal')}
                  </Label>
                  <Select
                    value={selectedDealershipId ? String(selectedDealershipId) : ''}
                    onValueChange={(val) => setSelectedDealershipId(Number(val))}
                    disabled={loadingDealerships}
                  >
                    <SelectTrigger className="w-full max-w-xs h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]">
                      <SelectValue placeholder={t('dealerships.placeholder', 'Selecciona una sucursal')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(dealerships || []).map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.address || t('dealerships.noAddress', 'Sin dirección')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedDealershipId ? (
                  <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 text-amber-700 text-[13px] p-3.5">
                    {t('preview.needDealership', 'Selecciona una sucursal específica para ver la disponibilidad.')}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                      <div className="w-full sm:w-auto">
                        <Label className="mb-2 block text-[13px] text-slate-600">{t('preview.date', 'Fecha')}</Label>
                        <Input
                          type="date"
                          value={previewDate}
                          onChange={(e) => setPreviewDate(e.target.value)}
                          className="h-9 rounded-xl border-slate-200/60 text-[13px]"
                        />
                      </div>
                      <div className="grow" />
                      <div>
                        <Label className="mb-2 block text-[13px] text-slate-600">{t('preview.timezone', 'Zona horaria')}</Label>
                        <div className="text-[13px] text-slate-500">{timezone}</div>
                      </div>
                    </div>

                    <div>
                      {slotsLoading ? (
                        <div className="flex items-center justify-center py-8 text-slate-400 text-[13px]">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {t('preview.loading', 'Cargando slots...')}
                        </div>
                      ) : slots.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-[13px] text-slate-400">
                          <CalendarDays className="h-5 w-5 mr-2" />
                          {t('preview.noSlots', 'No hay horarios para la fecha seleccionada.')}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {slots.map((s, i) => (
                            <div
                              key={String(s.slot_start) + i}
                              className="bg-white rounded-xl border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] text-[13px] font-medium text-slate-700 py-2.5 px-3 text-center"
                            >
                              {pickHHMM(s.slot_start)} – {pickHHMM(s.slot_end)}
                              {s.capacity > 1 ? ` · x${s.capacity}` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: Citas — REMOVED: merged into unified calendar */}
            {false && (
              <div className="space-y-3 sm:space-y-4">
                <div className="hidden sm:flex sm:items-end gap-3 flex-wrap">
                  <h2 className="text-[15px] sm:text-[17px] font-semibold text-slate-900 tracking-tight mr-auto pb-0.5 flex items-center gap-2">
                    <CalendarCheck2 className="h-5 w-5 text-slate-900" />
                    {t('appointments.title', 'Citas agendadas')}
                  </h2>
                  <div className="w-36">
                    <Label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appointments.status', 'Estado')}</Label>
                    <Select value={apptStatus} onValueChange={(v: AdminStatus | 'all') => setApptStatus(v)}>
                      <SelectTrigger className="w-full h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]">
                        <SelectValue placeholder={t('appointments.all', 'Todos')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('appointments.all', 'Todos')}</SelectItem>
                        <SelectItem value="pending">{t('appointments.pending', 'Pendiente')}</SelectItem>
                        <SelectItem value="confirmed">{t('appointments.confirmed', 'Confirmada')}</SelectItem>
                        <SelectItem value="canceled">{t('appointments.canceled', 'Cancelada')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <Label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appointments.branch', 'Sucursal')}</Label>
                    <Select
                      value={apptDealershipId ? String(apptDealershipId) : 'all'}
                      onValueChange={(val) => {
                        if (val === 'all') setApptDealershipId(null);
                        else setApptDealershipId(Number(val));
                      }}
                    >
                      <SelectTrigger className="w-full h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]">
                        <SelectValue placeholder={t('dealerships.placeholder', 'Selecciona una sucursal')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('dealerships.all', 'Todas las sucursales')}</SelectItem>
                        {(dealerships || []).map((d) => (
                          <SelectItem key={d.id} value={String(d.id)}>
                            {d.address || t('dealerships.noAddress', 'Sin dirección')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {appointmentsView === 'table' && (
                    <>
                      <div className="w-36">
                        <Label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appointments.from', 'Desde')}</Label>
                        <Input type="date" value={apptFrom} onChange={(e) => setApptFrom(e.target.value)} className="h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]" />
                      </div>
                      <div className="w-36">
                        <Label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appointments.to', 'Hasta')}</Label>
                        <Input type="date" value={apptTo} onChange={(e) => setApptTo(e.target.value)} className="h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]" />
                      </div>
                      <Button variant="outline" onClick={fetchAppointments} disabled={appointmentsLoading} className="h-9 rounded-xl text-[13px] border-slate-200/60">
                        {appointmentsLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        {t('actions.refresh', 'Actualizar')}
                      </Button>
                    </>
                  )}
                  <AppointmentsViewToggle value={appointmentsView} onChange={setAppointmentsView} />
                </div>

                {/* Mobile: stacked filters like before */}
                <div className="sm:hidden space-y-2">
                  <div className="flex items-center justify-between">
                    <AppointmentsViewToggle value={appointmentsView} onChange={setAppointmentsView} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appointments.status', 'Estado')}</Label>
                      <Select value={apptStatus} onValueChange={(v: AdminStatus | 'all') => setApptStatus(v)}>
                        <SelectTrigger className="w-full h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]">
                          <SelectValue placeholder={t('appointments.all', 'Todos')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('appointments.all', 'Todos')}</SelectItem>
                          <SelectItem value="pending">{t('appointments.pending', 'Pendiente')}</SelectItem>
                          <SelectItem value="confirmed">{t('appointments.confirmed', 'Confirmada')}</SelectItem>
                          <SelectItem value="canceled">{t('appointments.canceled', 'Cancelada')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appointments.branch', 'Sucursal')}</Label>
                      <Select
                        value={apptDealershipId ? String(apptDealershipId) : 'all'}
                        onValueChange={(val) => {
                          if (val === 'all') setApptDealershipId(null);
                          else setApptDealershipId(Number(val));
                        }}
                      >
                        <SelectTrigger className="w-full h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]">
                          <SelectValue placeholder={t('dealerships.placeholder', 'Selecciona una sucursal')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('dealerships.all', 'Todas las sucursales')}</SelectItem>
                          {(dealerships || []).map((d) => (
                            <SelectItem key={d.id} value={String(d.id)}>
                              {d.address || t('dealerships.noAddress', 'Sin dirección')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {appointmentsView === 'table' && (
                      <>
                        <div>
                          <Label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appointments.from', 'Desde')}</Label>
                          <Input type="date" value={apptFrom} onChange={(e) => setApptFrom(e.target.value)} className="h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]" />
                        </div>
                        <div>
                          <Label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appointments.to', 'Hasta')}</Label>
                          <Input type="date" value={apptTo} onChange={(e) => setApptTo(e.target.value)} className="h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]" />
                        </div>
                        <div className="col-span-2">
                          <Button variant="outline" onClick={fetchAppointments} disabled={appointmentsLoading} className="w-full h-9 rounded-xl text-[13px] border-slate-200/60">
                            {appointmentsLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            {t('actions.refresh', 'Actualizar')}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {appointmentsSourceMissing === 'both' && (
                  <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 text-amber-700 text-[13px] p-3.5">
                    {t(
                      'appointments.missingView',
                      'No existe una vista pública de citas (appointments_public o appointments_view). Crea una vista en schema public que exponga las columnas básicas para poder listarlas aquí.'
                    )}
                  </div>
                )}

                {/* ========== CALENDAR VIEW ========== */}
                {appointmentsView === 'calendar' && (
                  <AppointmentsCalendarGrid
                    appointments={calendarAppointments}
                    currentMonth={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selectedDay={selectedCalendarDay}
                    onDaySelect={setSelectedCalendarDay}
                    isLoading={calendarLoading}
                    customerNames={calendarCustomerNames}
                    vehicleLabels={vehicleLabels}
                    updatingStatus={updatingStatus}
                    onStatusChange={updateAppointmentStatus}
                  />
                )}

                {/* ========== TABLE VIEW ========== */}
                {appointmentsView === 'table' && (
                  <>
                    {/* Desktop table */}
                    <div className="hidden lg:block bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-slate-100">
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appt.table.date', 'Fecha')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appt.table.time', 'Hora')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appt.table.dealership', 'Sucursal')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appt.table.service', 'Servicio')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appt.table.customer', 'Cliente')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appt.table.vehicle', 'Vehículo')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appt.table.status', 'Estado')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appt.table.channel', 'Canal')}</TableHead>
                            <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium">{t('appt.table.notes', 'Notas')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedAppointments.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center text-slate-400 text-[13px] py-8">
                                {appointmentsLoading
                                  ? (
                                    <span className="inline-flex items-center gap-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      {t('appt.loading', 'Cargando...')}
                                    </span>
                                  )
                                  : t('appt.empty', 'No hay citas con los filtros seleccionados.')}
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedAppointments.map((a) => {
                              const dateLabel = prettyDate(a.slot_start) || pickDateYMD(a.slot_start) || '-';
                              const timeLabel = `${pickHHMM(a.slot_start)} – ${pickHHMM(a.slot_end)}`;
                              const addr = a.address || (dealerships?.find(d => d.id === a.dealership_id)?.address ?? '');

                              // Vehículo
                              const vehicleCell = a.vehicle_id ? (
                                vehiclesLoading && !vehicleLabels[a.vehicle_id] ? (
                                  <span className="inline-flex items-center gap-2 text-slate-400">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    {`Vehículo #${a.vehicle_id}`}
                                  </span>
                                ) : (
                                  <a
                                    href={`/vehiculos/${a.vehicle_id}`}
                                    className="text-sky-600 hover:underline underline-offset-4 text-[13px]"
                                    target="_blank"
                                    rel="noreferrer"
                                    title={vehicleLabels[a.vehicle_id] || `Vehículo #${a.vehicle_id}`}
                                  >
                                    {vehicleLabels[a.vehicle_id] || `Vehículo #${a.vehicle_id}`}
                                  </a>
                                )
                              ) : ('-');

                              // Cliente (UUID)
                              let customerCell: React.ReactNode = '-';
                              if (a.customer_id) {
                                const c = customersMap[a.customer_id];
                                if (customersLoading && !c) {
                                  customerCell = (
                                    <span className="inline-flex items-center gap-2 text-slate-400">
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      {`Cliente #${a.customer_id}`}
                                    </span>
                                  );
                                } else if (c) {
                                  const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || `Cliente #${a.customer_id}`;
                                  const contactLine = [c.email || '', c.phone || ''].filter(Boolean).join(' · ');
                                  customerCell = (
                                    <div className="min-w-[220px]">
                                      <div className="font-medium text-[13px] text-slate-800">{fullName}</div>
                                      {!!contactLine && (
                                        <div className="text-[11px] text-slate-400 truncate">{contactLine}</div>
                                      )}
                                    </div>
                                  );
                                } else {
                                  customerCell = `Cliente #${a.customer_id}`;
                                }
                              }

                              return (
                                <TableRow key={a.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                                  <TableCell className="text-[13px] text-slate-700">{dateLabel}</TableCell>
                                  <TableCell className="text-[13px] text-slate-700">{timeLabel}</TableCell>
                                  <TableCell className="max-w-[280px] truncate text-[13px] text-slate-600">{addr || '-'}</TableCell>
                                  <TableCell className="text-[13px] text-slate-700">{a.service_name || '-'}</TableCell>
                                  <TableCell>{customerCell}</TableCell>
                                  <TableCell>{vehicleCell}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2 min-w-[140px]">
                                      <Select
                                        value={a.status}
                                        onValueChange={(val: AdminStatus) => updateAppointmentStatus(a.id, val)}
                                        disabled={!!updatingStatus[a.id]}
                                      >
                                        <SelectTrigger className={cn(
                                          'w-[130px] h-8 rounded-lg text-[12px] capitalize',
                                          a.status === 'confirmed' && 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
                                          a.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200/60',
                                          a.status === 'canceled' && 'bg-rose-50 text-rose-700 border-rose-200/60'
                                        )}>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {ADMIN_STATUSES.map(s => (
                                            <SelectItem key={s} value={s} className="capitalize text-[12px]">
                                              {s}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {updatingStatus[a.id] && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-[13px] text-slate-500">{a.channel || '-'}</TableCell>
                                  <TableCell className="max-w-[320px] truncate text-[13px] text-slate-500">{a.notes || ''}</TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile appointment cards */}
                    <div className="lg:hidden space-y-2">
                      {appointmentsLoading ? (
                        <div className="flex items-center justify-center py-12 text-slate-400 text-[13px]">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          {t('appt.loading', 'Cargando...')}
                        </div>
                      ) : paginatedAppointments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                          <CalendarDays className="h-8 w-8 mb-2" />
                          <span className="text-[13px]">{t('appt.empty', 'No hay citas con los filtros seleccionados.')}</span>
                        </div>
                      ) : (
                        paginatedAppointments.map((a, index) => {
                          const timeLabel = `${pickHHMM(a.slot_start)} – ${pickHHMM(a.slot_end)}`;
                          const dateLabel = prettyDate(a.slot_start) || pickDateYMD(a.slot_start) || '';

                          const c = a.customer_id ? customersMap[a.customer_id] : null;
                          const custName = c ? [c.first_name, c.last_name].filter(Boolean).join(' ').trim() : null;
                          const vehLabel = a.vehicle_id ? vehicleLabels[a.vehicle_id] : null;

                          const statusDot = a.status === 'confirmed' ? 'bg-emerald-500'
                            : a.status === 'pending' ? 'bg-amber-500'
                            : 'bg-rose-400';
                          const statusLabel = a.status === 'confirmed' ? t('appointments.confirmed', 'Confirmada')
                            : a.status === 'pending' ? t('appointments.pending', 'Pendiente')
                            : t('appointments.canceled', 'Cancelada');
                          const statusBg = a.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700'
                            : a.status === 'pending' ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700';

                          return (
                            <motion.div
                              key={a.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.04, ease: [0.25, 0.1, 0.25, 1] }}
                              className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 p-3.5"
                            >
                              {/* Header: date/time + status badge */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-[13px] font-semibold text-slate-800">{dateLabel} {timeLabel}</span>
                                </div>
                                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', statusBg)}>
                                  <span className={cn('h-1.5 w-1.5 rounded-full', statusDot)} />
                                  {statusLabel}
                                </span>
                              </div>

                              {/* Body */}
                              <div className="space-y-1">
                                {a.service_name && (
                                  <div className="text-[13px] text-slate-700 font-medium">{a.service_name}</div>
                                )}
                                {custName && (
                                  <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
                                    <User className="h-3 w-3 text-slate-400" />
                                    {custName}
                                  </div>
                                )}
                                {vehLabel && (
                                  <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
                                    <Car className="h-3 w-3 text-slate-400" />
                                    {a.vehicle_id ? (
                                      <a
                                        href={`/vehiculos/${a.vehicle_id}`}
                                        className="text-sky-600 hover:underline underline-offset-2"
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {vehLabel}
                                      </a>
                                    ) : vehLabel}
                                  </div>
                                )}
                              </div>

                              {/* Status changer */}
                              <div className="mt-2.5">
                                <Select
                                  value={a.status}
                                  onValueChange={(val: AdminStatus) => updateAppointmentStatus(a.id, val)}
                                  disabled={!!updatingStatus[a.id]}
                                >
                                  <SelectTrigger className={cn(
                                    'w-full h-8 rounded-lg text-[12px] capitalize',
                                    a.status === 'confirmed' && 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
                                    a.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200/60',
                                    a.status === 'canceled' && 'bg-rose-50 text-rose-700 border-rose-200/60',
                                  )}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ADMIN_STATUSES.map(s => (
                                      <SelectItem key={s} value={s} className="capitalize text-[12px]">
                                        {s}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pagination removed — Citas tab merged into unified calendar */}
        {/* ── Unified calendar drawers ── */}
        <CreateCalendarEventDrawer
          open={createEventOpen}
          onOpenChange={setCreateEventOpen}
          onSubmit={async (data) => {
            const result = editEventId
              ? await updateEvent(editEventId, data)
              : await createEvent(data);
            if (!result.error) {
              refetchUnified();
              setCreateEventOpen(false);
            }
            return result;
          }}
          defaultDate={createEventDate}
          editEvent={editEventData}
        />
        <CalendarEventDetailDrawer
          event={detailEvent}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onDelete={handleDeleteEvent}
          onEdit={handleEditEvent}
          onAppointmentStatusChange={handleDrawerAppointmentStatus}
          appointmentUpdating={drawerApptUpdating}
          customerName={detailCustomerName}
          vehicleLabel={detailVehicleLabel}
        />
      </main>
    </DashboardLayout>
  );
};

export default Calendario;
