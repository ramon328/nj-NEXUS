import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lead, LeadTypes } from '@/types/leads';
import { MoreVertical, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { STATUS_COLORS, LeadStatus, LEAD_STATUSES, getTimeAgo, getLeadInitials } from './leadConstants';
import { LeadOriginBadge } from './leadOrigin';

interface LeadMobileCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  onEditNotes: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
}

export default function LeadMobileCard({ lead, onSelect, onEditNotes, onDelete, onStatusChange }: LeadMobileCardProps) {
  const { t } = useTranslation('leadsPage');
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false);
  const colors = STATUS_COLORS[lead.status as LeadStatus] || STATUS_COLORS.pending;
  const initials = getLeadInitials(lead.customer?.first_name, lead.customer?.last_name);
  const timeAgo = getTimeAgo(lead.created_at, t);

  return (
    <>
      <div
        onClick={() => onSelect(lead)}
        className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 transition-all duration-200 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)] active:scale-[0.99] cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[13px] font-semibold text-slate-600 tracking-tight">
              {initials}
            </div>
            <div>
              <p className="text-[14px] font-medium text-slate-900 tracking-tight">
                {lead.customer?.first_name} {lead.customer?.last_name}
              </p>
              <p className="text-[12px] text-slate-500">{timeAgo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setStatusDrawerOpen(true)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${colors.bg} border ${colors.ring.replace('ring-', 'border-')}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              <span className={`text-[11px] font-medium ${colors.text}`}>
                {t(`status.${lead.status}`)}
              </span>
              <ChevronDown className={`w-3 h-3 ${colors.text} opacity-60`} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[12px] flex-wrap">
          <span className="text-slate-500">{t(`types.${getTypeKey(lead.type)}`)}</span>
          <LeadOriginBadge lead={lead} />
          {lead.vehicle && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-slate-700 font-medium truncate">
                {lead.vehicle.brand?.name} {lead.vehicle.model?.name}
              </span>
            </>
          )}
          {!lead.vehicle && lead.type === LeadTypes.SEARCH_REQUEST && lead.search_brand && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-slate-700 font-medium truncate">
                {lead.search_brand.name} {lead.search_model?.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center justify-end mt-3 gap-1" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onSelect(lead)}>
                {t('buttons.viewDetails')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditNotes(lead)}>
                {t('buttons.editNotes')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(lead)} className="text-red-600 focus:text-red-600">
                {t('buttons.deleteLead')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status change drawer */}
      <Drawer open={statusDrawerOpen} onOpenChange={setStatusDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="px-5 pb-3 pt-2">
            <p className="text-[15px] font-semibold text-slate-900">{t('statusModal.title')}</p>
          </div>
          <div
            className="px-5 pb-4 space-y-1"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            {LEAD_STATUSES.map((s) => {
              const sColors = STATUS_COLORS[s];
              const isActive = lead.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => { onStatusChange(lead.id, s); setStatusDrawerOpen(false); }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] transition-colors ${
                    isActive ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600 active:bg-slate-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${sColors.dot}`} />
                  <span className="flex-1 text-left">{t(`status.${s}`)}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
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
