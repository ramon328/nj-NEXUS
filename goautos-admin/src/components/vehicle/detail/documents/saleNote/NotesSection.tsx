
import React from 'react';
import EditableTemplateText from '@/components/configuration/document-templates/EditableTemplateText';

interface NotesSectionProps {
  notes: string | null;
  isTemplate?: boolean;
  onNotesChange?: (notes: string) => void;
}

const NotesSection = ({ notes, isTemplate, onNotesChange }: NotesSectionProps) => {
  if (isTemplate && onNotesChange) {
    return (
      <div className='border border-gray-200 rounded-lg p-4 mb-6'>
        <h2 className='font-semibold text-lg mb-2'>OBSERVACIONES</h2>
        <EditableTemplateText
          value={notes || ''}
          onChange={onNotesChange}
          label="Observaciones"
        />
      </div>
    );
  }

  return (
    <div className='border border-gray-200 rounded-lg p-4 mb-6'>
      <h2 className='font-semibold text-lg mb-2'>OBSERVACIONES</h2>
      <p>{notes || '-'}</p>
    </div>
  );
};

export default NotesSection;
