import { cn } from '@/lib/utils';
import { VehiclePreview } from '@/types/gaia';
import { Car, MapPin, Gauge, Calendar, Clock, ChevronRight } from 'lucide-react';

interface VehicleCardBlockProps {
  vehicles: VehiclePreview[];
  onSelect?: (vehicle: VehiclePreview) => void;
}

function formatPrice(price: number): string {
  if (!price || price < 100) return '—';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(price);
}

function formatMileage(km?: number): string {
  if (!km) return '';
  return `${(km / 1000).toFixed(0)}k km`;
}

function stockBadge(days: number) {
  if (days > 90) return { label: 'Crítico', color: 'bg-red-500' };
  if (days > 60) return { label: 'Atención', color: 'bg-amber-500' };
  if (days > 30) return { label: `${days}d`, color: 'bg-slate-400' };
  return { label: `${days}d`, color: 'bg-emerald-500' };
}

export function VehicleCardBlock({ vehicles, onSelect }: VehicleCardBlockProps) {
  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-slate-400 text-sm">
        No se encontraron vehículos
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
      {vehicles.map((v) => {
        const stock = stockBadge(v.days_in_stock);
        return (
          <div
            key={v.id}
            className={cn(
              'rounded-2xl overflow-hidden border border-slate-200/80 bg-white shadow-sm transition-all',
              onSelect && 'cursor-pointer hover:shadow-md hover:border-slate-300 active:scale-[0.98]'
            )}
            onClick={() => onSelect?.(v)}
          >
            {/* Image — ratio fijo que llena la card en cualquier ancho de columna */}
            <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-50">
              {v.main_image ? (
                <img
                  src={v.main_image}
                  alt={`${v.brand} ${v.model}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car className="w-12 h-12 text-slate-200" />
                </div>
              )}

              {/* Status pill */}
              <div className="absolute top-3 left-3">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white backdrop-blur-md"
                  style={{ backgroundColor: `${v.statusColor}cc` }}
                >
                  {v.status}
                </span>
              </div>

              {/* Stock badge */}
              <div className="absolute top-3 right-3">
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold text-white backdrop-blur-md',
                  stock.color
                )}>
                  <Clock className="w-3 h-3" />
                  {stock.label}
                </span>
              </div>

              {/* Price overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8">
                <span className="text-white text-xl font-bold tracking-tight">
                  {formatPrice(v.price)}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[15px] font-bold text-slate-900 leading-tight">
                    {v.brand} {v.model}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {v.year}
                    </span>
                    {v.mileage ? (
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5" />
                        {formatMileage(v.mileage)}
                      </span>
                    ) : null}
                    {v.license_plate && (
                      <span className="font-mono text-slate-400">{v.license_plate}</span>
                    )}
                  </div>
                </div>
                {onSelect && (
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                )}
              </div>

              {/* Tags row */}
              {(v.fuel_type || v.transmission || v.condition) && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {v.fuel_type && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] text-slate-600">
                      {v.fuel_type}
                    </span>
                  )}
                  {v.transmission && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] text-slate-600">
                      {v.transmission}
                    </span>
                  )}
                  {v.condition && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] text-slate-600">
                      {v.condition}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
