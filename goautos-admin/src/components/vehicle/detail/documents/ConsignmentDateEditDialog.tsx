import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConsignmentDateEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number;
  currentDate?: string;
  onSuccess: () => void;
}

const ConsignmentDateEditDialog: React.FC<ConsignmentDateEditDialogProps> = ({
  isOpen,
  onClose,
  documentId,
  currentDate,
  onSuccess,
}) => {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && currentDate) {
      setDate(new Date(currentDate));
    } else if (isOpen) {
      setDate(new Date());
    }
  }, [isOpen, currentDate]);

  const handleSubmit = async () => {
    if (!date) {
      toast.error('Debe seleccionar una fecha');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('vehicles_documents')
        .update({ document_date: date.toISOString() })
        .eq('id', documentId);

      if (error) {
        console.error('Error updating document date:', error);
        toast.error('Error al actualizar la fecha del documento');
        return;
      }

      toast.success('Fecha actualizada correctamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating document date:', error);
      toast.error('Error al actualizar la fecha del documento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Editar fecha del contrato</DialogTitle>
        </DialogHeader>

        <div className='py-4'>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Fecha del contrato
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className='mr-2 h-4 w-4' />
                {date ? (
                  format(date, 'PPP', { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='single'
                selected={date}
                onSelect={setDate}
                locale={es}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConsignmentDateEditDialog;
