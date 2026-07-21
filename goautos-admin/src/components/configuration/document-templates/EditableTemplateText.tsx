import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Pencil } from 'lucide-react';

interface EditableTemplateTextProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  preview?: boolean;
}

const EditableTemplateText = ({
  value,
  onChange,
  label,
  preview = false,
}: EditableTemplateTextProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleSave = () => {
    onChange(tempValue);
    setIsEditing(false);
  };

  // Update tempValue when value prop changes
  React.useEffect(() => {
    setTempValue(value);
  }, [value]);

  if (preview) {
    return (
      <div className='relative group'>
        <div className='whitespace-pre-wrap'>
          {value || 'Haga clic para editar'}
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity'
          onClick={() => setIsEditing(true)}
        >
          <Pencil className='h-4 w-4' />
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isEditing} onOpenChange={setIsEditing}>
      <DialogTrigger asChild>
        <div className='cursor-pointer hover:bg-accent/50 p-2 rounded relative group'>
          <div className='whitespace-pre-wrap'>
            {value || 'Haga clic para editar'}
          </div>
          <Button
            variant='ghost'
            size='icon'
            className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity'
          >
            <Pencil className='h-4 w-4' />
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {label}</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <Textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            rows={10}
            className='min-h-[200px]'
          />
          <Button onClick={handleSave} className='w-full'>
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditableTemplateText;
