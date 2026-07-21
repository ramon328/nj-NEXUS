import { useTranslation } from 'react-i18next';
import { MoreVertical, FileText, Plus } from 'lucide-react';
import { Lead, LeadTypes } from '@/types/leads';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { STATUS_COLORS, LeadStatus, LEAD_STATUSES, getTimeAgo } from './leadConstants';
import { LeadOriginBadge } from './leadOrigin';
import LeadMobileCard from './LeadMobileCard';
import { useI18n } from '@/hooks/useI18n';

interface LeadTableProps {
  leads: Lead[];
  totalLeadsCount: number;
  onSelectLead: (lead: Lead) => void;
  onEditNotes: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onCreateLead: () => void;
  /** Muestra la columna "Vendedor" (solo para admins/gerentes). */
  showAssignee?: boolean;
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

export default function LeadTable({
  leads,
  totalLeadsCount,
  onSelectLead,
  onEditNotes,
  onDeleteLead,
  onStatusChange,
  onCreateLead,
  showAssignee = false,
}: LeadTableProps) {
  const { t } = useTranslation('leadsPage');
  const { tCommon } = useI18n();

  if (leads.length === 0) {
    if (totalLeadsCount === 0) {
      return (
        <div className="py-16 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-700 text-[15px] font-medium mb-1">{t('table.emptyState')}</p>
          <p className="text-slate-400 text-[13px] mb-6 max-w-sm">{t('table.emptyStateHint')}</p>
          <Button onClick={onCreateLead} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('table.addFirstLead')}
          </Button>
        </div>
      );
    }
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center">
        <p className="text-slate-500 text-[14px]">{t('table.emptyFilters')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile cards */}
      <div className="lg:hidden space-y-2">
        {leads.map((lead) => (
          <LeadMobileCard
            key={lead.id}
            lead={lead}
            onSelect={onSelectLead}
            onEditNotes={onEditNotes}
            onDelete={onDeleteLead}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 text-left text-[12px] font-medium text-slate-500 uppercase tracking-wider">{t('labels.customer')}</th>
              <th className="px-5 py-3 text-left text-[12px] font-medium text-slate-500 uppercase tracking-wider">{t('labels.contact')}</th>
              <th className="px-5 py-3 text-left text-[12px] font-medium text-slate-500 uppercase tracking-wider">{t('labels.type')}</th>
              <th className="px-5 py-3 text-left text-[12px] font-medium text-slate-500 uppercase tracking-wider">{t('labels.vehicle')}</th>
              <th className="px-5 py-3 text-left text-[12px] font-medium text-slate-500 uppercase tracking-wider">{t('labels.status')}</th>
              {showAssignee && (
                <th className="px-5 py-3 text-left text-[12px] font-medium text-slate-500 uppercase tracking-wider">Vendedor</th>
              )}
              <th className="px-5 py-3 text-center text-[12px] font-medium text-slate-500 uppercase tracking-wider">{t('labels.date')}</th>
              <th className="px-5 py-3 text-right text-[12px] font-medium text-slate-500 uppercase tracking-wider">{tCommon('general.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const colors = STATUS_COLORS[lead.status as LeadStatus] || STATUS_COLORS.pending;
              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="hover:bg-slate-50/60 transition-colors border-b border-slate-50 last:border-b-0 cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <div className="text-[13px] font-medium text-slate-900">
                      {lead.customer?.first_name} {lead.customer?.last_name}
                    </div>
                    <div className="text-[11px] text-slate-500">{lead.customer?.rut || ''}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-[13px] text-slate-700">{lead.customer?.email || '-'}</div>
                    <div className="text-[11px] text-slate-500">{lead.customer?.phone || ''}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-[12px] text-slate-700">{t(`types.${getTypeKey(lead.type)}`)}</span>
                      <LeadOriginBadge lead={lead} />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {lead.vehicle ? (
                      <div>
                        <div className="text-[13px] font-medium text-slate-900">
                          {lead.vehicle.brand?.name} {lead.vehicle.model?.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {lead.vehicle.year} {lead.vehicle.mileage ? `• ${lead.vehicle.mileage.toLocaleString('es-CL')} km` : ''}
                        </div>
                      </div>
                    ) : lead.type === LeadTypes.SEARCH_REQUEST && lead.search_brand ? (
                      <div>
                        <div className="text-[13px] font-medium text-slate-900">
                          {lead.search_brand.name} {lead.search_model?.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{t('labels.searchedVehicle')}</div>
                      </div>
                    ) : (
                      <span className="text-[12px] text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${colors.bg} hover:opacity-90 transition-opacity`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          <span className={`text-[11px] font-medium ${colors.text}`}>
                            {t(`status.${lead.status}`)}
                          </span>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuLabel className="text-xs">{t('statusModal.title')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {LEAD_STATUSES.map((s) => (
                          <DropdownMenuCheckboxItem
                            key={s}
                            checked={lead.status === s}
                            onCheckedChange={() => onStatusChange(lead.id, s)}
                          >
                            <span className={STATUS_COLORS[s].text}>{t(`status.${s}`)}</span>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                  {showAssignee && (
                    <td className="px-5 py-3.5">
                      {lead.assigned_user ? (
                        <span className="text-[12px] text-slate-700">
                          {`${lead.assigned_user.first_name || ''} ${lead.assigned_user.last_name || ''}`.trim()}
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-400 italic">Sin asignar</span>
                      )}
                    </td>
                  )}
                  <td className="px-5 py-3.5 text-center text-[12px] text-slate-500">
                    {new Date(lead.created_at).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => onSelectLead(lead)}>{t('buttons.viewDetails')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditNotes(lead)}>{t('buttons.editNotes')}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onDeleteLead(lead)} className="text-red-600 focus:text-red-600">
                          {t('buttons.deleteLead')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
