import { memo, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, User, Car, Calendar, AlertTriangle } from 'lucide-react';
import type { Task } from '@/types/task';
import {
  PRIORITY_COLORS,
  getCategoryConfig,
  getRelativeTime,
  formatDueDate,
} from './taskConstants';
import { cn } from '@/lib/utils';

interface TaskKanbanCardProps {
  task: Task;
  onClick: () => void;
  isDragOverlay?: boolean;
}

export const TaskKanbanCard = memo(function TaskKanbanCard({
  task,
  onClick,
  isDragOverlay = false,
}: TaskKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleClick = useCallback(() => {
    if (!isDragging) onClick();
  }, [isDragging, onClick]);

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
      ref={isDragOverlay ? undefined : setNodeRef}
      style={isDragOverlay ? undefined : style}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      onClick={handleClick}
      className={cn(
        'bg-white rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all select-none',
        isDragOverlay && 'rotate-[3deg] shadow-[0_12px_28px_rgba(0,0,0,0.2)] scale-[1.03]',
        isDragging && 'z-50',
      )}
    >
      {/* Top row: priority + category */}
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
      <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-1">
        {task.title}
      </p>

      {/* Description preview */}
      {task.description && (
        <p className="text-[12px] text-slate-400 line-clamp-2 mb-1.5">
          {task.description}
        </p>
      )}

      {/* Vehicle */}
      {vehicleLabel && (
        <div className="flex items-center gap-1.5 mb-1.5">
          {task.vehicle?.main_image ? (
            <img
              src={task.vehicle.main_image}
              alt=""
              className="h-5 w-5 rounded object-cover flex-shrink-0"
            />
          ) : (
            <Car className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
          )}
          <span className="text-xs text-slate-600 truncate">{vehicleLabel}</span>
          {task.vehicle?.license_plate && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 flex-shrink-0">
              {task.vehicle.license_plate}
            </span>
          )}
        </div>
      )}

      {/* Due date */}
      {dueInfo && (
        <div className={cn(
          'flex items-center gap-1 mb-1.5 text-xs',
          dueInfo.isOverdue ? 'text-red-600' : 'text-slate-500'
        )}>
          {dueInfo.isOverdue ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Calendar className="h-3 w-3" />
          )}
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
            <span className="text-[11px] text-slate-400 truncate max-w-[100px]">{assigneeName}</span>
          </div>
        )}
      </div>
    </div>
  );
});
