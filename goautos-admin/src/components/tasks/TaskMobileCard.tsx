import { memo } from 'react';
import { Car, Clock, User, Calendar, AlertTriangle } from 'lucide-react';
import type { Task } from '@/types/task';
import {
  PRIORITY_COLORS,
  getCategoryConfig,
  getRelativeTime,
  formatDueDate,
} from './taskConstants';
import { cn } from '@/lib/utils';

interface TaskMobileCardProps {
  task: Task;
  onClick: () => void;
}

export const TaskMobileCard = memo(function TaskMobileCard({
  task,
  onClick,
}: TaskMobileCardProps) {
  const priorityConfig = PRIORITY_COLORS[task.priority];
  const categoryConfig = getCategoryConfig(task.category);
  const vehicleLabel = task.vehicle
    ? `${task.vehicle.year} ${task.vehicle.brand?.name || ''} ${task.vehicle.model?.name || ''}`.trim()
    : null;
  const dueInfo = formatDueDate(task.due_date);
  const assigneeName = task.assigned_user
    ? `${task.assigned_user.first_name} ${task.assigned_user.last_name}`.trim()
    : task.assigned_role?.name || null;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-3.5 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform"
    >
      {/* Tags */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', priorityConfig.bg, priorityConfig.text)}>
          {priorityConfig.label}
        </span>
        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', categoryConfig.color)}>
          {categoryConfig.label}
        </span>
        {task.source_type === 'checklist' && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
            Checklist
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-1">{task.title}</p>

      {/* Description preview */}
      {task.description && (
        <p className="text-[12px] text-slate-400 line-clamp-2 mb-1.5">
          {task.description}
        </p>
      )}

      {/* Vehicle */}
      {vehicleLabel && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <Car className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-600 truncate">{vehicleLabel}</span>
        </div>
      )}

      {/* Due date */}
      {dueInfo && (
        <div className={cn('flex items-center gap-1 mb-1.5 text-xs', dueInfo.isOverdue ? 'text-red-600' : 'text-slate-500')}>
          {dueInfo.isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
          <span>{dueInfo.label}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-slate-300" />
          <span className="text-[11px] text-slate-400">{getRelativeTime(task.created_at)}</span>
        </div>
        {assigneeName && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-slate-300" />
            <span className="text-[11px] text-slate-400 truncate max-w-[120px]">{assigneeName}</span>
          </div>
        )}
      </div>
    </div>
  );
});
