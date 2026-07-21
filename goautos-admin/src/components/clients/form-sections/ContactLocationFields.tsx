import React, { lazy, Suspense, useMemo } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { UseFormReturn } from 'react-hook-form';
import { ClientFormValues } from '../ClientSchema';
import { Mail, Phone, MapPin, Navigation, ToggleLeft, Loader2 } from 'lucide-react';

// Lazy load del LocationPicker para evitar problemas de SSR con mapbox-gl
// (mismo patrón que DealershipDialog para las sucursales).
const LocationPicker = lazy(() => import('@/components/map/LocationPicker'));

interface ContactLocationFieldsProps {
  form: UseFormReturn<ClientFormValues>;
}

const ContactLocationFields = ({ form }: ContactLocationFieldsProps) => {
  const latStr = form.watch('location_lat');
  const lngStr = form.watch('location_lng');
  const addressStr = form.watch('contact_address');

  // Coordenadas derivadas de la dirección: solo lectura, no se piden a mano.
  const initialLocation = useMemo(() => {
    const lat = parseFloat(latStr ?? '');
    const lng = parseFloat(lngStr ?? '');
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return undefined;
  }, [latStr, lngStr]);

  // Al elegir/buscar una dirección en el mapa, geocodificamos automáticamente
  // y rellenamos dirección + lat/lng (guardadas como string, igual que el esquema).
  const handleLocationChange = (newLocation: {
    lat: number;
    lng: number;
    address: string;
  }) => {
    form.setValue('location_lat', String(newLocation.lat), { shouldDirty: true });
    form.setValue('location_lng', String(newLocation.lng), { shouldDirty: true });
    if (newLocation.address) {
      form.setValue('contact_address', newLocation.address, { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-5">
      {/* Contact Info */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          Información de Contacto
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contact_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-600 text-sm">
                  Email de Contacto <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="contacto@automotora.com"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-600 text-sm flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  Teléfono
                </FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+56 9 1234 5678"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Location */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          Ubicación
        </h4>
        <p className="text-xs text-gray-500 mb-4">
          Busca la dirección en el mapa y las coordenadas se completan solas.
        </p>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="contact_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-600 text-sm">
                  Dirección
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Av. Principal 1234, Comuna, Ciudad"
                    className="h-11"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Mapa con buscador de direcciones: geocodifica automáticamente
              (mismo componente que usan las sucursales). */}
          <Suspense
            fallback={
              <div className="w-full h-[300px] rounded-xl border border-gray-200 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            }
          >
            <LocationPicker
              initialLocation={initialLocation}
              initialAddress={addressStr}
              onLocationChange={handleLocationChange}
            />
          </Suspense>

          {/* Coordenadas derivadas (solo lectura, no se ingresan a mano) */}
          {initialLocation && (
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Navigation className="h-3.5 w-3.5 text-gray-300" />
              Coordenadas detectadas: {latStr}, {lngStr}
            </p>
          )}
        </div>
      </div>

      {/* Demo Mode */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
        <FormField
          control={form.control}
          name="has_demo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="h-5 w-5 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
              </FormControl>
              <div className="space-y-0.5 flex-1">
                <FormLabel className="text-gray-700 font-medium flex items-center gap-2 cursor-pointer">
                  <ToggleLeft className="h-4 w-4 text-amber-600" />
                  Modo Demo Activo
                </FormLabel>
                <p className="text-xs text-gray-500">
                  Si está activado, el cliente tiene acceso limitado en modo demostración
                </p>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default ContactLocationFields;
