import React from 'react';
import { useEditor } from '@craftjs/core';
import { Badge } from '@/components/ui/badge';
import { Car, Calendar, Gauge, Settings } from 'lucide-react';
import { SimpleVehicle } from './VehicleCarousel';

export interface VehicleCardOverlayProps {
  vehicle: SimpleVehicle;
  compact?: boolean;
  // Colores/estilo (opcionales)
  radius?: number; // px
  shadow?: string; // tailwind class
  showNewBadge?: boolean;
  newBadgeText?: string;
}

export const VehicleCard2: React.FC<VehicleCardOverlayProps> = ({
  vehicle,
  compact = false,
  radius = 24,
  shadow = 'shadow-[0_6px_24px_rgba(0,0,0,0.15)]',
  showNewBadge = true,
  newBadgeText = 'Recién publicado',
}) => {
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));

  const {
    id,
    brand,
    model,
    price,
    year,
    mileage,
    transmission,
    main_image,
    status,
    created_at,
    discount_percentage,
    fuel_type,
  } = vehicle;

  const isNew = () => {
    if (!created_at) return false;
    const d = new Date();
    d.setDate(d.getDate() - 5);
    return new Date(created_at) > d;
  };

  // Get status chip label and color
  // Custom states with show_in_web=true are treated as "Disponible" unless they are Vendido/Reservado
  const getStatus = () => {
    if (status?.name === 'Reservado') {
      return { label: 'Reservado', className: 'bg-amber-500 text-white' };
    }
    if (status?.name === 'Vendido') {
      return { label: 'Vendido', className: 'bg-rose-600 text-white' };
    }
    // All other visible states (including custom ones) show as "Disponible"
    return { label: 'Disponible', className: 'bg-emerald-600 text-white' };
  };

  const statusChip = getStatus();

  const formatCLP = (n: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(n);

  const effectivePrice =
    price && discount_percentage && discount_percentage > 0
      ? Math.round(price * (1 - discount_percentage / 100))
      : price;

  const Title = (
    <h3 className="text-white font-semibold text-lg leading-tight line-clamp-1">
      {brand?.name} {model?.name}
    </h3>
  );

  const pct = discount_percentage && discount_percentage > 0 ? Math.round(discount_percentage) : 0;

  const Price = (
    <div className="flex flex-col">
      {effectivePrice ? (
        <>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-base">
              {formatCLP(effectivePrice)}
            </span>
            {pct > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500 text-white leading-none">
                -{pct}%
              </span>
            )}
          </div>
          {pct > 0 && price ? (
            <span className="text-white/50 line-through text-xs">
              {formatCLP(price)}
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-white font-bold text-base">Consultar</span>
      )}
    </div>
  );

  const SpecItem: React.FC<{ icon: React.ReactNode; text: string }> = ({
    icon,
    text,
  }) => (
    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-white/85">
      {icon}
      <span className="leading-none">{text}</span>
    </div>
  );

  const cardInner = (
    <div
      className={`relative overflow-hidden bg-black hover:-translate-y-3 transition duration-500 ${shadow}`}
      style={{ borderRadius: radius }}
    >
      {/* Imagen */}
      <div className={`relative ${compact ? 'h-52' : 'h-64'} `}>
        {main_image ? (
          <img
            src={main_image}
            alt={`${brand?.name || ''} ${model?.name || ''}`}
            className="w-full h-full group-hover:opacity-50 duration-500 object-cover transition "
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full grid place-items-center">
            <Car size={48} className="text-gray-300" />
          </div>
        )}

        {/* Chip estado */}
        <div className="absolute top-3 left-3">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${statusChip.className}`}
          >
            {statusChip.label}
          </span>
        </div>

        {/* Badge nuevo - show for any available state (not Vendido/Reservado) */}
        {showNewBadge && isNew() && status?.name !== 'Vendido' && status?.name !== 'Reservado' && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-emerald-100 text-emerald-700 text-[11px] font-medium px-2.5 py-1 rounded-full">
              {newBadgeText}
            </Badge>
          </div>
        )}

        {/* Overlay gradiente + contenido inferior */}
        <div className="absolute inset-x-0 bottom-0 pointer-events-none">
          <div className="h-28 sm:h-28 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className="flex flex-col gap-1.5">
            {Title}
            {Price}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              {typeof mileage === 'number' && (
                <SpecItem
                  icon={<Gauge size={14} className="opacity-80" />}
                  text={`${mileage.toLocaleString()} kms`}
                />
              )}
              {year && (
                <SpecItem
                  icon={<Calendar size={14} className="opacity-80" />}
                  text={String(year)}
                />
              )}
              {transmission && transmission.trim() !== '' && (
                <SpecItem
                  icon={<Settings size={14} className="opacity-80" />}
                  text={transmission}
                />
              )}
              {fuel_type?.name && (
                <SpecItem
                  icon={<Car size={14} className="opacity-80" />}
                  text={fuel_type.name}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // En editor: div; en runtime: <a> a la ficha
  if (isEnabled) {
    return <div className="group">{cardInner}</div>;
  }

  return (
    <a href={`/vehicles/${id}`} className="block group" aria-label={`${brand?.name} ${model?.name}`}>
      {cardInner}
    </a>
  );
};
