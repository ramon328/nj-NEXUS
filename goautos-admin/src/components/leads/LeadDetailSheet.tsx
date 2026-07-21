import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Phone, CreditCard, Car, Search, DollarSign, FileText, Pencil, Trash2, ChevronDown, Check, X, ClipboardList, User as UserIcon, ExternalLink } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/useI18n';
import { toast } from '@/hooks/use-toast';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AssignableSeller } from '@/hooks/useAssignableSellers';
import { Lead, LeadTypes } from '@/types/leads';
import { Vehicle } from '@/types/vehicle';
import { CreateVehicleRequestData } from '@/hooks/useVehicleRequests';
import { STATUS_COLORS, LeadStatus, LEAD_STATUSES, getTimeAgo, getLeadFullName } from './leadConstants';
import { getLeadOrigin, LeadOriginBadge } from './leadOrigin';
import LeadTimeline from './LeadTimeline';
import { useLeadActivityLog } from '@/hooks/useLeadActivityLog';

interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onUpdateNotes: (leadId: string, notes: string) => Promise<boolean>;
  onDeleteLead: (lead: Lead) => void;
  onCreateRequest?: (data: CreateVehicleRequestData) => Promise<{ error: string | null }>;
  /** Si true, muestra selector para (re)asignar el lead a un vendedor. */
  canAssign?: boolean;
  /** Vendedores disponibles para asignar. */
  sellers?: AssignableSeller[];
  onAssign?: (leadId: string, assignedTo: number | null) => Promise<boolean>;
  /** Modo pool: el vendedor puede tomar leads sin asignar y soltar los suyos. */
  canClaim?: boolean;
  currentUserId?: number | null;
  onClaim?: (leadId: string) => Promise<boolean>;
  onRelease?: (leadId: string) => Promise<boolean>;
}

const UNASSIGNED = 'unassigned';

