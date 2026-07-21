import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Vehicle } from '@/types/vehicle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Instagram,
  Loader2,
  Check,
  Plus,
  ImageOff,
  CalendarClock,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import ReactCrop, { Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import posthog from '@/utils/posthog';
import { processToInstagramRatio, IG_RATIOS, nearestIGRatioKey } from '@/utils/instagramImage';
import { uploadImage } from '@/utils/fileUploadUtils';
import { INSTAGRAM_APP_ID } from '@/config/env';

interface CreateInstagramPostDrawerProps {
  vehicle: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const IG_MAX = 10;

type IGItem = { id: string; previewSrc: string; source: string | File };
type PostMode = 'now' | 'schedule';
type ScheduledRow = {
  id: string;
  scheduled_at: string;
  status: string;
  error_message: string | null;
};

// Recorte centrado (90% de ancho) para un aspect dado — punto de partida editable.
const makeCenteredCrop = (imgW: number, imgH: number, aspect: number): Crop =>
  centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, imgW, imgH), imgW, imgH);

// Formatea una fecha como valor de <input type="datetime-local"> (hora local).
const toLocalDatetimeInput = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const statusLabel = (s: string) =>
  s === 'pending'
    ? 'Programada'
    : s === 'processing'
    ? 'Publicando…'
    : s === 'failed'
    ? 'Falló'
    : s;

const statusBadgeClass = (s: string) =>
  s === 'pending'
    ? 'bg-amber-100 text-amber-700'
    : s === 'processing'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-red-100 text-red-700';

// Miniatura reordenable (drag) del orden de publicación del carrusel.
function SortableThumb({
  id,
  src,
  index,
  disabled,
}: {
  id: string;
  src: string;
  index: number;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className='relative h-14 w-14 shrink-0 touch-none cursor-grab overflow-hidden rounded-lg border-2 border-pink-300 active:cursor-grabbing'
    >
      <img src={src} alt='' className='h-full w-full object-cover object-center' />
      <span className='absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink-500 text-[9px] font-bold text-white'>
        {index + 1}
      </span>
      {index === 0 && (
        <span className='absolute inset-x-0 bottom-0 bg-black/60 text-center text-[8px] font-medium text-white'>
          Portada
        </span>
      )}
    </div>
  );
}

