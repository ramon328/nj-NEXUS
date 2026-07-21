import React from 'react';
import { cn } from '@/lib/utils';

export type TimeRange = '7days' | '30days' | '6months' | '1year' | 'all';

interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
}

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '7days', label: '7D' },
  { value: '30days', label: '30D' },
  { value: '6months', label: '6M' },
  { value: '1year', label: '1A' },
  { value: 'all', label: 'Todo' },
];

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  selectedRange,
  onRangeChange,
}) => {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-full bg-slate-100">
      {timeRanges.map((range) => {
        const isSelected = selectedRange === range.value;

        return (
          <button
            key={range.value}
            onClick={() => onRangeChange(range.value)}
            className={cn(
              'px-2.5 py-1 text-[11px] sm:text-[12px] font-medium rounded-full transition-all whitespace-nowrap',
              isSelected
                ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                : 'text-slate-500 hover:bg-slate-200/60'
            )}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
};

export default TimeRangeSelector;
