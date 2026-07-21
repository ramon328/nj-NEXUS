import React from 'react';
import { CalendarDays, List } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'calendar' | 'table';

interface AppointmentsViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const AppointmentsViewToggle: React.FC<AppointmentsViewToggleProps> = ({ value, onChange }) => {
  return (
    <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 gap-0.5">
      <button
        onClick={() => onChange('calendar')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all',
          value === 'calendar'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        )}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Calendario
      </button>
      <button
        onClick={() => onChange('table')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all',
          value === 'table'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        )}
      >
        <List className="h-3.5 w-3.5" />
        Tabla
      </button>
    </div>
  );
};

export default AppointmentsViewToggle;
