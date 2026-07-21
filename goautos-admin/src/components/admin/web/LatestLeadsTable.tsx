import { LatestLead } from '@/hooks/admin/useLatestLeads';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, MessageSquare } from 'lucide-react';

interface LatestLeadsTableProps {
  leads: LatestLead[];
  loading: boolean;
}

const typeConfig: Record<string, { es: string; en: string; color: string; bg: string }> = {
  'buy-direct': { es: 'Compra', en: 'Purchase', color: 'text-blue-700', bg: 'bg-blue-50' },
  'buy-consignment': { es: 'Consignación', en: 'Consignment', color: 'text-amber-700', bg: 'bg-amber-50' },
  'search-request': { es: 'Búsqueda', en: 'Search', color: 'text-purple-700', bg: 'bg-purple-50' },
  'sell-vehicle': { es: 'Vender', en: 'Sell', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  'sell-financing': { es: 'Financiam.', en: 'Financing', color: 'text-cyan-700', bg: 'bg-cyan-50' },
  'sell-transfer': { es: 'Traspaso', en: 'Transfer', color: 'text-orange-700', bg: 'bg-orange-50' },
  'contact-general': { es: 'Contacto', en: 'Contact', color: 'text-slate-700', bg: 'bg-slate-100' },
};

const statusConfig: Record<string, { es: string; en: string; color: string; bg: string; dot: string }> = {
  pending: { es: 'Pendiente', en: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  assigned: { es: 'Asignado', en: 'Assigned', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  completed: { es: 'Completado', en: 'Completed', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  cancelled: { es: 'Cancelado', en: 'Cancelled', color: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
};

export const LatestLeadsTable = ({ leads, loading }: LatestLeadsTableProps) => {
  const { i18n } = useTranslation();
  const isEs = i18n.language?.toLowerCase().startsWith('es');
  const dv = (esStr: string, en: string) => isEs ? esStr : en;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-4 w-32 bg-slate-100 animate-pulse rounded-lg" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Users className="w-[18px] h-[18px] text-slate-900" />
            <h3 className="text-[15px] font-semibold text-slate-900">{dv('Últimos Leads', 'Latest Leads')}</h3>
            <span className="bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {leads.length}
            </span>
          </div>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="px-5 pb-5">
          <div className="text-center py-8 rounded-xl bg-slate-50/50">
            <p className="text-[13px] text-slate-400">
              {dv('No hay leads en el período seleccionado', 'No leads in the selected period')}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Desktop header */}
          <div className="hidden lg:grid grid-cols-[0.8fr_1.3fr_0.7fr_1.2fr_0.7fr_1fr] px-5 py-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider border-t border-slate-100">
            <span>{dv('Fecha', 'Date')}</span>
            <span>{dv('Cliente', 'Customer')}</span>
            <span>{dv('Tipo', 'Type')}</span>
            <span>{dv('Vehículo', 'Vehicle')}</span>
            <span>{dv('Estado', 'Status')}</span>
            <span>{dv('Notas', 'Notes')}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {leads.map((lead) => {
              const customerName = lead.customer
                ? `${lead.customer.first_name || ''} ${lead.customer.last_name || ''}`.trim() || dv('Sin nombre', 'No name')
                : dv('Sin cliente', 'No customer');
              const customerContact = lead.customer
                ? [lead.customer.email, lead.customer.phone].filter(Boolean).join(' · ')
                : '';

              let vehicleInfo = '-';
              if (lead.vehicle) {
                vehicleInfo = `${lead.vehicle.brand?.name || ''} ${lead.vehicle.model?.name || ''} ${lead.vehicle.year}`.trim();
              } else if (lead.search_brand || lead.search_model) {
                vehicleInfo = `${lead.search_brand?.name || ''} ${lead.search_model?.name || ''}`.trim() || dv('Búsqueda general', 'General search');
              } else if (lead.search_text) {
                vehicleInfo = lead.search_text;
              }

              const tCfg = typeConfig[lead.type] || { es: lead.type, en: lead.type, color: 'text-slate-700', bg: 'bg-slate-100' };
              const sCfg = statusConfig[lead.status] || { es: lead.status, en: lead.status, color: 'text-slate-700', bg: 'bg-slate-100', dot: 'bg-slate-500' };

              return (
                <div key={lead.id}>
                  {/* Desktop row */}
                  <div className="hidden lg:grid grid-cols-[0.8fr_1.3fr_0.7fr_1.2fr_0.7fr_1fr] items-center px-5 py-3 hover:bg-slate-50/50 transition-colors">
                    <span className="text-[12px] text-slate-500">
                      {format(new Date(lead.created_at), 'dd/MM/yy HH:mm', {
                        locale: isEs ? es : undefined,
                      })}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-slate-900 truncate">{customerName}</p>
                      {customerContact && (
                        <p className="text-[11px] text-slate-400 truncate">{customerContact}</p>
                      )}
                    </div>
                    <span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${tCfg.color} ${tCfg.bg}`}>
                        {isEs ? tCfg.es : tCfg.en}
                      </span>
                    </span>
                    <span className="text-[13px] text-slate-600 truncate">{vehicleInfo}</span>
                    <span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${sCfg.color} ${sCfg.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`} />
                        {isEs ? sCfg.es : sCfg.en}
                      </span>
                    </span>
                    <span className="text-[12px] text-slate-400 truncate flex items-center gap-1">
                      {lead.notes ? (
                        <>
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          <span className="truncate">{lead.notes}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>

                  {/* Mobile card */}
                  <div className="lg:hidden px-5 py-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-medium text-slate-900 truncate">{customerName}</p>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${sCfg.color} ${sCfg.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sCfg.dot}`} />
                        {isEs ? sCfg.es : sCfg.en}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${tCfg.color} ${tCfg.bg}`}>
                        {isEs ? tCfg.es : tCfg.en}
                      </span>
                      <span className="text-[12px] text-slate-500 truncate">{vehicleInfo}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] text-slate-400">
                        {format(new Date(lead.created_at), 'dd/MM HH:mm', {
                          locale: isEs ? es : undefined,
                        })}
                      </span>
                    </div>
                    {lead.notes && (
                      <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 shrink-0" />
                        {lead.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
