import React, { useState, useRef } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Vehicle } from '@/types/vehicle';
import type { ChecklistSummary } from '@/types/vehicleChecklist';

interface VehicleCardProps {
  vehicle: Vehicle;
  onDragStart: (id: number) => void;
  onDragEnd: () => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  checklistSummary?: ChecklistSummary;
}

const VehicleCard = ({
  vehicle,
  onDragStart,
  onDragEnd,
  onView,
  checklistSummary,
}: VehicleCardProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent) => {
    // Set dragging data
    e.dataTransfer.setData('text/plain', vehicle.id.toString());
    e.dataTransfer.effectAllowed = 'move';

    // Update local and parent state ANTES de clonar para que no copie los estilos de isDragging
    onDragStart(vehicle.id);

    // Crear una imagen personalizada para el drag con rotación ANTES de setIsDragging
    if (cardRef.current) {
      const dragImage = cardRef.current.cloneNode(true) as HTMLElement;
      dragImage.style.position = 'absolute';
      dragImage.style.top = '-9999px';
      dragImage.style.left = '-9999px';
      dragImage.style.transform = 'rotate(5deg) scale(1.05)';
      dragImage.style.opacity = '1';
      dragImage.style.boxShadow = 'none';
      dragImage.style.pointerEvents = 'none';
      dragImage.style.width = cardRef.current.offsetWidth + 'px';
      document.body.appendChild(dragImage);

      e.dataTransfer.setDragImage(
        dragImage,
        cardRef.current.offsetWidth / 2,
        cardRef.current.offsetHeight / 2
      );

      // Limpiar después de que el drag haya comenzado
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage);
        }
      }, 100);
    }

    // Ahora sí actualizar el estado visual de la card original
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  return (
    <div
      ref={cardRef}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-grab active:cursor-grabbing transition-all mb-2 ${
        isDragging
          ? 'opacity-30 scale-95'
          : 'hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5 duration-150'
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onView(vehicle.id)}
    >
      <div className='flex'>
        {vehicle.main_image && (
          <div className='w-24 h-24 flex-shrink-0'>
            <img
              src={vehicle.main_image}
              alt={`${vehicle.brand?.name || ''} ${vehicle.model?.name || ''}`}
              className='w-full h-full object-cover'
            />
          </div>
        )}

        <div className='flex-1 p-3 flex flex-col justify-between'>
          <h3 className='font-medium text-gray-900 text-sm'>
            {[vehicle.brand?.name, vehicle.model?.name, vehicle.version_name]
              .filter(Boolean)
              .join(' ')}
          </h3>
          <div className='flex justify-between items-center mt-1'>
            <span className='text-gray-500 text-sm'>
              {vehicle.year}
              {vehicle.license_plate && (
                <span className='ml-1.5 text-xs text-gray-400'>
                  · {vehicle.license_plate}
                </span>
              )}
            </span>
            <span className='ml-2 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold whitespace-nowrap'>
              {(() => {
                if (!vehicle.state_updated_at) return 1;
                const updatedAt = new Date(vehicle.state_updated_at);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
                return Math.floor(diffTime / (1000 * 60 * 60 * 24));
              })()}d
            </span>
          </div>
          {vehicle.fines_count != null && (
            <div className='mt-1.5'>
              {vehicle.fines_count > 0 ? (
                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700'>
                  <AlertTriangle className='w-3 h-3' />
                  {vehicle.fines_count} {vehicle.fines_count === 1 ? 'multa' : 'multas'}
                </span>
              ) : (
                <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700'>
                  <ShieldCheck className='w-3 h-3' />
                  Sin multas
                </span>
              )}
            </div>
          )}
          {checklistSummary && checklistSummary.total > 0 && (
            <div className='flex items-center gap-1.5 mt-1.5'>
              <div className='flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden'>
                <div
                  className={`h-full rounded-full ${
                    checklistSummary.percentComplete >= 100
                      ? 'bg-green-500'
                      : checklistSummary.percentComplete >= 50
                      ? 'bg-blue-500'
                      : 'bg-orange-500'
                  }`}
                  style={{ width: `${checklistSummary.percentComplete}%` }}
                />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  checklistSummary.percentComplete >= 100
                    ? 'text-green-600'
                    : checklistSummary.percentComplete >= 50
                    ? 'text-blue-600'
                    : 'text-orange-600'
                }`}
              >
                {checklistSummary.percentComplete}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;
