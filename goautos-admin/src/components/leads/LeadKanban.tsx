import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Lead } from '@/types/leads';
import { LeadStatus, LEAD_STATUSES } from './leadConstants';
import LeadKanbanColumn from './LeadKanbanColumn';
import LeadKanbanCard from './LeadKanbanCard';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/utils/posthog';

interface LeadKanbanProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
}

export default function LeadKanban({ leads, onSelectLead, onStatusChange }: LeadKanbanProps) {
  const { clientId } = useAuth();
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const columnLeads = useMemo(() => {
    const groups: Record<LeadStatus, Lead[]> = {
      pending: [],
      assigned: [],
      completed: [],
      cancelled: [],
    };
    leads.forEach((lead) => {
      const status = lead.status as LeadStatus;
      if (groups[status]) groups[status].push(lead);
    });
    return groups;
  }, [leads]);

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    // over.id could be a column status or another card id
    let targetStatus: LeadStatus | undefined;

    if (LEAD_STATUSES.includes(over.id as LeadStatus)) {
      targetStatus = over.id as LeadStatus;
    } else {
      // Find which column the target card belongs to
      const targetLead = leads.find((l) => l.id === String(over.id));
      if (targetLead) {
        targetStatus = targetLead.status as LeadStatus;
      }
    }

    if (targetStatus && targetStatus !== lead.status) {
      posthog.capture({
        distinctId: clientId ? String(clientId) : 'anonymous',
        event: 'lead_dragged',
        properties: { lead_id: leadId, from_status: lead.status, to_status: targetStatus },
      });
      onStatusChange(leadId, targetStatus);
    }
  }

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };

  const colVariant = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory lg:snap-none items-start h-full"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {LEAD_STATUSES.map((status) => (
          <motion.div key={status} variants={colVariant} className="sm:flex-1 min-w-[280px] flex-shrink-0 h-full">
            <LeadKanbanColumn
              status={status}
              leads={columnLeads[status]}
              onSelectLead={onSelectLead}
            />
          </motion.div>
        ))}
      </motion.div>

      <DragOverlay>
        {activeLead && (
          <LeadKanbanCard lead={activeLead} onSelect={() => {}} isDragOverlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}
