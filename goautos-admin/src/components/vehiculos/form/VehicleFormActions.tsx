
import React from 'react';
import { Button } from '@/components/ui/button';

interface VehicleFormActionsProps {
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

const VehicleFormActions: React.FC<VehicleFormActionsProps> = ({ 
  onCancel, 
  isSubmitting,
  submitLabel = 'Guardar vehículo'
}) => {
  return (
    <div className="flex justify-end space-x-2">
      <Button variant="outline" type="button" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isSubmitting} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary)]">
        {isSubmitting ? 'Guardando...' : submitLabel}
      </Button>
    </div>
  );
};

export default VehicleFormActions;
