import React from 'react';

interface NotesSectionProps {
  notes?: string;
}

const NotesSection: React.FC<NotesSectionProps> = ({ notes }) => {
  return (
    <div className='border border-gray-200 rounded-lg p-4 mb-6'>
      <h2 className='font-semibold text-lg mb-2'>OBSERVACIONES</h2>
      <div className='max-h-[120px] overflow-y-auto'>
        <p>{notes || '-'}</p>
      </div>
    </div>
  );
};

export default NotesSection;
