import React, { useMemo, useState } from 'react';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isToday, isSameMonth, isSameDay,
  format, addMonths, subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UnifiedCalendarEvent, UnifiedEventSource } from '@/types/calendarEvent';
import { SOURCE_COLORS } from './calendarConstants';

interface CalendarMonthViewProps {
  events: UnifiedCalendarEvent[];
  currentMonth: Date;
  selectedDay: Date;
  onMonthChange: (d: Date) => void;
  onDaySelect: (d: Date) => void;
  onCreateClick: (date?: Date) => void;
  isLoading?: boolean;
  enabledSources: UnifiedEventSource[];
  onToggleSource: (source: UnifiedEventSource) => void;
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const WEEKDAY_LABELS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MAX_VISIBLE = 3;

export default function CalendarMonthView({
  events,
  currentMonth,
  selectedDay,
  onMonthChange,
  onDaySelect,
  onCreateClick,
  isLoading,
  enabledSources,
  onToggleSource,
}: CalendarMonthViewProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map: Record<string, UnifiedCalendarEvent[]> = {};
    for (const ev of events) {
      const key = format(ev.start, 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: es });
  const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="w-full">
      {/* Navigation + filters */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_6px_-2px_rgba(0,0,0,0.08)] mb-4 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline" size="icon"
              onClick={() => onMonthChange(subMonths(currentMonth, 1))}
              className="h-8 w-8 rounded-xl border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="icon"
              onClick={() => onMonthChange(addMonths(currentMonth, 1))}
              className="h-8 w-8 rounded-xl border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h3 className="text-[15px] sm:text-lg font-bold text-slate-900 tracking-tight ml-1 sm:ml-2">{capitalizedMonth}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => { onMonthChange(startOfMonth(new Date())); onDaySelect(new Date()); }}
              className="h-8 rounded-xl text-[12px] font-medium border-slate-200/80 hover:bg-slate-50"
            >
              Hoy
            </Button>
          </div>
        </div>

        {/* Source filters */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar sm:flex-wrap sm:overflow-visible">
          {(Object.keys(SOURCE_COLORS) as UnifiedEventSource[]).map((source) => {
            const c = SOURCE_COLORS[source];
            const active = enabledSources.includes(source);
            const count = events.filter(e => e.source === source).length;
            return (
              <button
                key={source}
                onClick={() => onToggleSource(source)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all whitespace-nowrap shrink-0 sm:shrink',
                  active
                    ? `${c.bg} ${c.text} ${c.border} shadow-sm`
                    : 'bg-white text-slate-400 border-slate-200/80 hover:border-slate-300',
                )}
              >
                <span className={cn('h-2 w-2 rounded-full transition-colors', active ? c.dot : 'bg-slate-300')} />
                {c.label}
                {count > 0 && active && (
                  <span className={cn('ml-0.5 text-[10px] opacity-70')}>({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200/60 flex items-center justify-center py-24 text-slate-400 text-[13px]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Cargando eventos...
        </div>
      )}

      {/* Calendar grid */}
      {!isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_6px_-2px_rgba(0,0,0,0.08)] overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-slate-200/60">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={label} className="py-2.5 sm:py-3 text-center text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{WEEKDAY_LABELS_SHORT[i]}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, idx) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayEvents = eventsByDay[key] || [];
              const inMonth = isSameMonth(day, currentMonth);
              const todayFlag = isToday(day);
              const selected = isSameDay(day, selectedDay);
              const hasEvents = dayEvents.length > 0;
              const extraCount = dayEvents.length > MAX_VISIBLE ? dayEvents.length - MAX_VISIBLE : 0;
              const isHovered = hoveredDay === key;
              const isWeekend = (idx % 7) >= 5;

              return (
                <div
                  key={key}
                  onClick={() => {
                    if (!inMonth) onMonthChange(startOfMonth(day));
                    onDaySelect(day);
                  }}
                  onMouseEnter={() => setHoveredDay(key)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={cn(
                    'relative text-left border-b border-r border-slate-100/80 transition-all cursor-pointer',
                    'min-h-[52px] sm:min-h-[115px]',
                    'p-1 sm:p-1.5',
                    !inMonth && 'opacity-30 bg-slate-50/50',
                    inMonth && 'hover:bg-primary/[0.02]',
                    isWeekend && inMonth && 'bg-slate-50/30',
                    todayFlag && 'bg-primary/[0.04]',
                    selected && 'ring-2 ring-inset ring-primary/30 bg-primary/[0.04]',
                    (idx + 1) % 7 === 0 && 'border-r-0',
                    idx >= calendarDays.length - 7 && 'border-b-0',
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-center sm:justify-start mb-0.5 sm:mb-1">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center leading-none transition-all',
                        'text-[11px] sm:text-[13px]',
                        todayFlag
                          ? 'h-6 w-6 rounded-full bg-primary text-white font-bold shadow-sm shadow-primary/25'
                          : selected
                            ? 'h-6 w-6 rounded-full bg-primary/10 text-primary font-bold'
                            : 'font-medium text-slate-700',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* MOBILE: colored dots */}
                  {hasEvents && (
                    <div className="sm:hidden flex flex-col items-center gap-[3px]">
                      <div className="flex items-center justify-center gap-[3px] flex-wrap">
                        {dayEvents.slice(0, 4).map((ev) => (
                          <span key={ev.id} className={cn('h-[6px] w-[6px] rounded-full shadow-sm', ev.dotColor)} />
                        ))}
                      </div>
                      {dayEvents.length > 4 && (
                        <span className="text-[8px] text-slate-500 font-bold leading-none">+{dayEvents.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* DESKTOP: event previews (not individually clickable) */}
                  <div className="hidden sm:block space-y-[3px]">
                    {dayEvents.slice(0, MAX_VISIBLE).map((ev) => {
                      const time = !ev.allDay ? format(ev.start, 'HH:mm') : null;
                      const photoUrls = (ev.metadata?.photoUrls as string[] | undefined) || [];
                      const hasPhotos = photoUrls.length > 0;
                      const visiblePhotos = photoUrls.slice(0, 3);
                      const extraPhotos = photoUrls.length - visiblePhotos.length;
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            'w-full rounded-md px-1.5 py-[3px] text-[10px] leading-tight text-left',
                            'border-l-[3px] bg-white/80',
                            ev.source === 'task' && 'border-l-blue-500',
                            ev.source === 'request' && 'border-l-purple-500',
                            ev.source === 'event' && 'border-l-emerald-500',
                            ev.source === 'scheduling' && 'border-l-amber-500',
                          )}
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            {time && <span className="font-bold text-slate-600 flex-shrink-0">{time}</span>}
                            <span className="truncate text-slate-700 font-medium flex-1 min-w-0">{ev.title}</span>
                            {hasPhotos && (
                              <div className="flex items-center -space-x-1.5 flex-shrink-0 pl-0.5">
                                {visiblePhotos.map((url, i) => (
                                  <span
                                    key={url}
                                    className="inline-block h-3.5 w-3.5 rounded-full ring-[1.5px] ring-white bg-slate-200 overflow-hidden shadow-[0_0_0_0.5px_rgba(0,0,0,0.06)]"
                                    style={{ zIndex: 10 - i }}
                                  >
                                    <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                                  </span>
                                ))}
                                {extraPhotos > 0 && (
                                  <span
                                    className="inline-flex items-center justify-center h-3.5 min-w-3.5 px-[3px] rounded-full ring-[1.5px] ring-white bg-slate-700 text-white text-[7px] font-bold leading-none"
                                    style={{ zIndex: 1 }}
                                  >
                                    +{extraPhotos}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {extraCount > 0 && (
                      <div className="text-[10px] text-primary font-semibold pl-1.5">
                        +{extraCount} mas
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
