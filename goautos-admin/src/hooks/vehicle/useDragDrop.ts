
import { useState } from 'react';

export const useDragDrop = () => {
  const [draggingVehicleId, setDraggingVehicleId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragStart = (vehicleId: number) => {
    setDraggingVehicleId(vehicleId);
    setIsDragging(true);
  };
  
  const handleDragEnd = () => {
    setDraggingVehicleId(null);
    setIsDragging(false);
  };
  
  return {
    draggingVehicleId,
    isDragging,
    handleDragStart,
    handleDragEnd,
    setDraggingVehicleId,
    setIsDragging
  };
};
