
import React from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface DateFieldProps {
  label: string;
  date?: string | Date;
  isEditing: boolean;
  onDateChange?: (date: Date | undefined) => void;
}

const DateField: React.FC<DateFieldProps> = ({ 
  label, 
  date, 
  isEditing, 
  onDateChange 
}) => {
  const formattedDate = date 
    ? (typeof date === 'string' 
      ? format(parseISO(date), 'dd/MM/yyyy', { locale: es }) 
      : format(date, 'dd/MM/yyyy', { locale: es }))
    : 'No disponible';

  const selectedDate = date 
    ? (typeof date === 'string' ? parseISO(date) : date)
    : undefined;

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {isEditing && onDateChange ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal h-7 text-xs"
            >
              <Calendar className="mr-1.5 h-3 w-3" />
              {selectedDate ? (
                format(selectedDate, 'dd/MM/yyyy', { locale: es })
              ) : (
                'Seleccionar fecha'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={onDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : (
        <p className="font-medium">{formattedDate}</p>
      )}
    </div>
  );
};

export default DateField;