export function CreateInstagramPostDrawer({
  vehicle,
  open,
  onOpenChange,
}: CreateInstagramPostDrawerProps) {
  const { clientId } = useAuth();
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const initialDescription = `🚗 ${vehicle.brand?.name} ${
    vehicle.model?.name
  } ${vehicle.version_name || ''} ${vehicle.year} ${vehicle.description}
🔥 Solo ${vehicle.mileage?.toLocaleString()} km

#autos #vehiculos #${vehicle.brand?.name?.toLowerCase()} ${
    vehicle.model?.name ? '#' + vehicle.model.name.toLowerCase() : ''
  }`;

  // Imágenes del vehículo (main + galería). Pre-seleccionadas por defecto.
  const vehicleItems: IGItem[] = useMemo(() => {
    const urls = [vehicle.main_image, ...(vehicle.gallery || [])].filter(Boolean) as string[];
    return urls.map((url, i) => ({ id: `v-${i}`, previewSrc: url, source: url }));
  }, [vehicle.main_image, vehicle.gallery]);

  const [items, setItems] = useState<IGItem[]>(vehicleItems);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    vehicleItems.slice(0, IG_MAX).map((it) => it.id)
  );
  const [description, setDescription] = useState(initialDescription);
  const [isPosting, setIsPosting] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Formato + recorte por foto.
  const [ratioKey, setRatioKey] = useState<string>('4:5');
  const ratio = IG_RATIOS.find((r) => r.key === ratioKey) ?? IG_RATIOS[0];
  const [crops, setCrops] = useState<Record<string, Crop>>({});
  const [focusedIndex, setFocusedIndex] = useState(0);
  // Cómo encaja la foto en el formato: 'cover' (recorta para llenar) o
  // 'contain' (foto completa, con fondo blanco — para autos apaisados).
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  // Si el usuario eligió el formato a mano, dejamos de auto-detectarlo de la portada.
  const [formatTouched, setFormatTouched] = useState(false);

  // Programación.
  const [mode, setMode] = useState<PostMode>('now');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [scheduled, setScheduled] = useState<ScheduledRow[]>([]);

  const minScheduled = toLocalDatetimeInput(new Date(Date.now() + 5 * 60 * 1000));

  const loadScheduled = React.useCallback(async () => {
    if (!vehicle?.id) return;
    const { data } = await supabase
      .from('instagram_scheduled_posts')
      .select('id, scheduled_at, status, error_message')
      .eq('vehicle_id', vehicle.id)
      .in('status', ['pending', 'processing', 'failed'])
      .order('scheduled_at', { ascending: true });
    setScheduled((data as ScheduledRow[]) || []);
  }, [vehicle?.id]);

  // Re-inicializa al abrir con otro vehículo.
  React.useEffect(() => {
    if (open) {
      setItems(vehicleItems);
      setSelectedIds(vehicleItems.slice(0, IG_MAX).map((it) => it.id));
      setDescription(initialDescription);
      setError(null);
      setMode('now');
      setScheduledAt('');
      setRatioKey('4:5');
      setCrops({});
      setFocusedIndex(0);
      setFit('cover');
      setFormatTouched(false);
      void loadScheduled();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle.id]);

  const selectedItems = selectedIds
    .map((id) => items.find((it) => it.id === id))
    .filter(Boolean) as IGItem[];

  const focusIdx = selectedItems.length
    ? Math.min(focusedIndex, selectedItems.length - 1)
    : 0;
  const focusedItem = selectedItems[focusIdx];

  // Como Instagram: el formato lo define la PRIMERA foto (la portada). Se
  // auto-detecta el ratio más cercano y se aplica a TODAS, salvo que el usuario
  // lo elija a mano. Al reordenar (cambia la portada) se vuelve a auto-detectar.
  const coverSrc = selectedItems[0]?.previewSrc;
  React.useEffect(() => {
    if (formatTouched || !coverSrc) return;
    let cancelled = false;
    const probe = new Image();
    probe.onload = () => {
      if (!cancelled && probe.naturalWidth && probe.naturalHeight) {
        setRatioKey(nearestIGRatioKey(probe.naturalWidth / probe.naturalHeight));
      }
    };
    probe.src = coverSrc;
    return () => {
      cancelled = true;
    };
  }, [coverSrc, formatTouched]);

  // El token de IG expira seguido. Si el error del backend habla de token/sesión
  // expirada, ofrecemos reconectar sin salir del drawer (mismo OAuth que Config).
  const isTokenError =
    !!error && /token|expir|reconect|sesi[oó]n|oauth|autoriz/i.test(error);

  const handleReconnectInstagram = () => {
    const redirectUri = 'https://portal.goauto.cl/instagram';
    const scopes = [
      'instagram_business_basic',
      'instagram_business_content_publish',
    ].join('%2C');
    const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scopes}`;
    window.location.href = authUrl;
  };

  // Reorden del carrusel (drag).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const handleReorder = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectedIds((ids) => {
        const oldIndex = ids.indexOf(active.id as string);
        const newIndex = ids.indexOf(over.id as string);
        if (oldIndex < 0 || newIndex < 0) return ids;
        return arrayMove(ids, oldIndex, newIndex);
      });
    }
  };

  // Al cambiar el formato, los recortes anteriores ya no sirven (otro aspect):
  // se reinician y se recalcula el de la foto enfocada (las demás se centran al
  // enfocarse o, si no, al exportar con cover centrado).
  React.useEffect(() => {
    const img = imgRef.current;
    if (focusedItem && img && img.complete && img.width && img.height) {
      setCrops({ [focusedItem.id]: makeCenteredCrop(img.width, img.height, ratio.aspect) });
    } else {
      setCrops({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratioKey]);

  const onEditorImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    if (focusedItem && !crops[focusedItem.id] && width && height) {
      setCrops((prev) => ({
        ...prev,
        [focusedItem.id]: makeCenteredCrop(width, height, ratio.aspect),
      }));
    }
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= IG_MAX) {
        toast({
          title: 'Máximo 10 fotos',
          description: 'Instagram permite hasta 10 fotos por publicación.',
          variant: 'destructive',
        });
        return prev;
      }
      return [...prev, id];
    });
  };

  const onAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newItems: IGItem[] = files.map((file, i) => ({
      id: `u-${Date.now()}-${i}`,
      previewSrc: URL.createObjectURL(file),
      source: file,
    }));
    setItems((prev) => [...prev, ...newItems]);
    setSelectedIds((prev) => {
      const room = Math.max(0, IG_MAX - prev.length);
      return [...prev, ...newItems.slice(0, room).map((it) => it.id)];
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Procesa cada foto seleccionada al formato elegido respetando su recorte (o
  // cover centrado si no se ajustó) y la sube. Devuelve las URLs ya optimizadas.
  const prepareImageUrls = async (): Promise<string[]> => {
    const imageUrls: string[] = [];
    for (let i = 0; i < selectedItems.length; i++) {
      setProgress(`Procesando foto ${i + 1} de ${selectedItems.length}...`);
      const it = selectedItems[i];
      const file = await processToInstagramRatio(
        it.source,
        ratio.w,
        ratio.h,
        fit === 'contain' ? null : crops[it.id] ?? null,
        i,
        fit
      );
      const url = await uploadImage(file, 'instagram');
      if (url) imageUrls.push(url);
    }
    return imageUrls;
  };

  const handlePost = async () => {
    if (!clientId) {
      toast({ title: t('actions.error'), description: t('instagram.createPost.errorNoClient'), variant: 'destructive' });
      return;
    }
    if (selectedItems.length === 0) {
      setError('Selecciona al menos una foto.');
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      setProgress('Procesando fotos...');
      const imageUrls = await prepareImageUrls();
      if (imageUrls.length === 0) throw new Error('No se pudieron preparar las fotos.');

      setProgress('Publicando en Instagram...');
      const { data, error } = await supabase.functions.invoke('create-instagram-post', {
        body: { vehicle, description, clientId, imageUrls },
      });

      if (error) {
        let errorMessage = t('instagram.createPost.errorGeneric');
        try {
          const errorBody = await (error as any).context?.json?.();
          if (errorBody?.error) errorMessage = errorBody.error;
        } catch {
          /* fallback */
        }
        throw new Error(errorMessage);
      }
      if (data.error) throw new Error(data.error);

      if (data.postId) vehicle.instagram_post_id = data.postId;

      posthog.capture({
        distinctId: String(clientId),
        event: 'instagram_vehicle_published',
        properties: { vehicle_id: vehicle.id, photos: imageUrls.length, ratio: ratio.key },
      });

      toast({ title: t('instagram.createPost.successTitle'), description: t('instagram.createPost.successDesc') });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error posting to Instagram:', error);
      const msg = error.message || t('instagram.createPost.errorPublish');
      setError(msg);
      toast({
        title: t('actions.error'),
        description: msg.length > 100 ? t('instagram.createPost.errorPublishShort') : msg,
        variant: 'destructive',
      });
    } finally {
      setIsPosting(false);
      setProgress('');
    }
  };

  const handleSchedule = async () => {
    if (!clientId) {
      toast({ title: t('actions.error'), description: t('instagram.createPost.errorNoClient'), variant: 'destructive' });
      return;
    }
    if (selectedItems.length === 0) {
      setError('Selecciona al menos una foto.');
      return;
    }
    if (!scheduledAt) {
      setError('Elige una fecha y hora.');
      return;
    }
    const when = new Date(scheduledAt);
    if (isNaN(when.getTime()) || when.getTime() <= Date.now() + 60 * 1000) {
      setError('La fecha y hora deben ser futuras.');
      return;
    }

    setIsPosting(true);
    setError(null);

    try {
      setProgress('Procesando fotos...');
      const imageUrls = await prepareImageUrls();
      if (imageUrls.length === 0) throw new Error('No se pudieron preparar las fotos.');

      setProgress('Programando...');
      const { error } = await supabase.from('instagram_scheduled_posts').insert({
        client_id: clientId,
        vehicle_id: vehicle.id,
        image_urls: imageUrls,
        description,
        scheduled_at: when.toISOString(),
        status: 'pending',
      });
      if (error) throw error;

      posthog.capture({
        distinctId: String(clientId),
        event: 'instagram_vehicle_scheduled',
        properties: { vehicle_id: vehicle.id, photos: imageUrls.length, ratio: ratio.key, scheduled_at: when.toISOString() },
      });

      toast({
        title: 'Publicación programada',
        description: `Se publicará el ${when.toLocaleString('es-CL', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}.`,
      });
      setScheduledAt('');
      setMode('now');
      await loadScheduled();
    } catch (error: any) {
      console.error('Error scheduling Instagram post:', error);
      const msg = error.message || 'No se pudo programar la publicación.';
      setError(msg);
      toast({ title: t('actions.error'), description: msg, variant: 'destructive' });
    } finally {
      setIsPosting(false);
      setProgress('');
    }
  };

  const cancelScheduled = async (id: string) => {
    const { error } = await supabase.from('instagram_scheduled_posts').delete().eq('id', id);
    if (error) {
      toast({ title: 'No se pudo cancelar', variant: 'destructive' });
      return;
    }
    toast({ title: 'Programación cancelada' });
    await loadScheduled();
  };

  const isSchedule = mode === 'schedule';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Modal flex-column: header y footer fijos, solo el cuerpo scrollea.
          Ancho con margen en móvil y tope creciente hasta 2 columnas en grande. */}
      <DialogContent className='flex max-h-[90vh] w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:w-full sm:max-w-2xl lg:max-w-4xl'>
        <DialogHeader className='shrink-0 space-y-1 border-b px-5 py-4 pr-12 text-left'>
          <DialogTitle className='flex items-center gap-2'>
            <Instagram className='w-5 h-5' />
            Crear publicación en Instagram
          </DialogTitle>
          <DialogDescription>
            Elige las fotos, el formato y el recorte. El recuadro muestra
            exactamente cómo se va a publicar.
          </DialogDescription>
        </DialogHeader>

        {/* Cuerpo scrolleable */}
        <div className='min-h-0 flex-1 overflow-y-auto px-5 py-4'>
          <div className='space-y-4'>
            {error && (
              <Alert variant='destructive'>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription className='space-y-2'>
                  <p>{error}</p>
                  {isTokenError && (
                    <Button
                      type='button'
                      size='sm'
                      onClick={handleReconnectInstagram}
                      className='bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                    >
                      <Instagram className='mr-2 h-4 w-4' />
                      Reconectar Instagram
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Publicaciones ya programadas para este vehículo */}
            {scheduled.length > 0 && (
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Programadas</label>
                <div className='space-y-1.5'>
                  {scheduled.map((s) => (
                    <div
                      key={s.id}
                      className='flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs'
                    >
                      <div className='flex min-w-0 items-center gap-2'>
                        <Clock className='h-3.5 w-3.5 shrink-0 text-slate-400' />
                        <span className='truncate'>
                          {new Date(s.scheduled_at).toLocaleString('es-CL', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeClass(
                            s.status
                          )}`}
                        >
                          {statusLabel(s.status)}
                        </span>
                      </div>
                      {s.status === 'pending' && (
                        <button
                          type='button'
                          onClick={() => cancelScheduled(s.id)}
                          className='shrink-0 text-slate-400 hover:text-red-500'
                          title='Cancelar'
                        >
                          <X className='h-4 w-4' />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2 columnas en pantallas grandes; 1 sola en móvil/tablet */}
            <div className='grid grid-cols-1 gap-5 lg:grid-cols-2'>
              {/* Columna izquierda: formato + recorte (lo visual) */}
              <div className='space-y-4'>
                {/* Formato (aspect ratio) */}
                <div>
                  <label className='mb-2 block text-sm font-medium'>Formato</label>
                  <div className='flex gap-2'>
                    {IG_RATIOS.map((r) => {
                      const name = r.label.split(' ')[0];
                      const active = ratioKey === r.key;
                      return (
                        <button
                          key={r.key}
                          type='button'
                          onClick={() => {
                            setRatioKey(r.key);
                            setFormatTouched(true);
                          }}
                          disabled={isPosting}
                          className={`flex-1 rounded-lg border px-2 py-1.5 text-center transition-colors disabled:opacity-50 ${
                            active
                              ? 'border-pink-500 bg-pink-50 text-pink-700'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className='block text-xs font-medium leading-tight'>{name}</span>
                          <span className='block text-[10px] leading-tight opacity-70'>{r.key}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ajuste: recortar (cover) o foto completa (contain) */}
                <div>
                  <label className='mb-2 block text-sm font-medium'>Ajuste</label>
                  <div className='flex gap-2'>
                    {(
                      [
                        { key: 'cover', label: 'Recortar' },
                        { key: 'contain', label: 'Foto completa' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        type='button'
                        onClick={() => setFit(opt.key)}
                        disabled={isPosting}
                        className={`flex-1 rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors disabled:opacity-50 ${
                          fit === opt.key
                            ? 'border-pink-500 bg-pink-50 text-pink-700'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editor de recorte (cómo se va a subir) */}
                <div>
                  <div className='mb-2 flex items-center justify-between'>
                    <label className='text-sm font-medium'>Vista previa</label>
                    {selectedItems.length > 1 && (
                      <div className='flex items-center gap-1 text-xs text-slate-500'>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-6 w-6 p-0'
                          disabled={isPosting}
                          onClick={() =>
                            setFocusedIndex(
                              (i) => (focusIdx - 1 + selectedItems.length) % selectedItems.length
                            )
                          }
                        >
                          <ChevronLeft className='h-4 w-4' />
                        </Button>
                        <span className='tabular-nums'>
                          {focusIdx + 1}/{selectedItems.length}
                        </span>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-6 w-6 p-0'
                          disabled={isPosting}
                          onClick={() =>
                            setFocusedIndex((i) => (focusIdx + 1) % selectedItems.length)
                          }
                        >
                          <ChevronRight className='h-4 w-4' />
                        </Button>
                      </div>
                    )}
                  </div>

                  {selectedItems.length === 0 || !focusedItem ? (
                    <div className='mx-auto flex aspect-[4/5] w-full max-w-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-slate-400'>
                      <ImageOff className='h-6 w-6' />
                      <span className='text-xs'>Selecciona fotos abajo</span>
                    </div>
                  ) : fit === 'contain' ? (
                    // Foto completa: la imagen entera dentro del marco del formato, con fondo blanco
                    // (exactamente lo que se sube). Sin recorte.
                    <div
                      className='mx-auto flex items-center justify-center overflow-hidden rounded-xl border bg-white'
                      style={{ aspectRatio: `${ratio.w} / ${ratio.h}`, maxHeight: '44vh', maxWidth: '100%' }}
                    >
                      <img
                        src={focusedItem.previewSrc}
                        alt=''
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  ) : (
                    <div className='flex justify-center rounded-xl border bg-slate-100 p-1'>
                      <ReactCrop
                        crop={crops[focusedItem.id]}
                        onChange={(_, percentCrop) =>
                          setCrops((prev) => ({ ...prev, [focusedItem.id]: percentCrop }))
                        }
                        aspect={ratio.aspect}
                        keepSelection
                        minWidth={20}
                        disabled={isPosting}
                        className='max-h-[44vh]'
                      >
                        <img
                          ref={imgRef}
                          src={focusedItem.previewSrc}
                          onLoad={onEditorImageLoad}
                          alt=''
                          style={{ maxHeight: '44vh', maxWidth: '100%', display: 'block' }}
                        />
                      </ReactCrop>
                    </div>
                  )}
                  <p className='mt-2 text-[11px] text-slate-400'>
                    {fit === 'contain'
                      ? `Se sube la foto completa en ${ratio.label} (${ratio.w}×${ratio.h}), con fondo blanco — no se recorta nada.`
                      : `Arrastra el recuadro para elegir qué parte se publica. Se sube en ${ratio.label} (${ratio.w}×${ratio.h}); cada foto se recorta por separado.`}
                  </p>
                </div>
              </div>

              {/* Columna derecha: selección + descripción + cuándo publicar */}
              <div className='space-y-4'>
                {/* Orden de publicación (reordenable) — la 1ª es la portada */}
                {selectedItems.length > 1 && (
                  <div>
                    <label className='mb-2 block text-sm font-medium'>Orden de publicación</label>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleReorder}
                    >
                      <SortableContext
                        items={selectedItems.map((it) => it.id)}
                        strategy={horizontalListSortingStrategy}
                      >
                        <div className='flex gap-2 overflow-x-auto pb-1'>
                          {selectedItems.map((it, idx) => (
                            <SortableThumb
                              key={it.id}
                              id={it.id}
                              src={it.previewSrc}
                              index={idx}
                              disabled={isPosting}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                    <p className='mt-1 text-[11px] text-slate-400'>
                      Arrastra para reordenar. La 1ª es la portada y define el formato de todo el
                      carrusel (como Instagram).
                    </p>
                  </div>
                )}

                {/* Selección de fotos */}
                <div>
                  <div className='mb-2 flex items-center justify-between gap-2'>
                    <label className='text-sm font-medium'>
                      Fotos del vehículo{' '}
                      <span
                        className={
                          selectedItems.length >= IG_MAX
                            ? 'font-semibold text-pink-600'
                            : 'text-slate-400'
                        }
                      >
                        · {selectedItems.length}/{IG_MAX}
                      </span>
                    </label>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-7 shrink-0 text-xs'
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isPosting}
                    >
                      <Plus className='mr-1 h-3 w-3' /> Agregar
                    </Button>
                    <input
                      ref={fileInputRef}
                      type='file'
                      accept='image/*'
                      multiple
                      hidden
                      onChange={onAddFiles}
                    />
                  </div>

                  {items.length === 0 ? (
                    <Alert>
                      <AlertCircle className='h-4 w-4' />
                      <AlertDescription>{t('instagram.createPost.noImagesAlert')}</AlertDescription>
                    </Alert>
                  ) : (
                    <div className='grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-4'>
                      {items.map((it) => {
                        const order = selectedIds.indexOf(it.id);
                        const isSelected = order !== -1;
                        return (
                          <button
                            key={it.id}
                            type='button'
                            onClick={() => toggle(it.id)}
                            disabled={isPosting}
                            className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-pink-500 ring-1 ring-pink-300'
                                : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={it.previewSrc}
                              alt=''
                              className='h-full w-full object-cover object-center'
                            />
                            {isSelected ? (
                              <span className='absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[11px] font-bold text-white'>
                                {order + 1}
                              </span>
                            ) : (
                              <span className='absolute inset-0 flex items-center justify-center'>
                                <span className='h-5 w-5 rounded-full border-2 border-white/80 bg-black/20' />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className='mt-2 text-[11px] text-slate-400'>
                    Toca para incluir/quitar. El número es el orden en que se publican.
                    {selectedItems.length >= IG_MAX
                      ? ' Alcanzaste el máximo de 10.'
                      : ` Hasta 10 fotos (quedan ${IG_MAX - selectedItems.length}).`}
                  </p>
                </div>

                {/* Descripción */}
                <div className='space-y-1.5'>
                  <label className='text-sm font-medium'>{t('instagram.createPost.descriptionLabel')}</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className='h-28 resize-none'
                    placeholder={t('instagram.createPost.descriptionPlaceholder')}
                    disabled={isPosting}
                  />
                </div>

                {/* ¿Cuándo publicar? Ahora o programar */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>¿Cuándo publicar?</label>
                  <div className='grid grid-cols-2 gap-2'>
                    <Button
                      type='button'
                      variant={mode === 'now' ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setMode('now')}
                      disabled={isPosting}
                    >
                      Publicar ahora
                    </Button>
                    <Button
                      type='button'
                      variant={isSchedule ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setMode('schedule')}
                      disabled={isPosting}
                    >
                      <CalendarClock className='mr-1 h-4 w-4' /> Programar
                    </Button>
                  </div>
                  {isSchedule && (
                    <input
                      type='datetime-local'
                      value={scheduledAt}
                      min={minScheduled}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      disabled={isPosting}
                      className='w-full rounded-md border px-3 py-2 text-sm'
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fijo: el botón siempre visible sin scrollear */}
        <DialogFooter className='shrink-0 border-t px-5 py-3'>
          <Button
            type='submit'
            className='w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
            onClick={isSchedule ? handleSchedule : handlePost}
            disabled={isPosting || selectedItems.length === 0 || (isSchedule && !scheduledAt)}
          >
            {isPosting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                {progress || (isSchedule ? 'Programando…' : t('instagram.createPost.publishing'))}
              </>
            ) : isSchedule ? (
              <>
                <CalendarClock className='mr-2 h-4 w-4' />
                Programar {selectedItems.length} foto{selectedItems.length !== 1 ? 's' : ''}
              </>
            ) : (
              <>
                <Check className='mr-2 h-4 w-4' />
                Publicar {selectedItems.length} foto{selectedItems.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
