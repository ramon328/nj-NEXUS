import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, User, Tag, FileText, ExternalLink, Trash2, AlertTriangle, Pencil, Car, Loader2, ChevronLeft, ChevronRight, X as XIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { UnifiedCalendarEvent } from '@/types/calendarEvent';
import { SOURCE_COLORS, EVENT_TYPE_CONFIG } from './calendarConstants';
import type { CalendarEventType } from '@/types/calendarEvent';
import { useLocation } from 'wouter';

type AdminStatus = 'pending' | 'confirmed' | 'canceled';

interface CalendarEventDetailDrawerProps {
  event: UnifiedCalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (eventId: string) => Promise<{ error: string | null }>;
  onEdit?: (eventId: string) => void;
  // Appointment-specific
  onAppointmentStatusChange?: (appointmentId: number, status: AdminStatus) => Promise<void>;
  appointmentUpdating?: boolean;
  customerName?: string;
  vehicleLabel?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_progress: { label: 'En progreso', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelada', color: 'bg-red-50 text-red-700 border-red-200' },
  open: { label: 'Abierta', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  fulfilled: { label: 'Cumplida', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  expired: { label: 'Expirada', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  confirmed: { label: 'Confirmada', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  canceled: { label: 'Cancelada', color: 'bg-red-50 text-red-700 border-red-200' },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'bg-slate-50 text-slate-600' },
  medium: { label: 'Media', color: 'bg-amber-50 text-amber-700' },
  high: { label: 'Alta', color: 'bg-orange-50 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-50 text-red-700' },
};

export default function CalendarEventDetailDrawer({
  event, open, onOpenChange, onDelete, onEdit,
  onAppointmentStatusChange, appointmentUpdating, customerName, vehicleLabel,
}: CalendarEventDetailDrawerProps) {
  const [, navigate] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const photoUrls = (event?.metadata?.photoUrls as string[] | undefined) || [];

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i! - 1 + photoUrls.length) % photoUrls.length);
      else if (e.key === 'ArrowRight') setLightboxIndex((i) => (i! + 1) % photoUrls.length);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIndex, photoUrls.length]);

  if (!event) return null;

  const sourceColors = SOURCE_COLORS[event.source];
  const isManualEvent = event.source === 'event';
  const isAppointment = event.source === 'scheduling';
  const eventType = event.metadata?.eventType as CalendarEventType | undefined;
  const typeConfig = eventType ? EVENT_TYPE_CONFIG[eventType] : null;
  const assignedUser = event.metadata?.assignedUser as { id: number; first_name: string; last_name: string } | null;
  const priority = event.metadata?.priority as string | undefined;
  const statusInfo = event.status ? STATUS_LABELS[event.status] : null;
  const priorityInfo = priority ? PRIORITY_LABELS[priority] : null;

  const formatDate = (d: Date) => {
    const l = format(d, "EEEE d 'de' MMMM, yyyy", { locale: es });
    return l.charAt(0).toUpperCase() + l.slice(1);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (!onDelete || !isManualEvent) return;
    const realId = String(event.metadata?.eventId || event.id.replace('event-', ''));
    const result = await onDelete(realId);
    if (!result?.error) {
      setConfirmDelete(false);
      onOpenChange(false);
    } else {
      // Keep drawer open so the user can see the item is still present and try again
      setConfirmDelete(false);
    }
  };

