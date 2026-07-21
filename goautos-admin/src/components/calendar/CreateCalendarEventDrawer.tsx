import { useState, useEffect, useRef } from 'react';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, MapPin, Users, AlignLeft, Clock, Tag, Check, ImagePlus, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarEventType, CreateCalendarEventData, CalendarEvent } from '@/types/calendarEvent';
import { EVENT_TYPE_CONFIG } from './calendarConstants';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { uploadImage, deleteImageByUrl } from '@/utils/fileUploadUtils';

interface CreateCalendarEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCalendarEventData) => Promise<{ error: string | null }>;
  defaultDate?: Date;
  editEvent?: CalendarEvent | null;
}

export default function CreateCalendarEventDrawer({ open, onOpenChange, onSubmit, defaultDate, editEvent }: CreateCalendarEventDrawerProps) {
  const { clientId } = useAuth();
  const isEditing = !!editEvent;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<CalendarEventType>('meeting');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: number; name: string }[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!clientId) return;
    supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('client_id', clientId)
      .then(({ data }) => {
        if (data) setTeamMembers(data.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`.trim() })));
      });
  }, [clientId]);

  useEffect(() => {
    if (open) {
      if (editEvent) {
        setTitle(editEvent.title);
        setDescription(editEvent.description || '');
        setEventType(editEvent.event_type);
        setAllDay(editEvent.all_day);
        setLocation(editEvent.location || '');
        setAssignedTo(editEvent.assigned_to_user_id ? String(editEvent.assigned_to_user_id) : '');
        setStartAt(format(new Date(editEvent.start_at), "yyyy-MM-dd'T'HH:mm"));
        setEndAt(editEvent.end_at ? format(new Date(editEvent.end_at), "yyyy-MM-dd'T'HH:mm") : '');
        setPhotoUrls(editEvent.photo_urls || []);
      } else {
        setTitle('');
        setDescription('');
        setEventType('meeting');
        setAllDay(false);
        setLocation('');
        setAssignedTo('');
        setEndAt('');
        setPhotoUrls([]);
        if (defaultDate) {
          setStartAt(format(defaultDate, "yyyy-MM-dd'T'HH:mm"));
        } else {
          setStartAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        }
      }
    }
  }, [open, defaultDate, editEvent]);

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    const uploads = await Promise.all(
      Array.from(files).map((file) => uploadImage(file, 'calendar-events'))
    );
    const urls = uploads.filter((u): u is string => !!u);
    setPhotoUrls((prev) => [...prev, ...urls]);
    setUploadingPhotos(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = async (url: string) => {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
    // Fire-and-forget storage cleanup
    deleteImageByUrl(url).catch(() => {});
  };

  const handleSubmit = async () => {
    if (!title.trim() || !startAt) return;
    setSaving(true);
    const data: CreateCalendarEventData = {
      title: title.trim(),
      description: description.trim() || undefined,
      event_type: eventType,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : undefined,
      all_day: allDay,
      location: location.trim() || undefined,
      assigned_to_user_id: assignedTo && assignedTo !== 'none' ? Number(assignedTo) : undefined,
      photo_urls: photoUrls,
    };
    const result = await onSubmit(data);
    setSaving(false);
    if (!result.error) onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right" dismissible={false}>
      <DrawerContentRight className="md:min-w-[480px]">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 shrink-0">
            <DrawerTitle className="text-[16px] font-semibold text-slate-900">
              {isEditing ? 'Editar Evento' : 'Nuevo Evento'}
            </DrawerTitle>
            <DrawerDescription className="sr-only">{isEditing ? 'Formulario para editar evento' : 'Formulario para crear un nuevo evento en el calendario'}</DrawerDescription>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
            <div className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[13px] text-slate-700 font-medium">
                  Titulo <span className="text-red-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titulo del evento"
                  autoFocus
                />
              </div>

              {/* Event type chips */}
              <div className="space-y-1.5">
                <label className="text-[13px] text-slate-700 font-medium">Tipo</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(EVENT_TYPE_CONFIG) as [CalendarEventType, typeof EVENT_TYPE_CONFIG[CalendarEventType]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setEventType(key as CalendarEventType)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all',
                        eventType === key
                          ? `${cfg.color} border-current shadow-sm`
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full', cfg.dotColor)} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100" />

              {/* All day toggle + Date/Time */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] text-slate-700 font-medium">Fecha y hora</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[12px] text-slate-500">Todo el dia</span>
                    <Switch checked={allDay} onCheckedChange={setAllDay} className="scale-90" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3" data-vaul-no-drag>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-slate-500">Inicio <span className="text-red-500">*</span></Label>
                    <Input
                      type={allDay ? 'date' : 'datetime-local'}
                      value={allDay ? startAt.split('T')[0] : startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      onFocus={(e) => e.target.showPicker?.()}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-slate-500">Fin (opcional)</Label>
                    <Input
                      type={allDay ? 'date' : 'datetime-local'}
                      value={allDay ? endAt.split('T')[0] : endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      onFocus={(e) => e.target.showPicker?.()}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100" />

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-[13px] text-slate-700 font-medium">Ubicacion</label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Oficina, zoom, direccion..."
                />
              </div>

              {/* Assigned to */}
              <div className="space-y-1.5">
                <label className="text-[13px] text-slate-700 font-medium">Asignar a</label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[13px] text-slate-700 font-medium">Notas</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles adicionales..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Photo attachments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] text-slate-700 font-medium">Fotos adjuntas</label>
                  {photoUrls.length > 0 && (
                    <span className="text-[11px] text-slate-400 font-medium">{photoUrls.length} foto{photoUrls.length !== 1 && 's'}</span>
                  )}
                </div>

                {photoUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photoUrls.map((url) => (
                      <div
                        key={url}
                        className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm"
                      >
                        <img src={url} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(url)}
                          className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          aria-label="Quitar foto"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhotos}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/40 transition-all py-4 text-[12px] font-medium text-slate-500 hover:text-primary',
                    uploadingPhotos && 'opacity-60 cursor-wait',
                  )}
                >
                  {uploadingPhotos ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subiendo fotos...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4" />
                      {photoUrls.length > 0 ? 'Agregar mas fotos' : 'Adjuntar fotos'}
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || !title.trim() || !startAt}
                className="gap-2 rounded-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-[13px]">Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="text-[13px]">{isEditing ? 'Guardar Cambios' : 'Crear Evento'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DrawerContentRight>
    </Drawer>
  );
}
