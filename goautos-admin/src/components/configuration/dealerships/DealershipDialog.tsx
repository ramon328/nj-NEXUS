import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

// Lazy load the LocationPicker component to avoid SSR issues with mapbox-gl
const LocationPicker = lazy(() => import('@/components/map/LocationPicker'));

interface DealershipFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
}

// Define the location structure
interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface DayHours {
  open?: string;
  close?: string;
  closed?: boolean;
}
type OpeningHours = Record<string, DayHours>;

// Días en inglés (claves alineadas con el builder de datos estructurados del website).
const DAYS: { key: string; label: string }[] = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

interface DealershipDialogProps {
  open: boolean;
  onClose: () => void;
  dealership?: {
    id: number;
    name: string;
    address: string;
    phone: string;
    email: string;
    location?: Location;
    opening_hours?: OpeningHours | null;
  };
  onSuccess: () => void;
}

export const DealershipDialog = ({
  open,
  onClose,
  dealership,
  onSuccess,
}: DealershipDialogProps) => {
  const { clientId } = useAuth();
  const [location, setLocation] = useState<Location | undefined>(
    dealership?.location || undefined
  );
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    dealership?.opening_hours || {}
  );

  const setDay = (key: string, patch: Partial<DayHours>) =>
    setOpeningHours((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
    watch,
  } = useForm<DealershipFormData>({
    defaultValues: {
      name: dealership?.name || '',
      address: dealership?.address || '',
      phone: dealership?.phone || '',
      email: dealership?.email || '',
    },
  });

  // Reset form and location when dialog opens or dealership changes
  useEffect(() => {
    if (open) {
      reset({
        name: dealership?.name || '',
        address: dealership?.address || '',
        phone: dealership?.phone || '',
        email: dealership?.email || '',
      });
      setLocation(dealership?.location || undefined);
      setOpeningHours(dealership?.opening_hours || {});
    }
  }, [open, dealership, reset]);

  const address = watch('address');

  const handleLocationChange = (newLocation: {
    lat: number;
    lng: number;
    address: string;
  }) => {
    setLocation(newLocation);

    // Reflejar SIEMPRE la dirección buscada/seleccionada en el campo de texto.
    // Antes solo se actualizaba si el campo estaba vacío o igual al original, así
    // que al EDITAR una sucursal la dirección buscada no se reflejaba (reportado por MAO).
    if (newLocation.address) {
      setValue('address', newLocation.address, { shouldDirty: true });
    }
  };

  const onSubmit = async (data: DealershipFormData) => {
    try {
      // Ensure we have location data
      if (!location) {
        toast({
          title: 'Error',
          description: 'Por favor selecciona una ubicación en el mapa',
          variant: 'destructive',
        });
        return;
      }

      // Create a clean object for the location that can be stored as JSON
      const locationData = {
        lat: location.lat,
        lng: location.lng,
        address: location.address || '',
      };

      // Solo persistimos días con horario válido (o marcados como cerrados).
      const cleanedHours: OpeningHours = {};
      for (const { key } of DAYS) {
        const d = openingHours[key];
        if (!d) continue;
        if (d.closed) cleanedHours[key] = { closed: true };
        else if (d.open && d.close) cleanedHours[key] = { open: d.open, close: d.close };
      }
      const openingHoursData =
        Object.keys(cleanedHours).length > 0 ? cleanedHours : null;

      if (dealership?.id) {
        const { error } = await supabase
          .from('dealerships')
          .update({
            name: data.name,
            address: data.address,
            phone: data.phone,
            email: data.email,
            location: locationData,
            opening_hours: openingHoursData,
          })
          .eq('id', dealership.id);

        if (error) throw error;
        toast({ title: 'Sucursal actualizada exitosamente' });
      } else {
        const { error } = await supabase.from('dealerships').insert({
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          location: locationData,
          opening_hours: openingHoursData,
          client_id: clientId,
        });

        if (error) throw error;
        toast({ title: 'Sucursal creada exitosamente' });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la sucursal',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-slate-800'>
            {dealership?.id ? 'Editar' : 'Crear'} sucursal
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-4'>
              <div className='space-y-1.5'>
                <Label htmlFor='name' className='text-[13px] font-medium text-slate-600'>
                  Nombre
                </Label>
                <Input
                  id='name'
                  {...register('name', {
                    required: 'El nombre es requerido',
                  })}
                  placeholder='Ej: Sucursal Principal'
                  className='h-9 rounded-xl border-slate-200/60 text-[13px]'
                />
                {errors.name && (
                  <p className='text-sm text-red-500'>
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='address' className='text-[13px] font-medium text-slate-600'>
                  Dirección
                </Label>
                <Input
                  id='address'
                  {...register('address', {
                    required: 'La dirección es requerida',
                  })}
                  className='h-9 rounded-xl border-slate-200/60 text-[13px]'
                />
                {errors.address && (
                  <p className='text-sm text-red-500'>
                    {errors.address.message}
                  </p>
                )}
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='phone' className='text-[13px] font-medium text-slate-600'>
                  Teléfono
                </Label>
                <Input
                  id='phone'
                  {...register('phone', {
                    required: 'El teléfono es requerido',
                  })}
                  className='h-9 rounded-xl border-slate-200/60 text-[13px]'
                />
                {errors.phone && (
                  <p className='text-sm text-red-500'>{errors.phone.message}</p>
                )}
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='email' className='text-[13px] font-medium text-slate-600'>
                  Email
                </Label>
                <Input
                  id='email'
                  type='email'
                  {...register('email', {
                    required: 'El email es requerido',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido',
                    },
                  })}
                  className='h-9 rounded-xl border-slate-200/60 text-[13px]'
                />
                {errors.email && (
                  <p className='text-sm text-red-500'>{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-[13px] font-medium text-slate-600'>
                Ubicación
              </Label>
              <Suspense
                fallback={
                  <div className='w-full h-[300px] rounded-xl border border-slate-200/60 flex items-center justify-center'>
                    <Loader2 className='h-8 w-8 animate-spin text-gray-400' />
                  </div>
                }
              >
                <LocationPicker
                  initialLocation={location}
                  initialAddress={address}
                  onLocationChange={handleLocationChange}
                />
              </Suspense>
              {!location && (
                <p className='text-sm text-red-500'>
                  Por favor selecciona una ubicación en el mapa
                </p>
              )}
            </div>
          </div>

          <div className='space-y-2'>
            <Label className='text-[13px] font-medium text-slate-600'>
              Horario de atención
            </Label>
            <p className='text-xs text-gray-500'>
              Opcional. Se muestra a Google como horario del negocio (mejora el SEO local).
            </p>
            <div className='bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden'>
              <Table>
                <TableHeader>
                  <TableRow className='border-b border-slate-100'>
                    <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium w-[140px]'>
                      Día
                    </TableHead>
                    <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium w-[150px]'>
                      Abierto
                    </TableHead>
                    <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                      Apertura
                    </TableHead>
                    <TableHead className='bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                      Cierre
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DAYS.map(({ key, label }) => {
                    const day = openingHours[key] || {};
                    const isOpen = !day.closed;
                    return (
                      <TableRow
                        key={key}
                        className='border-b border-slate-100 hover:bg-slate-50/50 transition-colors'
                      >
                        <TableCell className='font-medium text-[13px] text-slate-700'>
                          {label}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <Switch
                              checked={isOpen}
                              onCheckedChange={(val) =>
                                setDay(
                                  key,
                                  val
                                    ? { closed: false }
                                    : { closed: true, open: '', close: '' }
                                )
                              }
                              aria-label='Alternar abierto/cerrado'
                            />
                            <span className='text-[13px] text-slate-500'>
                              {isOpen ? 'Abierto' : 'Cerrado'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type='time'
                            value={day.open || ''}
                            disabled={!isOpen}
                            onChange={(e) =>
                              setDay(key, { open: e.target.value, closed: false })
                            }
                            className='h-9 rounded-xl border-slate-200/60 text-[13px]'
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type='time'
                            value={day.close || ''}
                            disabled={!isOpen}
                            onChange={(e) =>
                              setDay(key, { close: e.target.value, closed: false })
                            }
                            className='h-9 rounded-xl border-slate-200/60 text-[13px]'
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              variant='outline'
              type='button'
              onClick={onClose}
              className='h-9 rounded-xl text-[13px] border-slate-200/60'
            >
              Cancelar
            </Button>
            <Button type='submit' className='h-9 rounded-xl text-[13px]'>
              {dealership?.id ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
