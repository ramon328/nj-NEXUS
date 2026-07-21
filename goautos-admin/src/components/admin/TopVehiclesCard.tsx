import { TopVehicle } from '@/hooks/admin/useVisitStats';
import { Eye } from 'lucide-react';
import VehicleInfoCard from './VehicleInfoCard';
import CompactVehicleRow from './CompactVehicleRow';
import { useTranslation } from 'react-i18next';

interface TopVehiclesCardProps {
  topVehicles: TopVehicle[];
  loading: boolean;
  compact?: boolean;
}

const TopVehiclesCard = ({ topVehicles, loading, compact }: TopVehiclesCardProps) => {
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  const displayCount = compact ? 5 : 12;

  if (loading) {
    return (
      <div className={`rounded-2xl border border-slate-200/60 bg-white ${compact ? 'h-full' : ''}`}>
        <div className="p-4 sm:p-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-4 w-48 bg-slate-100 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className={compact ? "px-4 sm:px-5 pb-4 sm:pb-5" : "px-5 pb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={compact
              ? "flex items-center gap-3 py-3 border-b border-slate-100 last:border-0"
              : "rounded-2xl bg-slate-50 animate-pulse h-[220px]"
            }>
              {compact && (
                <>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded-lg" />
                    <div className="h-3 w-1/3 bg-slate-100 animate-pulse rounded-lg" />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!topVehicles || topVehicles.length === 0) return null;

  const displayVehicles = topVehicles.slice(0, displayCount);

  return (
    <div className={`rounded-2xl border border-slate-200/60 bg-white ${compact ? 'h-full flex flex-col' : ''}`}>
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Eye className="w-[18px] h-[18px] text-slate-900" />
          <h3 className="text-[15px] font-semibold text-slate-900">
            {dv('Más visitados', 'Most visited')}
          </h3>
          <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
            {displayVehicles.length}
          </span>
        </div>
      </div>

      {compact ? (
        /* Compact list mode — like vehículos críticos */
        <div className="px-4 pb-1.5 flex-1 overflow-y-auto space-y-1">
          {displayVehicles.map((vehicle, idx) => (
            <CompactVehicleRow
              key={vehicle.vehicleId}
              vehicleId={vehicle.vehicleId}
              visits={vehicle.visits}
              rank={idx + 1}
            />
          ))}
        </div>
      ) : (
        /* Full grid mode */
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayVehicles.map((vehicle, idx) => (
              <VehicleInfoCard
                key={vehicle.vehicleId}
                vehicleId={vehicle.vehicleId}
                visits={vehicle.visits}
                rank={idx + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopVehiclesCard;
