import React from 'react';

export type StatusType = 'unknown' | 'completed' | 'overdue' | 'current';

export type StatusBadgeProps = {
  status: StatusType;
  label: string;
  icon: string;
  color: string;
};

const styleMap: Record<StatusType, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  overdue: 'bg-red-50 text-red-700 border-red-200/60',
  current: 'bg-blue-50 text-blue-700 border-blue-200/60',
  unknown: 'bg-slate-50 text-slate-500 border-slate-200/60',
};

const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${styleMap[status] || styleMap.unknown}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
