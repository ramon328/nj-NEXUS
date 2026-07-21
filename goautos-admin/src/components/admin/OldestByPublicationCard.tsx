import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { OldestVehicle } from '@/hooks/admin/useInventoryKpis';
import { VehicleWithPublicationDays } from '@/hooks/admin/types/inventoryAnalytics';
import { Car, Globe, Clock } from 'lucide-react';
import { useLocation } from 'wouter';

interface OldestByPublicationCardProps {
  vehicles?: OldestVehicle[] | VehicleWithPublicationDays[];
  loading?: boolean;
  showCard?: boolean;
}

const PublicationVehicleCard: React.FC<{
  vehicle: OldestVehicle | VehicleWithPublicationDays;
  dv: (es: string, en: string) => string;
}> = ({ vehicle, dv }) => {
  const [, navigate] = useLocation();

  const handleClick = () => {
    navigate(`/vehiculos/${vehicle.id}`);
  };

  const brand = vehicle.brands?.name || 'Sin marca';
  const model = vehicle.models?.name || 'Sin modelo';

  const daysInSystem = 'daysInStock' in vehicle ? vehicle.daysInStock :
    ('daysInSystem' in vehicle ? vehicle.daysInSystem : 0);
  const daysPublished = vehicle.daysPublished;

  const getBadgeColor = (days: number) => {
    if (days > 90) return 'bg-red-500';
    if (days > 60) return 'bg-orange-500';
    if (days > 30) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div
      onClick={handleClick}
      className="group rounded-2xl border border-slate-200/60 bg-white overflow-hidden hover:border-amber-500/20 transition-all duration-300 cursor-pointer"
    >
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
        {vehicle.main_image ? (
          <img
            src={vehicle.main_image}
            alt={`${brand} ${model}`}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Car className="w-12 h-12 text-slate-200" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Days published badge */}
        {daysPublished !== null && (
          <div className={`absolute top-2.5 right-2.5 ${getBadgeColor(daysPublished)} text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-sm flex items-center gap-1.5`}>
            <Globe className="w-3 h-3" />
            {daysPublished}d
          </div>
        )}

        {/* Days in system badge */}
        <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-slate-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-sm flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-slate-400" />
          {daysInSystem}d
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-6 bg-gradient-to-t from-black/60 to-transparent">
          <h3 className="text-[13px] font-semibold text-white truncate">
            {brand} {model}
          </h3>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <Globe className="w-3 h-3 text-blue-500" />
            <span>{daysPublished !== null ? `${daysPublished} ${dv('días pub.', 'days pub.')}` : dv('No publicado', 'Not published')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{daysInSystem} {dv('días total', 'days total')}</span>
          </div>
        </div>
        {vehicle.year && (
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
            {vehicle.year}
          </span>
        )}
      </div>
    </div>
  );
};

const OldestByPublicationCard: React.FC<OldestByPublicationCardProps> = ({
  vehicles,
  loading,
  showCard = true,
}) => {
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  const loadingContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-slate-50 animate-pulse h-[220px]" />
      ))}
    </div>
  );

  const publishedVehicles = (vehicles || []).filter(v => v.daysPublished !== null);

  const emptyContent = (
    <div className="text-center py-8 rounded-xl bg-slate-50/50">
      <Globe className="w-8 h-8 text-slate-200 mx-auto mb-2" />
      <p className="text-[13px] text-slate-400">
        {dv('No hay vehículos publicados en la web', 'No vehicles published on web')}
      </p>
    </div>
  );

  const vehiclesContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {publishedVehicles.map((vehicle) => (
        <PublicationVehicleCard key={vehicle.id} vehicle={vehicle} dv={dv} />
      ))}
    </div>
  );

  if (loading) {
    if (!showCard) return loadingContent;
    return (
      <Card className="flex flex-col h-[600px]">
        <CardHeader className="flex-shrink-0">
          <p className="text-xl font-medium">
            {dv('Vehículos con Más Días Publicados', 'Vehicles with Most Days Published')}
          </p>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          {loadingContent}
        </CardContent>
      </Card>
    );
  }

  if (publishedVehicles.length === 0) {
    if (!showCard) return emptyContent;
    return (
      <Card className="flex flex-col h-[600px]">
        <CardHeader className="flex-shrink-0">
          <p className="text-xl font-medium">
            {dv('Vehículos con Más Días Publicados', 'Vehicles with Most Days Published')}
          </p>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          {emptyContent}
        </CardContent>
      </Card>
    );
  }

  if (!showCard) return vehiclesContent;

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="flex-shrink-0">
        <p className="text-xl font-medium">
          {dv('Vehículos con Más Días Publicados', 'Vehicles with Most Days Published')}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {dv('Tiempo visible en la web sin venderse', 'Time visible on web without selling')}
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {vehiclesContent}
      </CardContent>
    </Card>
  );
};

export default OldestByPublicationCard;