function sellerName(s?: { first_name?: string | null; last_name?: string | null } | null) {
  if (!s) return '';
  return `${s.first_name || ''} ${s.last_name || ''}`.trim();
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

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-400" />
        <h4 className="text-[13px] font-semibold text-slate-700 tracking-tight">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-50 last:border-b-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="text-[12px] font-medium text-slate-900 text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

export default function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  onStatusChange,
  onUpdateNotes,
  onDeleteLead,
  onCreateRequest,
  canAssign = false,
  sellers = [],
  onAssign,
  canClaim = false,
  currentUserId = null,
  onClaim,
  onRelease,
}: LeadDetailSheetProps) {
  const { t } = useTranslation('leadsPage');
  const { tCommon } = useI18n();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [claimingPool, setClaimingPool] = useState(false);
  // Historial del lead — solo se consulta cuando el sheet está abierto.
  const { entries: activity, isLoading: activityLoading, refetch: refetchActivity } = useLeadActivityLog(lead?.id, open && !!lead);

  // Marca el lead como "visto" cuando lo abre su DUEÑO (alimenta la regla de
  // inactividad de T5: resetea last_seen_at y limpia el flag de nag). Solo el
  // dueño cuenta; la RPC valida que assigned_to = actor.
  useEffect(() => {
    if (!open || !lead?.id) return;
    if (!currentUserId || lead.assigned_to !== currentUserId) return;
    supabase.rpc('touch_lead_seen', { p_lead_id: parseInt(lead.id) }).then(({ error }) => {
      if (error) console.error('touch_lead_seen:', error.message);
    });
  }, [open, lead?.id, lead?.assigned_to, currentUserId]);

  if (!lead) return null;

  const colors = STATUS_COLORS[lead.status as LeadStatus] || STATUS_COLORS.pending;
  const customer = lead.customer;
  const origin = getLeadOrigin(lead);
  const fullName = getLeadFullName(customer?.first_name, customer?.last_name);
  const timeAgo = getTimeAgo(lead.created_at, t);
  const hasSearchParams = lead.search_params && Object.keys(lead.search_params).length > 0;
  // Campos de un formulario configurable del builder (forma nueva, aditiva)
  const customFields = Array.isArray(lead.search_params?.custom_fields)
    ? lead.search_params.custom_fields.filter((f) => f && (f.label || f.value))
    : [];
  // La sección "Criterios de búsqueda" (forma fija) solo se muestra si trae alguno de
  // sus campos conocidos; si el lead es de un formulario custom, se muestra abajo.
  const hasFixedSearch =
    hasSearchParams &&
    !!(
      lead.search_params.brand ||
      lead.search_params.model ||
      lead.search_params.year ||
      lead.search_params.price ||
      lead.search_params.mileage ||
      lead.search_params.max_owners
    );
  const hasFinancing = lead.type === LeadTypes.SELL_FINANCING && lead.financing_data;

  const allVehicles: Vehicle[] = [];
  if (lead.vehicle) allVehicles.push(lead.vehicle);
  if (lead.vehicles?.length) allVehicles.push(...lead.vehicles);

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="right">
        <DrawerContentRight className="bg-[#f5f5f7] p-0 md:min-w-[560px]">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
            {/* Header */}
            <div className="bg-white p-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-[15px] font-semibold text-slate-600">
                  {customer?.first_name?.[0]?.toUpperCase() || '?'}{customer?.last_name?.[0]?.toUpperCase() || ''}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[18px] font-semibold text-slate-900 tracking-tight truncate">{fullName}</h2>
                  <p className="text-[12px] text-slate-500">{timeAgo}</p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Status badge — dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${colors.bg} border ${colors.ring.replace('ring-', 'border-')} hover:opacity-90 transition-opacity`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      <span className={`text-[11px] font-medium ${colors.text}`}>{t(`status.${lead.status}`)}</span>
                      <ChevronDown className={`w-3 h-3 ${colors.text} opacity-60`} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-44">
                    {LEAD_STATUSES.map((s) => {
                      const sColors = STATUS_COLORS[s];
                      const isActive = lead.status === s;
                      return (
                        <DropdownMenuItem
                          key={s}
                          onClick={() => onStatusChange(lead.id, s)}
                          className={`gap-2 text-[12px] ${isActive ? 'font-medium' : ''}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${sColors.dot}`} />
                          <span className="flex-1">{t(`status.${s}`)}</span>
                          {isActive && <Check className="h-3.5 w-3.5 text-primary" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Type badge */}
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-600">
                  {t(`types.${getTypeKey(lead.type)}`)}
                </span>

                {/* Origin badge (ChileAutos + canal) */}
                <LeadOriginBadge lead={lead} showChannel />
              </div>

              {/* Link directo a la publicación en ChileAutos */}
              {origin.isChileautos && origin.publicationUrl && (
                <button
                  onClick={() => window.open(origin.publicationUrl as string, '_blank', 'noopener,noreferrer')}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200/70 text-[12px] font-medium text-orange-700 hover:bg-orange-100 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver publicación en ChileAutos
                </button>
              )}
            </div>

            {/* Content — two columns on desktop */}
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Customer info — full width */}
                {customer && (
                  <div className="md:col-span-2">
                    <Section title={t('labels.customer')} icon={CreditCard}>
                      <InfoRow label="Email" value={customer.email} />
                      <InfoRow label={t('labels.phone')} value={customer.phone} />
                      <InfoRow label={t('labels.rut')} value={customer.rut} />
                      {customer.birth_date && (
                        <InfoRow
                          label={t('labels.birthDate')}
                          value={new Date(customer.birth_date).toLocaleDateString('es-CL')}
                        />
                      )}
                    </Section>
                  </div>
                )}

                {/* Vendedor asignado */}
                <div className="md:col-span-2">
                  <Section title="Vendedor asignado" icon={UserIcon}>
                    {canAssign && onAssign ? (
                      <Select
                        value={lead.assigned_to ? String(lead.assigned_to) : UNASSIGNED}
                        disabled={assigning}
                        onValueChange={async (v) => {
                          const newId = v === UNASSIGNED ? null : parseInt(v);
                          if (newId === (lead.assigned_to ?? null)) return;
                          setAssigning(true);
                          const ok = await onAssign(lead.id, newId);
                          setAssigning(false);
                          toast(
                            ok
                              ? { title: 'Vendedor actualizado' }
                              : { title: 'No se pudo asignar el vendedor', variant: 'destructive' }
                          );
                        }}
                      >
                        <SelectTrigger className="h-9 text-[13px]">
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Sin asignar</SelectItem>
                          {sellers.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {sellerName(s) || s.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-[13px] font-medium text-slate-900">
                        {sellerName(lead.assigned_user) || (
                          <span className="text-slate-400 italic font-normal">Sin asignar</span>
                        )}
                      </p>
                    )}
                  </Section>
                </div>

                {/* Vehicle */}
                {allVehicles.length > 0 && (
                  <Section title={t('labels.associatedVehicles')} icon={Car}>
                    {allVehicles.map((v: Vehicle, i) => (
                      <div key={v.id || i} className={i > 0 ? 'mt-3 pt-3 border-t border-slate-100' : ''}>
                        <p className="text-[13px] font-medium text-slate-900">
                          {v.brand?.name} {v.model?.name} {v.year}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                          {v.mileage && <span>{v.mileage.toLocaleString('es-CL')} km</span>}
                          {v.price && <span>• ${v.price.toLocaleString('es-CL')}</span>}
                          {v.license_plate && <span>• {v.license_plate.toUpperCase()}</span>}
                        </div>
                      </div>
                    ))}
                  </Section>
                )}

                {/* Searched vehicle */}
                {lead.type === LeadTypes.SEARCH_REQUEST && lead.search_brand && (
                  <Section title={t('labels.searchedVehicle')} icon={Search}>
                    <p className="text-[13px] font-medium text-slate-900">
                      {lead.search_brand.name} {lead.search_model?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t('labels.clientSearchesVehicle')}</p>
                  </Section>
                )}

                {/* Respuestas de formulario configurable (builder) */}
                {customFields.length > 0 && (
                  <Section title={t('labels.searchCriteria')} icon={Search}>
                    {customFields.map((f, i) => (
                      <InfoRow key={i} label={f.label} value={f.value} />
                    ))}
                  </Section>
                )}

                {/* Search params */}
                {hasFixedSearch && (
                  <Section title={t('labels.searchCriteria')} icon={Search}>
                    <InfoRow label={t('labels.brand')} value={lead.search_params.brand} />
                    <InfoRow label={t('labels.model')} value={lead.search_params.model} />
                    {lead.search_params.year && (
                      <InfoRow
                        label={t('labels.year')}
                        value={
                          lead.search_params.year.min === lead.search_params.year.max
                            ? String(lead.search_params.year.min)
                            : `${lead.search_params.year.min} - ${lead.search_params.year.max}`
                        }
                      />
                    )}
                    {lead.search_params.price && (
                      <InfoRow
                        label={t('labels.price')}
                        value={formatRange(lead.search_params.price, '$', '')}
                      />
                    )}
                    {lead.search_params.mileage && (
                      <InfoRow
                        label={t('labels.mileage')}
                        value={formatRange(lead.search_params.mileage, '', ' km')}
                      />
                    )}
                    {lead.search_params.max_owners && (
                      <InfoRow label={t('labels.maxOwners')} value={String(lead.search_params.max_owners)} />
                    )}
                  </Section>
                )}

                {/* Financing */}
                {hasFinancing && lead.financing_data && (
                  <Section title={t('financing.title')} icon={DollarSign}>
                    {lead.financing_data.down_payment !== undefined && (
                      <InfoRow
                        label={t('financing.downPayment')}
                        value={`$${lead.financing_data.down_payment.toLocaleString('es-CL')}`}
                      />
                    )}
                    {lead.financing_data.monthly_income !== undefined && (
                      <InfoRow
                        label={t('financing.monthlyIncome')}
                        value={`$${lead.financing_data.monthly_income.toLocaleString('es-CL')}`}
                      />
                    )}
                    {lead.financing_data.employment_type && (
                      <InfoRow label={t('financing.employmentType')} value={lead.financing_data.employment_type} />
                    )}
                  </Section>
                )}

                {/* Notes — full width, inline editable */}
                <div className="md:col-span-2">
                  <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <h4 className="text-[13px] font-semibold text-slate-700 tracking-tight">{t('labels.notes')}</h4>
                      </div>
                      {!editingNotes && (
                        <button
                          onClick={() => { setNotesText(lead.notes || ''); setEditingNotes(true); }}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          {t('buttons.editNotes')}
                        </button>
                      )}
                    </div>
                    {editingNotes ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder={t('editNotesDialog.placeholder')}
                          rows={4}
                          className="resize-none text-[13px]"
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-[12px] h-8 px-3"
                            onClick={() => setEditingNotes(false)}
                            disabled={savingNotes}
                          >
                            {tCommon('buttons.cancel')}
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-xl text-[12px] h-8 px-3"
                            disabled={savingNotes}
                            onClick={async () => {
                              setSavingNotes(true);
                              const success = await onUpdateNotes(lead.id, notesText.trim());
                              setSavingNotes(false);
                              if (success) {
                                toast({ title: t('editNotesDialog.success') });
                                setEditingNotes(false);
                                // Refresca el historial para mostrar el evento notes_changed
                                // que acaba de registrar el trigger de la BD.
                                refetchActivity();
                              } else {
                                toast({ title: t('editNotesDialog.error'), variant: 'destructive' });
                              }
                            }}
                          >
                            {savingNotes ? '...' : tCommon('buttons.save')}
                          </Button>
                        </div>
                      </div>
                    ) : lead.notes ? (
                      <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
                    ) : (
                      <p className="text-[12px] text-slate-400 italic">{t('detail.noNotes')}</p>
                    )}
                  </div>
                </div>

                {/* Historial del lead (T4) — full width, solo lectura */}
                <div className="md:col-span-2">
                  <LeadTimeline entries={activity} isLoading={activityLoading} sellers={sellers} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 pb-4">
                {/* Pool: tomar lead sin asignar */}
                {canClaim && onClaim && !lead.assigned_to && (
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 rounded-xl text-[12px] h-9 bg-sky-500 hover:bg-sky-600"
                    disabled={claimingPool}
                    onClick={async () => {
                      setClaimingPool(true);
                      const ok = await onClaim(lead.id);
                      setClaimingPool(false);
                      toast(ok
                        ? { title: t('claim.claimed', 'Lead tomado') }
                        : { title: t('claim.claimFailed', 'Otro vendedor ya lo tomó'), variant: 'destructive' });
                    }}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    {claimingPool ? '...' : t('claim.take', 'Tomar este lead')}
                  </Button>
                )}

                {/* Pool: soltar lead propio */}
                {canClaim && onRelease && lead.assigned_to && currentUserId && lead.assigned_to === currentUserId && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 rounded-xl text-[12px] h-9"
                    disabled={claimingPool}
                    onClick={async () => {
                      setClaimingPool(true);
                      const ok = await onRelease(lead.id);
                      setClaimingPool(false);
                      toast(ok
                        ? { title: t('claim.released', 'Lead devuelto al pool') }
                        : { title: t('claim.releaseFailed', 'No se pudo soltar el lead'), variant: 'destructive' });
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                    {claimingPool ? '...' : t('claim.release', 'Soltar lead')}
                  </Button>
                )}

                {lead.type === LeadTypes.SEARCH_REQUEST && onCreateRequest && (
                  <Button
                    size="sm"
                    className="flex-1 gap-1.5 rounded-xl text-[12px] h-9"
                    disabled={creatingRequest}
                    onClick={async () => {
                      setCreatingRequest(true);
                      const customer = lead.customer;
                      const fullName = getLeadFullName(customer?.first_name, customer?.last_name);

                      const noteParts: string[] = [];
                      if (lead.notes) noteParts.push(lead.notes);
                      if (lead.search_params?.mileage) {
                        const km = lead.search_params.mileage;
                        if (km.min && km.max) noteParts.push(`Kilometraje: ${km.min.toLocaleString('es-CL')} - ${km.max.toLocaleString('es-CL')} km`);
                        else if (km.max) noteParts.push(`Kilometraje: hasta ${km.max.toLocaleString('es-CL')} km`);
                      }
                      if (lead.search_params?.max_owners) {
                        noteParts.push(`Máx. dueños: ${lead.search_params.max_owners}`);
                      }

                      const data: CreateVehicleRequestData = {
                        customer_name: fullName,
                        customer_phone: customer?.phone || undefined,
                        customer_email: customer?.email || undefined,
                        brand_name: lead.search_brand?.name || lead.search_params?.brand || undefined,
                        model_name: lead.search_model?.name || lead.search_params?.model || undefined,
                        year_min: lead.search_params?.year?.min || undefined,
                        year_max: lead.search_params?.year?.max || undefined,
                        budget_min: lead.search_params?.price?.min || undefined,
                        budget_max: lead.search_params?.price?.max || undefined,
                        notes: noteParts.length > 0 ? noteParts.join('\n') : undefined,
                        lead_id: lead.id,
                      };

                      const result = await onCreateRequest(data);
                      setCreatingRequest(false);
                      if (!result.error) {
                        toast({ title: t('detail.requestCreated'), description: t('detail.requestCreatedDesc') });
                        onStatusChange(lead.id, 'assigned' as LeadStatus);
                      } else {
                        toast({ title: result.error, variant: 'destructive' });
                      }
                    }}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    {creatingRequest ? '...' : t('buttons.createRequest')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 rounded-xl text-[12px] h-9 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onDeleteLead(lead)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('buttons.deleteLead')}
                </Button>
              </div>
            </div>
          </div>
        </DrawerContentRight>
      </Drawer>

    </>
  );
}

function formatRange(range: { min?: number; max?: number }, prefix: string, suffix: string): string {
  if (range.min && range.max) {
    return `${prefix}${range.min.toLocaleString('es-CL')}${suffix} - ${prefix}${range.max.toLocaleString('es-CL')}${suffix}`;
  }
  if (range.min) return `Desde ${prefix}${range.min.toLocaleString('es-CL')}${suffix}`;
  if (range.max) return `Hasta ${prefix}${range.max.toLocaleString('es-CL')}${suffix}`;
  return 'Sin límite';
}
