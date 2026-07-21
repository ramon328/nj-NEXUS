// src/pages/Onboarding/steps/LocationStep.tsx
import React, { lazy, Suspense } from 'react';
import { PRIMARY_COLOR } from '@/lib/colors';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Search } from 'lucide-react';

const LocationPicker = lazy(() => import('@/components/map/LocationPicker'));

export type LocationData = { lat: number; lng: number; address: string };

interface Props {
  value: LocationData;
  onChange: (patch: Partial<LocationData>) => void;
}

export const LocationStep: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="space-y-6">
      {/* Header compacto */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm">
          <MapPin className="h-6 w-6 text-slate-700" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-slate-900 leading-tight">
            Ubicación de tu automotora
          </h2>
          <p className="text-slate-600">
            Busca tu dirección y ajusta el marcador en el mapa.
          </p>
        </div>
      </div>

      {/* Mapa protagonista con buscador pill */}
      <div className="relative overflow-hidden rounded-2xl border bg-white shadow-xl">
        <div
          className="pointer-events-none absolute inset-0 opacity-[.05]"
          style={{ background: `radial-gradient(80% 60% at 0% 0%, ${PRIMARY_COLOR} 0%, transparent 70%)` }}
        />
        <div className="relative h-[340px] sm:h-[380px] lg:h-[400px]">
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-slate-50">
                <div className="relative">
                  <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200" />
                  <Loader2 className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                </div>
              </div>
            }
          >
            <LocationPicker
              initialLocation={{ lat: value.lat, lng: value.lng }}
              onLocationChange={(loc) => onChange(loc)}
              initialAddress={value.address}
            />
          </Suspense>
        </div>
      </div>

      {/* Dirección (simple, debajo del mapa) */}
      <div className="space-y-2">
        <Label htmlFor="address">
          Dirección <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="address"
            value={value.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="Av. Apoquindo 4500, Las Condes, Chile"
            className="h-12 pr-10 text-slate-700 placeholder:text-slate-400"
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        </div>
      </div>
    </div>
  );
};
