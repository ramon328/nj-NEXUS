import React, { useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isToday, isSameMonth, isSameDay,
  format, addMonths, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, User, Car, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type AdminStatus = 'pending' | 'confirmed' | 'canceled';
const ADMIN_STATUSES: AdminStatus[] = ['pending', 'confirmed', 'canceled'];

export interface CalendarAppointment {
  id: number;
  slot_start: string | Date;
  slot_end: string | Date;
  service_name: string | null;
  status: AdminStatus;
  customer_id: string | null;
  vehicle_id: number | null;
  notes: string | null;
  channel: string | null;
}

interface AppointmentsCalendarGridProps {
  appointments: CalendarAppointment[];
  currentMonth: Date;
  onMonthChange: (d: Date) => void;
  selectedDay: Date | null;
  onDaySelect: (d: Date) => void;
  isLoading?: boolean;
  customerNames: Record<string, string>;
  vehicleLabels: Record<number, string>;
  updatingStatus: Record<number, boolean>;
  onStatusChange: (id: number, status: AdminStatus) => void;
}

const STATUS_BG: Record<AdminStatus, string> = {
  confirmed: 'bg-emerald-50/80 border-emerald-200/60',
  pending: 'bg-amber-50/80 border-amber-200/60',
  canceled: 'bg-rose-50/80 border-rose-200/60',
};

const STATUS_DOT: Record<AdminStatus, string> = {
  confirmed: 'bg-emerald-500',
  pending: 'bg-amber-500',
  canceled: 'bg-rose-400',
};

const STATUS_BADGE: Record<AdminStatus, string> = {
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200/60',
  pending: 'bg-amber-100 text-amber-800 border-amber-200/60',
  canceled: 'bg-rose-100 text-rose-800 border-rose-200/60',
};

const WEEKDAY_LABELS_FULL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const WEEKDAY_LABELS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

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

  let match = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}-${String(Number(match[3])).padStart(2, '0')}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }
  return '';
};

