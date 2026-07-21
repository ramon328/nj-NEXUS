import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import { Lead, LeadTypes } from '@/types/leads';
import { STATUS_COLORS, LeadStatus, getTimeAgo, getLeadInitials } from './leadConstants';
import { LeadOriginBadge } from './leadOrigin';

interface LeadKanbanCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  isDragOverlay?: boolean;
}

export default function LeadKanbanCard({ lead, onSelect, isDragOverlay }: LeadKanbanCardProps) {
  const { t } = useTranslation('leadsPage');
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, disabled: isDragOverlay });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const colors = STATUS_COLORS[lead.status as LeadStatus] || STATUS_COLORS.pending;
  const initials = getLeadInitials(lead.customer?.first_name, lead.customer?.last_name);
  const timeAgo = getTimeAgo(lead.created_at, t);

  const vehicleLabel = lead.vehicle
    ? `${lead.vehicle.brand?.name || ''} ${lead.vehicle.model?.name || ''}`
    : lead.type === LeadTypes.SEARCH_REQUEST && lead.search_brand
    ? `${lead.search_brand.name || ''} ${lead.search_model?.name || ''}`
    : null;

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={!isDragOverlay ? style : undefined}
      {...(!isDragOverlay ? attributes : {})}
      {...(!isDragOverlay ? listeners : {})}
      onClick={() => onSelect(lead)}
      className={`
        bg-white rounded-xl p-3 cursor-grab active:cursor-grabbing
        shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60
        transition-all duration-150 hover:shadow-[0_3px_12px_-3px_rgba(0,0,0,0.1)] hover:scale-[1.01]
        ${isDragOverlay ? 'rotate-[3deg] shadow-[0_12px_28px_-6px_rgba(0,0,0,0.18)] scale-[1.03]' : ''}
      `}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[11px] font-semibold text-slate-600 shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-slate-900 tracking-tight truncate">
            {lead.customer?.first_name} {lead.customer?.last_name}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {lead.customer?.email || lead.customer?.phone || ''}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1 gap-1">
        <div className="flex items-center gap-1 min-w-0 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${colors.bg} text-[10px] font-medium ${colors.text}`}>
            {t(`types.${getTypeKey(lead.type)}`)}
          </span>
          <LeadOriginBadge lead={lead} />
        </div>
        <span className="text-[10px] text-slate-400 shrink-0">{timeAgo}</span>
      </div>

      {vehicleLabel && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-500 truncate">
            {vehicleLabel.trim()}
          </p>
        </div>
      )}
    </div>
  );
}

function getTypeKey(type: LeadTypes): string {
  const map: Record<string, string> = {
    [LeadTypes.BUY_DIRECT]: 'buyDirect',
    [LeadTypes.BUY_CONSIGNMENT]: 'buyConsignment',
    [LeadTypes.SEARCH_REQUEST]: 'searchRequest',
    [LeadTypes.SELL_VEHICLE]: 'sellVehicle',
    [LeadTypes.SELL_FINANCING]: 'sellFinancing',
    [LeadTypes.SELL_TRANSFER]: 'sellTransfer',
    [LeadTypes.CONTACT_GENERAL]: 'contactGeneral',
  };
  return map[type] || type;
}
