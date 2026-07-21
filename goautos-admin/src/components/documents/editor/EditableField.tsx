import React, { useState, useRef, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseAmount } from '@/types/document-editor';

interface EditableFieldProps {
  value: string;
  fieldKey: string;
  onSave: (key: string, value: string) => void;
  className?: string;
  isOverridden?: boolean;
  type?: 'text' | 'currency';
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  fieldKey,
  onSave,
  className,
  isOverridden,
  type = 'text',
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const sanitizeCurrency = (raw: string): string => {
    const cleaned = raw.replace(/[^0-9-]/g, '');
    return cleaned || '0';
  };

  const commit = () => {
    setEditing(false);
    const finalValue = type === 'currency' ? sanitizeCurrency(draft) : draft;
    if (finalValue !== value) {
      onSave(fieldKey, finalValue);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={cn(
          'bg-blue-50 border border-blue-300 rounded px-1.5 py-0.5 outline-none text-[#0f172a] w-full',
          className,
        )}
        style={{ fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'inherit' }}
        inputMode={type === 'currency' ? 'numeric' : undefined}
        placeholder={type === 'currency' ? 'Ingresa solo números' : undefined}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        'group/field relative cursor-pointer rounded px-1 -mx-1 transition-colors hover:bg-blue-50/80',
        isOverridden && 'bg-amber-50 ring-1 ring-amber-200',
        className,
      )}
      title="Click para editar"
    >
      {type === 'currency' ? formatCurrency(parseAmount(value)) : value}
      <Pencil className="inline-block ml-1 h-3 w-3 text-blue-400 opacity-0 group-hover/field:opacity-100 transition-opacity" />
    </span>
  );
};

export default EditableField;