const AppointmentsCalendarGrid: React.FC<AppointmentsCalendarGridProps> = ({
  appointments,
  currentMonth,
  onMonthChange,
  selectedDay,
  onDaySelect,
  isLoading,
  customerNames,
  vehicleLabels,
  updatingStatus,
  onStatusChange,
}) => {
  const [dialogDay, setDialogDay] = useState<Date | null>(null);

  const appointmentsByDay = useMemo(() => {
    const map: Record<string, CalendarAppointment[]> = {};
    for (const appt of appointments) {
      const key = pickDateYMD(appt.slot_start);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(appt);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => String(a.slot_start).localeCompare(String(b.slot_start)));
    }
    return map;
  }, [appointments]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: es });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const handlePrev = () => onMonthChange(subMonths(currentMonth, 1));
  const handleNext = () => onMonthChange(addMonths(currentMonth, 1));
  const handleToday = () => {
    const today = new Date();
    onMonthChange(startOfMonth(today));
    onDaySelect(today);
  };

  const MAX_VISIBLE_DESKTOP = 3;

  // Dialog
  const dialogDayKey = dialogDay ? format(dialogDay, 'yyyy-MM-dd') : '';
  const dialogAppts = dialogDay ? (appointmentsByDay[dialogDayKey] || []) : [];
  const dialogDayLabel = dialogDay
    ? (() => {
        const l = format(dialogDay, "EEEE d 'de' MMMM yyyy", { locale: es });
        return l.charAt(0).toUpperCase() + l.slice(1);
      })()
    : '';

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button variant="outline" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-lg border-slate-200/60 hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} className="h-8 w-8 rounded-lg border-slate-200/60 hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-[15px] sm:text-[17px] font-semibold text-slate-900 tracking-tight ml-1 sm:ml-2">{capitalizedMonth}</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleToday} className="h-8 rounded-lg text-[12px] font-medium border-slate-200/60 hover:bg-slate-50">
          Hoy
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-slate-400 text-[13px]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Cargando citas del mes...
        </div>
      )}

      {/* Grid */}
      {!isLoading && (
        <div className="border border-slate-200/60 rounded-2xl overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 bg-slate-50/80 border-b border-slate-200/60">
            {WEEKDAY_LABELS_FULL.map((label, i) => (
              <div key={label} className="py-1.5 sm:py-2 text-center text-[11px] uppercase tracking-wider text-slate-400 font-medium">
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{WEEKDAY_LABELS_SHORT[i]}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayAppts = appointmentsByDay[key] || [];
              const inMonth = isSameMonth(day, currentMonth);
              const todayFlag = isToday(day);
              const selected = selectedDay ? isSameDay(day, selectedDay) : false;
              const extraCount = dayAppts.length > MAX_VISIBLE_DESKTOP ? dayAppts.length - MAX_VISIBLE_DESKTOP : 0;
              const hasAppts = dayAppts.length > 0;

              return (
                <div
                  key={key}
                  onClick={() => {
                    if (!inMonth) onMonthChange(startOfMonth(day));
                    onDaySelect(day);
                    if (hasAppts) setDialogDay(day);
                  }}
                  className={cn(
                    'relative text-left border-b border-r border-slate-100 transition-colors cursor-pointer',
                    'active:bg-slate-100/80',
                    'min-h-[52px] sm:min-h-[120px]',
                    'p-1 sm:p-1.5',
                    'hover:bg-slate-50/50',
                    !inMonth && 'opacity-40',
                    todayFlag && 'bg-primary/5',
                    selected && 'ring-2 ring-inset ring-primary/40',
                    (idx + 1) % 7 === 0 && 'border-r-0',
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-center sm:justify-between mb-0.5 sm:mb-1">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center leading-none',
                        'text-xs sm:text-sm',
                        todayFlag
                          ? 'h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary text-white font-semibold'
                          : 'font-medium text-slate-700'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {/* Desktop count label */}
                    {hasAppts && (
                      <span className="hidden sm:inline text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                        {dayAppts.length} cita{dayAppts.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* ===== MOBILE: colored dots + count ===== */}
                  {hasAppts && (
                    <div className="sm:hidden flex flex-col items-center gap-[3px]">
                      <div className="flex items-center justify-center gap-[3px] flex-wrap">
                        {dayAppts.slice(0, 3).map((appt) => (
                          <span
                            key={appt.id}
                            className={cn('h-[5px] w-[5px] rounded-full', STATUS_DOT[appt.status])}
                          />
                        ))}
                      </div>
                      {dayAppts.length > 3 && (
                        <span className="text-[8px] text-slate-400 font-semibold leading-none">
                          +{dayAppts.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* ===== DESKTOP: rich appointment cards ===== */}
                  <div className="hidden sm:block space-y-1">
                    {dayAppts.slice(0, MAX_VISIBLE_DESKTOP).map((appt) => {
                      const time = pickHHMM(appt.slot_start);
                      const custName = appt.customer_id ? customerNames[appt.customer_id] : null;
                      return (
                        <div
                          key={appt.id}
                          className={cn(
                            'rounded-md border px-1.5 py-1 text-[11px] leading-tight',
                            STATUS_BG[appt.status],
                          )}
                        >
                          <div className="flex items-center gap-1">
                            <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', STATUS_DOT[appt.status])} />
                            <span className="font-semibold text-slate-800">{time}</span>
                            {appt.service_name && (
                              <span className="truncate text-slate-500 ml-0.5">
                                {appt.service_name}
                              </span>
                            )}
                          </div>
                          {custName && (
                            <div className="truncate text-slate-400 pl-[14px]">
                              {custName}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {extraCount > 0 && (
                      <div className="text-[10px] text-primary font-medium pl-1 hover:underline">
                        +{extraCount} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day detail dialog */}
      <Dialog open={!!dialogDay} onOpenChange={(open) => { if (!open) setDialogDay(null); }}>
        <DialogContent className={cn(
          'overflow-y-auto',
          'w-[calc(100%-1rem)] max-h-[80vh] rounded-2xl p-4',
          'sm:w-full sm:max-w-lg sm:max-h-[85vh] sm:rounded-2xl sm:p-6',
        )}>
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg leading-snug text-slate-900">{dialogDayLabel}</DialogTitle>
            <DialogDescription className="text-[13px] text-slate-500">
              {dialogAppts.length} cita{dialogAppts.length !== 1 ? 's' : ''} agendada{dialogAppts.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          {dialogAppts.length === 0 ? (
            <p className="text-[13px] text-slate-400 py-4">No hay citas para este día.</p>
          ) : (
            <div className="space-y-2.5 sm:space-y-3 mt-1 sm:mt-2">
              {dialogAppts.map((a) => {
                const timeLabel = `${pickHHMM(a.slot_start)} – ${pickHHMM(a.slot_end)}`;
                const custName = a.customer_id ? customerNames[a.customer_id] : null;
                const vehName = a.vehicle_id ? vehicleLabels[a.vehicle_id] : null;

                return (
                  <div
                    key={a.id}
                    className={cn(
                      'rounded-xl border-l-4 border border-slate-200/60 p-3 sm:p-3.5 space-y-1.5 sm:space-y-2 bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]',
                      a.status === 'confirmed' && 'border-l-emerald-500',
                      a.status === 'pending' && 'border-l-amber-500',
                      a.status === 'canceled' && 'border-l-rose-400',
                    )}
                  >
                    {/* Time + status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                        <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        {timeLabel}
                      </div>
                      <Badge variant="secondary" className={cn('capitalize text-[10px] sm:text-[11px] whitespace-nowrap border', STATUS_BADGE[a.status])}>
                        {a.status}
                      </Badge>
                    </div>

                    {a.service_name && (
                      <div className="flex items-center gap-1.5 text-[13px] text-slate-700">
                        <FileText className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="break-words min-w-0">{a.service_name}</span>
                      </div>
                    )}

                    {custName && (
                      <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
                        <User className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="break-words min-w-0">{custName}</span>
                      </div>
                    )}

                    {vehName && (
                      <div className="flex items-center gap-1.5 text-[13px] text-slate-600">
                        <Car className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        {a.vehicle_id ? (
                          <a
                            href={`/vehiculos/${a.vehicle_id}`}
                            className="text-sky-600 hover:underline underline-offset-2 break-words min-w-0"
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {vehName}
                          </a>
                        ) : <span className="break-words min-w-0">{vehName}</span>}
                      </div>
                    )}

                    {a.notes && (
                      <p className="text-[12px] text-slate-400 italic pl-5 break-words">{a.notes}</p>
                    )}

                    {/* Status changer */}
                    <div className="pt-0.5 sm:pt-1">
                      <Select
                        value={a.status}
                        onValueChange={(val: AdminStatus) => onStatusChange(a.id, val)}
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
                          {ADMIN_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize text-[12px]">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentsCalendarGrid;
