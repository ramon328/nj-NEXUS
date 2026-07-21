import { Car, Calendar } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';

interface OldestVehicleInfoCardProps {
  vehicle: any;
  daysInStock: number;
}

const OldestVehicleInfoCard = ({ vehicle, daysInStock }: OldestVehicleInfoCardProps) => {
  const [, navigate] = useLocation();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);

  const handleClick = () => {
    navigate(`/vehiculos/${vehicle.id}`);
  };

  const brand = vehicle.brands?.name || 'Sin marca';
  const model = vehicle.models?.name || 'Sin modelo';

  const getBadgeColor = () => {
    if (daysInStock > 90) return 'bg-red-500';
    if (daysInStock > 60) return 'bg-orange-500';
    if (daysInStock > 30) return 'bg-amber-500';
    return 'bg-blue-500';
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

        {/* Days in stock badge */}
        <div className={`absolute top-2.5 right-2.5 ${getBadgeColor()} text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-sm flex items-center gap-1.5`}>
          <Calendar className="w-3 h-3" />
          {daysInStock} {dv('días', 'days')}
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 pt-6 bg-gradient-to-t from-black/60 to-transparent">
          <h3 className="text-[13px] font-semibold text-white truncate">
            {brand} {model}
          </h3>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] text-slate-500">{brand} {model}</span>
          {vehicle.year && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {vehicle.year}
            </span>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              daysInStock > 90
                ? 'bg-gradient-to-r from-red-500 to-red-400'
                : daysInStock > 60
                ? 'bg-gradient-to-r from-orange-500 to-orange-400'
                : daysInStock > 30
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-blue-500 to-blue-400'
            }`}
            style={{ width: `${Math.min((daysInStock / 120) * 100, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default OldestVehicleInfoCard;
