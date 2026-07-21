
import React from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Save, X } from 'lucide-react';

interface ReservationActionsProps {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const ReservationActions: React.FC<ReservationActionsProps> = ({ 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel 
}) => {
  if (isEditing) {
    return (
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={onCancel}>
          <X className="h-3 w-3 mr-1" />
          Cancelar
        </Button>
        <Button size="sm" className="h-7 text-xs px-2" onClick={onSave}>
          <Save className="h-3 w-3 mr-1" />
          Guardar
        </Button>
      </div>
    );
  }

  return (
    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={onEdit}>
      <Edit className="h-3 w-3 mr-1" />
      Editar
    </Button>
  );
};

export default ReservationActions;
