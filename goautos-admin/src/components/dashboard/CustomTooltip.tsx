
import React from 'react';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number) => string;
  multiLine?: boolean;
  labels?: Record<string, string>;
}

const CustomTooltip = ({ active, payload, label, formatter, multiLine, labels }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-white/95 backdrop-blur-lg shadow-[0_8px_30px_-4px_rgba(0,0,0,0.15)] border border-slate-200/60 px-3.5 py-2.5 space-y-0.5">
        <p className="text-[12px] font-semibold text-slate-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-[12px] font-medium flex items-center gap-1.5" style={{ color: entry.color }}>
            {multiLine && (
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            )}
            {multiLine
              ? `${labels?.[entry.dataKey] || entry.name}: ${entry.value.toLocaleString()}`
              : formatter ? formatter(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

export default CustomTooltip;
