import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomRow } from '@/types/document-editor';

interface AddRowButtonProps {
  sectionId: string;
  sectionType?: 'grid' | 'financial';
  onAdd: (row: CustomRow) => void;
}

const AddRowButton: React.FC<AddRowButtonProps> = ({ sectionId, sectionType = 'grid', onAdd }) => {
  const [expanded, setExpanded] = useState(false);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');

  const handleAdd = () => {
    if (!label.trim()) return;
    // En filas financieras el usuario suele escribir "1.500.000" o "$1.500.000";
    // se guarda solo dígitos para que Number() no lo convierta en $0.
    const cleanValue = sectionType === 'financial'
      ? (value.replace(/[^0-9-]/g, '') || '0')
      : value.trim();
    onAdd({
      id: `cr_${sectionId}_${Date.now()}`,
      sectionId,
      label: label.trim(),
      value: cleanValue,
      type: sectionType === 'financial' ? 'currency' : 'text',
    });
    setLabel('');
    setValue('');
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1 text-[9pt] text-blue-500 hover:text-blue-700 mt-1.5 transition-colors"
      >
        <Plus className="h-3 w-3" />
        Agregar campo
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-2 bg-blue-50/50 rounded-md p-1.5">
      <Input
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="Nombre del campo"
        className="h-7 text-xs flex-1"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') setExpanded(false);
        }}
      />
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={sectionType === 'financial' ? 'Monto' : 'Valor'}
        className="h-7 text-xs w-28"
        onKeyDown={e => {
          if (e.key === 'Enter') handleAdd();
          if (e.key === 'Escape') setExpanded(false);
        }}
      />
      <Button size="sm" className="h-7 text-xs px-2" onClick={handleAdd}>
        <Plus className="h-3 w-3" />
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setExpanded(false)}>
        ✕
      </Button>
    </div>
  );
};

export default AddRowButton;
