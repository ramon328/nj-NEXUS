
import React from 'react';

export interface AdditionalNotesSectionProps {
  notes: string | null;
  validityPeriod: string;
}

const AdditionalNotesSection: React.FC<AdditionalNotesSectionProps> = ({ notes, validityPeriod }) => {
  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-semibold mb-2">Información Adicional</h4>
      
      <div className="mb-4">
        <p className="font-medium text-sm mb-1">Periodo de validez</p>
        <p>{validityPeriod || 'Esta cotización es válida por 7 días'}</p>
      </div>
      
      {notes && (
        <div>
          <p className="font-medium text-sm mb-1">Observaciones</p>
          <p className="text-sm whitespace-pre-line">{notes}</p>
        </div>
      )}
    </div>
  );
};

export default AdditionalNotesSection;
