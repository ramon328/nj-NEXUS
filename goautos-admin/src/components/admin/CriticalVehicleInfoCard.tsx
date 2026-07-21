import { Car, Clock } from 'lucide-react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';

interface CriticalVehicleInfoCardProps {
  vehicle: any;
  daysInInventory: number;
  showPublicationBadge?: boolean;
}

const CriticalVehicleInfoCard = ({
  vehicle,
  daysInInventory,
  showPublicationBadge,
}: CriticalVehicleInfoCardProps) => {
  const [, navigate] = useLocation();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);

  const handleClick = () => {
    navigate(`/vehiculos/${vehicle.id}`);
  };

  const brand = vehicle.brands?.name || 'Sin marca';
  const model = vehicle.models?.name || 'Sin modelo';

  return (
    <div
      onClick={handleClick}
      className="group rounded-2xl border border-red-200/60 bg-white overflow-hidden hover:border-red-400/60 transition-all duration-300 cursor-pointer"
    >
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-red-50/80 to-red-100/50">
        {vehicle.main_image ? (
          <img
            src={vehicle.main_image}
            alt={`${brand} ${model}`}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Car className="w-12 h-12 text-red-200" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Days badge */}
        <div className="absolute top-2.5 right-2.5 bg-red-600 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold shadow-sm flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {daysInInventory} {dv('días', 'days')}
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
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-red-600 font-semibold">{daysInInventory} {dv('días en stock', 'days in stock')}</span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((daysInInventory / 180) * 100, 100)}%` }}
              />
            </div>
          </div>
          {vehicle.year && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md ml-3">
              {vehicle.year}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CriticalVehicleInfoCard;
