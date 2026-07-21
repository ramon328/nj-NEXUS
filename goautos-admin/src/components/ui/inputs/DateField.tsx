import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Control } from 'react-hook-form';

interface DateFieldProps {
  name: string;
  control: Control<any>;
  label: string;
  placeholder?: string;
}

const months = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 15 }, (_, i) => currentYear + i);

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

function MonthYearPicker({ value, onChange }) {
  const [month, setMonth] = React.useState(
    value ? new Date(value).getMonth() : new Date().getMonth()
  );
  const [year, setYear] = React.useState(
    value ? new Date(value).getFullYear() : currentYear
  );
  const [day, setDay] = React.useState(value ? new Date(value).getDate() : 1);

  React.useEffect(() => {
    // Ajustar el día si el mes/año cambian y el día actual no existe en ese mes
    const daysInMonth = getDaysInMonth(month, year);
    if (day > daysInMonth) {
      setDay(daysInMonth);
    }
    // eslint-disable-next-line
  }, [month, year]);

  React.useEffect(() => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;
    onChange && onChange(dateStr);
  }, [month, year, day]);

  const days = Array.from(
    { length: getDaysInMonth(month, year) },
    (_, i) => i + 1
  );

  return (
    <div className='flex gap-1 w-full min-w-0'>
      <div className='relative flex-1 min-w-0'>
        <select
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          className='appearance-none w-full bg-white text-base font-normal px-2 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all shadow-sm hover:bg-sky-50'
        >
          {days.map((d) => (
            <option key={d} value={d} className='text-sm'>
              {d}
            </option>
          ))}
        </select>
        <span className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs'>
          ▼
        </span>
      </div>
      <div className='relative flex-[2] min-w-0'>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className='appearance-none w-full bg-white text-base font-normal px-2 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all shadow-sm hover:bg-sky-50'
        >
          {months.map((m, idx) => (
            <option key={m} value={idx} className='text-sm'>
              {m}
            </option>
          ))}
        </select>
        <span className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs'>
          ▼
        </span>
      </div>
      <div className='relative flex-1 min-w-0'>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className='appearance-none w-full bg-white text-base font-normal px-2 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all shadow-sm hover:bg-sky-50'
        >
          {years.map((y) => (
            <option key={y} value={y} className='text-sm'>
              {y}
            </option>
          ))}
        </select>
        <span className='pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs'>
          ▼
        </span>
      </div>
    </div>
  );
}

const DateField: React.FC<DateFieldProps> = ({
  name,
  control,
  label,
  placeholder = 'Seleccionar fecha',
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className='flex flex-col'>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <MonthYearPicker value={field.value} onChange={field.onChange} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default DateField;
