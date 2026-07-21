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
import type { VehicleRequest } from '@/hooks/useVehicleRequests';
import { REQUEST_STATUSES, type RequestStatus } from './requestConstants';
import { RequestKanbanColumn } from './RequestKanbanColumn';
import { RequestKanbanCard } from './RequestKanbanCard';
import StatusChangeDialog from './StatusChangeDialog';

const DROP_ANIMATION = { duration: 150, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' };

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const columnVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface RequestKanbanProps {
  requests: VehicleRequest[];
  onSelectRequest: (r: VehicleRequest) => void;
  onStatusChange: (id: string, status: RequestStatus, note?: string) => void;
  canManage: boolean;
}

export default function RequestKanban({
  requests,
  onSelectRequest,
  onStatusChange,
  canManage,
}: RequestKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const overColumnRef = useRef<string | null>(null);
  const [pendingChange, setPendingChange] = useState<{
    id: string;
    from: RequestStatus;
    to: RequestStatus;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const statusSet = useMemo(() => new Set<string>(REQUEST_STATUSES), []);

  // Group requests by status
  const grouped = useMemo(() => {
    const result: Record<RequestStatus, VehicleRequest[]> = {
      open: [],
      in_progress: [],
      fulfilled: [],
      cancelled: [],
    };
    for (const r of requests) {
      const key = (r.status === 'expired' ? 'cancelled' : r.status) as RequestStatus;
      if (result[key]) result[key].push(r);
    }
    return result;
  }, [requests]);

  // Map request id → current status column
  const requestColumnMap = useMemo(() => {
    const map = new Map<string, RequestStatus>();
    for (const status of REQUEST_STATUSES) {
      for (const r of grouped[status]) {
        map.set(r.id, status);
      }
    }
    return map;
  }, [grouped]);

  const requestsById = useMemo(() => {
    const map = new Map<string, VehicleRequest>();
    for (const r of requests) map.set(r.id, r);
    return map;
  }, [requests]);

  const activeRequest = activeId ? requestsById.get(activeId) ?? null : null;

  /* ─── Drag handlers ─── */

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(e.active.id as string);
    overColumnRef.current = null;
  }, []);

  const handleDragOver = useCallback(
    (e: DragOverEvent) => {
      if (!e.over) return;
      const target = e.over.id as string;
      // If target is a column id, track it
      if (statusSet.has(target)) {
        overColumnRef.current = target;
      } else {
        // Target is a card — figure out which column it belongs to
        const cardColumn = requestColumnMap.get(target);
        if (cardColumn) overColumnRef.current = cardColumn;
      }
    },
    [statusSet, requestColumnMap],
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const draggedId = e.active.id as string;
      const lastTarget = overColumnRef.current;

      setActiveId(null);
      overColumnRef.current = null;

      if (!e.over && !lastTarget) return;

      const sourceColumn = requestColumnMap.get(draggedId);
      if (!sourceColumn) return;

      // Determine target column
      let targetColumn: string | null = null;
      if (e.over) {
        const overId = e.over.id as string;
        if (statusSet.has(overId)) {
          targetColumn = overId;
        } else {
          targetColumn = requestColumnMap.get(overId) ?? null;
        }
      }
      if (!targetColumn) targetColumn = lastTarget;

      if (targetColumn && targetColumn !== sourceColumn) {
        // Block cancelled if user lacks permission
        if (targetColumn === 'cancelled' && !canManage) return;
        setPendingChange({
          id: draggedId,
          from: sourceColumn,
          to: targetColumn as RequestStatus,
        });
      }
    },
    [requestColumnMap, statusSet, canManage],
  );

  const handleConfirmChange = useCallback(
    (note?: string) => {
      if (pendingChange) {
        onStatusChange(pendingChange.id, pendingChange.to, note);
        setPendingChange(null);
      }
    },
    [pendingChange, onStatusChange],
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
        {REQUEST_STATUSES.map((status) => (
          <motion.div
            key={status}
            className="min-w-[280px] flex-shrink-0 sm:flex-1 h-full snap-center"
            variants={columnVariants}
          >
            <RequestKanbanColumn
              status={status}
              requests={grouped[status]}
              onSelectRequest={onSelectRequest}
            />
          </motion.div>
        ))}
      </motion.div>

      <DragOverlay dropAnimation={DROP_ANIMATION}>
        {activeRequest ? (
          <RequestKanbanCard
            request={activeRequest}
            onClick={() => {}}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>

      {pendingChange && (
        <StatusChangeDialog
          open={!!pendingChange}
          onOpenChange={(open) => { if (!open) setPendingChange(null); }}
          fromStatus={pendingChange.from}
          toStatus={pendingChange.to}
          onConfirm={handleConfirmChange}
        />
      )}
    </DndContext>
  );
}
