import { Status } from '@/hooks/useStatuses';
import { Vehicle } from '@/types/vehicle';

interface VehicleStatusCardsProps {
  statuses: Status[];
  vehicles: Vehicle[];
  activeStatusId: number | null;
  onStatusClick: (id: number | null) => void;
  loading: boolean;
}

export default function VehicleStatusCards({
  statuses,
  vehicles,
  activeStatusId,
  onStatusClick,
  loading,
}: VehicleStatusCardsProps) {
  const totalCount = vehicles.length;

  const getCount = (statusId: number) =>
    vehicles.filter((v) => v.status_id === statusId).length;

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pt-0.5 pb-1.5 -mx-4 px-4 sm:hidden scrollbar-none">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-100 animate-pulse rounded-xl h-[38px] w-[100px] flex-shrink-0" />
        ))}
      </div>
    );
  }

  const FIXED_NAMES = ['publicado', 'reservado', 'vendido'];
  const fixedStatuses = FIXED_NAMES
    .map((name) => statuses.find((s) => s.name?.toLowerCase() === name))
    .filter(Boolean) as Status[];
  const fixedIds = new Set(fixedStatuses.map((s) => s.id));
  const otherStatuses = statuses.filter((s) => !s.is_disabled && !fixedIds.has(s.id));
  const allCards = [...fixedStatuses, ...otherStatuses];

  return (
    <>
      {/* Mobile: compact horizontal scroll pills */}
      <div className="flex gap-2 overflow-x-auto pt-0.5 pb-1.5 -mx-4 px-4 sm:hidden scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
        {allCards.map((status) => {
          const isActive = activeStatusId === status.id;
          const color = status.color || '#64748b';
          const count = getCount(status.id);

          return (
            <button
              key={status.id}
              onClick={() => onStatusClick(isActive ? null : status.id)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0 transition-all duration-200
                ${isActive
                  ? 'ring-2 border-transparent'
                  : 'bg-white border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]'
                }
              `}
              style={isActive ? {
                ringColor: color,
                backgroundColor: `${color}15`,
                boxShadow: `0 0 0 2px ${color}`,
              } : undefined}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[13px] font-medium text-slate-700 whitespace-nowrap">
                {status.name}
              </span>
              <span className="text-[13px] font-semibold text-slate-900">{count}</span>
            </button>
          );
        })}
      </div>

    </>
  );
}
