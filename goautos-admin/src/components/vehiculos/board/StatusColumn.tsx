import React, { useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { Vehicle } from '@/types/vehicle';
import VehicleCard from './VehicleCard';
import type { ChecklistSummary } from '@/types/vehicleChecklist';

interface StatusColumnProps {
  status: {
    id: number;
    name: string | null;
    color: string | null;
    order: number | null;
  };
  vehicles: Vehicle[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onViewVehicle: (id: number) => void;
  onEditVehicle: (id: number) => void;
  onDeleteVehicle: (id: number) => void;
  checklistSummaries?: Map<number, ChecklistSummary>;
}

const StatusColumn = ({
  status,
  vehicles,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onViewVehicle,
  onEditVehicle,
  onDeleteVehicle,
  checklistSummaries,
}: StatusColumnProps) => {
  const { tCommon } = useI18n();
  const [isOver, setIsOver] = useState(false);
  const bgColor = status.color || '#64748b';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    onDrop();
  };

  return (
    <div
      className={`flex flex-col w-[280px] h-fit max-h-[calc(94vh-280px)] min-h-[100px] flex-shrink-0 rounded-2xl overflow-hidden transition-all duration-150 ${
        isOver
          ? 'ring-2 ring-blue-400 shadow-lg bg-blue-50/30 scale-[1.01]'
          : 'shadow-sm bg-white'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className='p-2 flex-shrink-0'>
        <div className='flex items-center justify-between'>
          <span
            className='inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-full text-xs border'
            style={{
              backgroundColor: `${bgColor}1A`,
              color: bgColor,
              borderColor: `${bgColor}4D`,
            }}
          >
            <span className='w-1.5 h-1.5 rounded-full flex-shrink-0' style={{ backgroundColor: bgColor }} />
            {status.name}
          </span>
          <span className='bg-slate-100 text-black rounded-full px-3 py-1 text-md font-medium ml-2'>
            {vehicles.length}
          </span>
        </div>
      </div>

      <div
        className={`flex-1 px-2 py-1 overflow-y-auto scrollbar-none ${
          vehicles.length === 0 ? 'min-h-[80px]' : ''
        }`}
      >
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onView={onViewVehicle}
            onEdit={onEditVehicle}
            onDelete={onDeleteVehicle}
            checklistSummary={checklistSummaries?.get(vehicle.id as number)}
          />
        ))}

        {vehicles.length === 0 && (
          <div className='p-4 text-center text-sm text-gray-400'>
            {tCommon('vehicles.board.noVehicles')}
          </div>
        )}
      </div>
    </div>
  );
};


export default StatusColumn;