  const handleNavigate = () => {
    if (event.url && event.url !== '/calendario') {
      navigate(event.url);
      onOpenChange(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setConfirmDelete(false); }} direction="right">
      <DrawerContentRight className="md:min-w-[480px]">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 shrink-0">
            {/* Source + type badges */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <Badge className={cn('text-[10px] font-semibold border', sourceColors.bg, sourceColors.text, sourceColors.border)}>
                <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', sourceColors.dot)} />
                {sourceColors.label}
              </Badge>
              {typeConfig && (
                <Badge className={cn('text-[10px] font-semibold border', typeConfig.color)}>
                  {typeConfig.label}
                </Badge>
              )}
              {statusInfo && (
                <Badge className={cn('text-[10px] font-semibold border', statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
              )}
              {priorityInfo && (
                <Badge className={cn('text-[10px] font-semibold', priorityInfo.color)}>
                  {priorityInfo.label}
                </Badge>
              )}
            </div>

            <DrawerTitle className="text-[16px] font-semibold text-slate-900 leading-tight">{event.title}</DrawerTitle>
            <DrawerDescription className="sr-only">Detalle del evento</DrawerDescription>

            {/* Date line */}
            <p className="text-[13px] text-slate-500 mt-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(event.start)}
              {!event.allDay && (
                <span className="font-medium text-slate-700">
                  · {format(event.start, 'HH:mm')}
                  {event.end && ` - ${format(event.end, 'HH:mm')}`}
                </span>
              )}
              {event.allDay && <span className="text-slate-400">· Todo el dia</span>}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
            <div className="space-y-4">
              {/* Photos */}
              {photoUrls.length > 0 && (
                <div className="space-y-2">
                  {photoUrls.length === 1 ? (
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(0)}
                      className="block w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/60 shadow-sm group"
                    >
                      <img
                        src={photoUrls[0]}
                        alt=""
                        className="w-full max-h-72 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </button>
                  ) : (
                    <div className={cn(
                      'grid gap-1.5 rounded-2xl overflow-hidden',
                      photoUrls.length === 2 && 'grid-cols-2',
                      photoUrls.length === 3 && 'grid-cols-2 grid-rows-2',
                      photoUrls.length >= 4 && 'grid-cols-2 grid-rows-2',
                    )}>
                      {photoUrls.slice(0, 4).map((url, i) => {
                        const isFirstOfThree = photoUrls.length === 3 && i === 0;
                        const showOverlay = photoUrls.length > 4 && i === 3;
                        return (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setLightboxIndex(i)}
                            className={cn(
                              'relative bg-slate-100 overflow-hidden group',
                              isFirstOfThree && 'row-span-2',
                              photoUrls.length === 1 ? 'aspect-video' : 'aspect-square',
                            )}
                          >
                            <img
                              src={url}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                            />
                            {showOverlay && (
                              <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center text-white text-[18px] font-bold">
                                +{photoUrls.length - 4}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="bg-slate-50 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Descripcion</span>
                  </div>
                  <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
                </div>
              )}

              {/* Info grid */}
              <div className="space-y-2">
                {(event.metadata?.location as string) && (
                  <div className="flex items-center gap-3 px-1 py-2 border-b border-slate-50">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Ubicacion</p>
                      <p className="text-[13px] text-slate-800 font-medium">{event.metadata.location as string}</p>
                    </div>
                  </div>
                )}

                {assignedUser && (
                  <div className="flex items-center gap-3 px-1 py-2 border-b border-slate-50">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Asignado a</p>
                      <p className="text-[13px] text-slate-800 font-medium">{`${assignedUser.first_name} ${assignedUser.last_name}`.trim()}</p>
                    </div>
                  </div>
                )}

                {event.source === 'task' && event.metadata?.category && (
                  <div className="flex items-center gap-3 px-1 py-2 border-b border-slate-50">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Tag className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Categoria</p>
                      <p className="text-[13px] text-slate-800 font-medium capitalize">{event.metadata.category as string}</p>
                    </div>
                  </div>
                )}

                {event.end && (
                  <div className="flex items-center gap-3 px-1 py-2 border-b border-slate-50">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">{event.allDay ? 'Fecha fin' : 'Hora fin'}</p>
                      <p className="text-[13px] text-slate-800 font-medium">
                        {event.allDay ? formatDate(event.end) : format(event.end, 'HH:mm')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Appointment-specific: customer & vehicle */}
                {isAppointment && customerName && (
                  <div className="flex items-center gap-3 px-1 py-2 border-b border-slate-50">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Cliente</p>
                      <p className="text-[13px] text-slate-800 font-medium">{customerName}</p>
                    </div>
                  </div>
                )}
                {isAppointment && vehicleLabel && (
                  <div className="flex items-center gap-3 px-1 py-2 border-b border-slate-50">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Car className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">Vehículo</p>
                      <p className="text-[13px] text-slate-800 font-medium">{vehicleLabel}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Appointment status management */}
              {isAppointment && onAppointmentStatusChange && (
                <div className="bg-slate-50 rounded-xl p-3.5">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Estado de la cita</p>
                  <div className="flex items-center gap-2">
                    <Select
                      value={event.status || 'pending'}
                      onValueChange={(val: AdminStatus) => {
                        const apptId = event.metadata?.appointmentId as number;
                        if (apptId) onAppointmentStatusChange(apptId, val);
                      }}
                      disabled={appointmentUpdating}
                    >
                      <SelectTrigger className={cn(
                        'w-full h-9 rounded-xl text-[13px] font-medium capitalize',
                        event.status === 'confirmed' && 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
                        event.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-200/60',
                        event.status === 'canceled' && 'bg-rose-50 text-rose-700 border-rose-200/60',
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending" className="capitalize text-[13px]">Pendiente</SelectItem>
                        <SelectItem value="confirmed" className="capitalize text-[13px]">Confirmada</SelectItem>
                        <SelectItem value="canceled" className="capitalize text-[13px]">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                    {appointmentUpdating && <Loader2 className="h-4 w-4 animate-spin text-slate-400 shrink-0" />}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0 flex gap-2">
            {isManualEvent && onEdit && (
              <Button
                variant="outline"
                onClick={() => {
                  const realId = String(event.metadata?.eventId || event.id.replace('event-', ''));
                  onEdit(realId);
                  onOpenChange(false);
                }}
                className="flex-1 rounded-xl gap-1.5 text-[13px]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Button>
            )}
            {event.url && event.url !== '/calendario' && (
              <Button variant="outline" onClick={handleNavigate} className="flex-1 rounded-xl gap-1.5 text-[13px]">
                <ExternalLink className="h-3.5 w-3.5" />
                Ver en {sourceColors.label}
              </Button>
            )}
            {isManualEvent && onDelete && (
              <Button
                variant="outline"
                onClick={handleDelete}
                className={cn(
                  'rounded-xl gap-1.5 text-[13px] transition-all',
                  confirmDelete
                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:text-white'
                    : 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200',
                )}
              >
                {confirmDelete ? <AlertTriangle className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                {confirmDelete ? 'Confirmar' : 'Eliminar'}
              </Button>
            )}
          </div>
        </div>

        {/* Lightbox (rendered in a portal to escape the drawer's transform context) */}
        {lightboxIndex !== null && photoUrls[lightboxIndex] && createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
              className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Cerrar"
            >
              <XIcon className="h-5 w-5" />
            </button>
            {photoUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! - 1 + photoUrls.length) % photoUrls.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i! + 1) % photoUrls.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
                  aria-label="Siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-white/15 text-white text-[12px] font-medium backdrop-blur-sm">
                  {lightboxIndex + 1} / {photoUrls.length}
                </span>
              </>
            )}
            <img
              src={photoUrls[lightboxIndex]}
              alt=""
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
            />
          </div>,
          document.body
        )}
      </DrawerContentRight>
    </Drawer>
  );
}
