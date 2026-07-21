import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSection } from '@/types/document-editor';

interface AddSectionButtonProps {
  afterSectionId: string;
  onAdd: (section: CustomSection) => void;
}

const AddSectionButton: React.FC<AddSectionButtonProps> = ({ afterSectionId, onAdd }) => {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');

  const handleAdd = () => {
    if (!title.trim()) return;
    onAdd({
      id: `cs_${Date.now()}`,
      title: title.trim(),
      afterSectionId,
      fields: [],
    });
    setTitle('');
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <div className="flex justify-center py-1">
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-[8pt] text-gray-400 hover:text-blue-500 transition-colors opacity-0 hover:opacity-100 focus:opacity-100"
          title="Agregar sección"
        >
          <Plus className="h-3 w-3" />
          Agregar sección
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 my-2 bg-blue-50/50 rounded-md p-2">
      <Input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Título de la sección"
        className="h-7 text-xs flex-1"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') setExpanded(false);
        }}
      />
      <Button size="sm" className="h-7 text-xs px-3" onClick={handleAdd}>
        Crear
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setExpanded(false)}>
        ✕
      </Button>
    </div>
  );
};

export default AddSectionButton;
