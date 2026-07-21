import React, { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditableTextAreaProps {
  value: string;
  fieldKey: string;
  onSave: (key: string, value: string) => void;
  className?: string;
  isOverridden?: boolean;
  fontSize?: number;
}

const EditableTextArea: React.FC<EditableTextAreaProps> = ({
  value,
  fieldKey,
  onSave,
  className,
  isOverridden,
  fontSize,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) {
      onSave(fieldKey, draft);
    }
  };

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={e => {
          setDraft(e.target.value);
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
          }
        }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={cn(
          'bg-blue-50 border border-blue-300 rounded px-2 py-1.5 outline-none text-[#475569] w-full resize-none',
          className,
        )}
        style={{ fontSize: fontSize ? `${fontSize}pt` : undefined }}
      />
    );
  }

  return (
    <p
      onClick={() => setEditing(true)}
      className={cn(
        'group/field relative cursor-pointer rounded px-1.5 -mx-1.5 py-0.5 transition-colors hover:bg-blue-50/80 whitespace-pre-wrap',
        isOverridden && 'bg-amber-50 ring-1 ring-amber-200',
        className,
      )}
      style={{ fontSize: fontSize ? `${fontSize}pt` : undefined }}
      title="Click para editar"
    >
      {value}
      <Pencil className="inline-block ml-1 h-3 w-3 text-blue-400 opacity-0 group-hover/field:opacity-100 transition-opacity" />
    </p>
  );
};

export default EditableTextArea;
