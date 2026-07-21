import { useState, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import posthog from '@/utils/posthog';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, TaskStatus } from '@/types/task';
import { TASK_STATUSES } from './taskConstants';
import { TaskKanbanColumn } from './TaskKanbanColumn';
import { TaskKanbanCard } from './TaskKanbanCard';

const DROP_ANIMATION = { duration: 150, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' };

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const columnVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface TaskKanbanProps {
  tasks: Task[];
  onSelectTask: (t: Task) => void;
  onStatusChange: (id: string, status: TaskStatus) => Promise<{ error: string | null } | undefined> | void;
}

export default function TaskKanban({
  tasks,
  onSelectTask,
  onStatusChange,
}: TaskKanbanProps) {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const overColumnRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const statusSet = useMemo(() => new Set<string>(TASK_STATUSES), []);

  const grouped = useMemo(() => {
    const result: Record<TaskStatus, Task[]> = {
      pending: [],
      in_progress: [],
      pending_approval: [],
      completed: [],
      cancelled: [],
    };
    if (!Array.isArray(tasks)) return result;
    for (const t of tasks) {
      if (result[t.status]) result[t.status].push(t);
    }
    return result;
  }, [tasks]);

  const taskColumnMap = useMemo(() => {
    const map = new Map<string, TaskStatus>();
    for (const status of TASK_STATUSES) {
      for (const t of grouped[status]) {
        map.set(t.id, status);
      }
    }
    return map;
  }, [grouped]);

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    if (Array.isArray(tasks)) for (const t of tasks) map.set(t.id, t);
    return map;
  }, [tasks]);

  const activeTask = activeId ? tasksById.get(activeId) ?? null : null;

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string);
    overColumnRef.current = null;
  }, []);

  const handleDragOver = useCallback(
    (e: DragOverEvent) => {
      if (!e.over) return;
      const target = e.over.id as string;
      if (statusSet.has(target)) {
        overColumnRef.current = target;
      } else {
        const cardColumn = taskColumnMap.get(target);
        if (cardColumn) overColumnRef.current = cardColumn;
      }
    },
    [statusSet, taskColumnMap],
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const draggedId = e.active.id as string;
      const lastTarget = overColumnRef.current;

      setActiveId(null);
      overColumnRef.current = null;

      if (!e.over && !lastTarget) return;

      const sourceColumn = taskColumnMap.get(draggedId);
      if (!sourceColumn) return;

      let targetColumn: string | null = null;
      if (e.over) {
        const overId = e.over.id as string;
        if (statusSet.has(overId)) {
          targetColumn = overId;
        } else {
          targetColumn = taskColumnMap.get(overId) ?? null;
        }
      }
      if (!targetColumn) targetColumn = lastTarget;

      if (targetColumn && targetColumn !== sourceColumn) {
        posthog.capture({
          distinctId: user?.id || 'anonymous',
          event: 'task_dragged',
          properties: {
            from_status: sourceColumn,
            to_status: targetColumn,
          },
        });
        onStatusChange(draggedId, targetColumn as TaskStatus);
      }
    },
    [taskColumnMap, statusSet, onStatusChange, user?.id],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    overColumnRef.current = null;
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <motion.div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory lg:snap-none h-full px-4 sm:px-6 lg:px-8 py-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {TASK_STATUSES.map((status) => (
          <motion.div
            key={status}
            className="min-w-[280px] flex-shrink-0 sm:flex-1 h-full snap-center"
            variants={columnVariants}
          >
            <TaskKanbanColumn
              status={status}
              tasks={grouped[status]}
              onSelectTask={onSelectTask}
            />
          </motion.div>
        ))}
      </motion.div>

      <DragOverlay dropAnimation={DROP_ANIMATION}>
        {activeTask ? (
          <TaskKanbanCard
            task={activeTask}
            onClick={() => {}}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
