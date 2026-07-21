import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Mail,
  Eye,
  Edit3,
  Car,
  Users,
  Sparkles,
  Plus,
  X,
  Check,
  Send,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Vehicle } from '@/types/vehicle';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/utils/posthog';
import { Pencil, Trash2, UserPlus, Search } from 'lucide-react';
import { CreateMarketingEmailHistory } from '@/types/marketing-emails-history';
import { useI18n } from '@/hooks/useI18n';
import {
  useMarketingStore,
  RecommendedCustomer,
} from '@/stores/marketingStore';

interface PerVehicleEmail {
  subject: string;
  content: string;
}

interface MarketingEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  vehicles?: Vehicle[];
  customers: RecommendedCustomer[];
  selectedCustomerIds: number[];
}

const MarketingEmailModal: React.FC<MarketingEmailModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  vehicles = [],
  customers,
  selectedCustomerIds,
}) => {
  const { client } = useAuth();
  const { tCommon } = useI18n();
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0, vehicle: '' });
  const [activeTab, setActiveTab] = useState(0);
  const [isPreview, setIsPreview] = useState(false);
  const [enabledVehicleIds, setEnabledVehicleIds] = useState<Set<number>>(new Set());

  const { filters, extraEmails, setExtraEmails, addManualCustomer, removeManualCustomer } = useMarketingStore();
  const [manualSearch, setManualSearch] = useState('');
  const [manualResults, setManualResults] = useState<Array<{ id: number; full_name: string; email: string }>>([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [newExtraEmail, setNewExtraEmail] = useState('');

  // Per-vehicle email content
  const [perVehicleEmails, setPerVehicleEmails] = useState<Record<number, PerVehicleEmail>>({});

  const effectiveVehicles = vehicles.length > 0 ? vehicles : vehicle ? [vehicle] : [];

  // Track if we've initialized enabled vehicles for this modal session
  const [hasInitializedEnabled, setHasInitializedEnabled] = useState(false);

  // Initialize per-vehicle emails and enabled set when modal opens or vehicles change
  useEffect(() => {
    if (!client || effectiveVehicles.length === 0) return;
    const existing = { ...perVehicleEmails };
    let changed = false;
    for (const v of effectiveVehicles) {
      if (!v.id || existing[v.id]) continue;
      existing[v.id] = {
        subject: `🚗 ${v.brand?.name} ${v.model?.name} ${v.year} - ${client.name}`,
        content: 'Sabemos que te gustan este tipo de autos y tenemos una oportunidad perfecta para ti.',
      };
      changed = true;
    }
    if (changed) setPerVehicleEmails(existing);
    // Only initialize enabled set once per modal open
    if (!hasInitializedEnabled) {
      const ids = new Set<number>();
      for (const v of effectiveVehicles) { if (v.id) ids.add(v.id); }
      setEnabledVehicleIds(ids);
      setHasInitializedEnabled(true);
    }
  }, [effectiveVehicles, client, hasInitializedEnabled]);

  // Reset initialization flag when modal closes
  useEffect(() => {
    if (!isOpen) setHasInitializedEnabled(false);
  }, [isOpen]);

  const toggleVehicleEnabled = (id: number) => {
    setEnabledVehicleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedCustomers = customers.filter((c) => selectedCustomerIds.includes(c.id));

  // Customers grouped by vehicle
  const vehicleCustomers = useMemo(() => {
    const map = new Map<number, RecommendedCustomer[]>();
    for (const v of effectiveVehicles) {
      const label = `${v.brand?.name} ${v.model?.name}`;
      const matched = selectedCustomers.filter((c) => c.matched_vehicle?.includes(label));
      // If single vehicle or no matched_vehicle, show all
      const list = effectiveVehicles.length === 1 || matched.length === 0 ? selectedCustomers : matched;
      map.set(v.id!, list);
    }
    return map;
  }, [effectiveVehicles, selectedCustomers]);

  const totalRecipients = useMemo(() => {
    const uniqueIds = new Set<number>();
    vehicleCustomers.forEach((list, vId) => {
      if (enabledVehicleIds.has(vId)) list.forEach((c) => uniqueIds.add(c.id));
    });
    return uniqueIds.size + extraEmails.length;
  }, [vehicleCustomers, extraEmails, enabledVehicleIds]);

  const updateVehicleEmail = (vehicleId: number, field: 'subject' | 'content', value: string) => {
    setPerVehicleEmails((prev) => ({
      ...prev,
      [vehicleId]: { ...prev[vehicleId], [field]: value },
    }));
  };

  // Helpers
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(price);

  const formatMileage = (mileage?: number) =>
    mileage ? new Intl.NumberFormat('es-CL').format(mileage) + ' km' : '';

  const getFirstName = (fullName: string) => fullName.split(' ')[0];

  const formatClientNameForEmail = (clientName: string) =>
    clientName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').substring(0, 50);

  const buildEmailHtml = (v: Vehicle, content: string) => {
    const primary = client?.theme?.light?.primary || '#374151';
    const domain = client?.domain ? `https://${client.domain}` : window.location.origin;
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
        <h2 style="color: #374151; margin-bottom: 20px; font-size: 32px; font-weight: bold;">¡Hola {{customer_name}}!</h2>
        <div style="margin: 20px 0; text-align: center; line-height: 1.6; color: #374151; font-size: 16px;">
          ${content.split('\n').map((l) => `<p style="margin: 10px 0;">${l}</p>`).join('')}
        </div>
        ${v.main_image ? `<div style="text-align: center; margin: 30px 0;"><img src="${v.main_image}" alt="${v.brand?.name} ${v.model?.name}" style="max-width: 100%; height: auto; border-radius: 12px; max-height: 350px; object-fit: cover; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"></div>` : ''}
        <table style="width: 100%; border-collapse: collapse; margin: 30px 0; background-color: #f9fafb; border-radius: 12px; overflow: hidden;">
          <tr style="background-color: ${primary}; color: white;"><td colspan="2" style="padding: 16px; text-align: center; font-weight: bold; font-size: 24px;">${v.brand?.name} ${v.model?.name} ${v.year}</td></tr>
          <tr><td style="padding: 14px; border-bottom: 1px solid #e5e7eb; font-weight: bold; background-color: #f3f4f6; text-align: center;">Precio</td><td style="padding: 14px; border-bottom: 1px solid #e5e7eb; color: #059669; font-weight: bold; font-size: 18px; text-align: center;">${formatPrice(v.price)}</td></tr>
          ${v.mileage ? `<tr><td style="padding:14px;border-bottom:1px solid #e5e7eb;font-weight:bold;background:#f3f4f6;text-align:center">Kilometraje</td><td style="padding:14px;border-bottom:1px solid #e5e7eb;text-align:center">${formatMileage(v.mileage)}</td></tr>` : ''}
          ${v.fuel_type ? `<tr><td style="padding:14px;border-bottom:1px solid #e5e7eb;font-weight:bold;background:#f3f4f6;text-align:center">Combustible</td><td style="padding:14px;border-bottom:1px solid #e5e7eb;text-align:center">${typeof v.fuel_type === 'string' ? v.fuel_type : v.fuel_type?.name || ''}</td></tr>` : ''}
          ${v.transmission ? `<tr><td style="padding:14px;border-bottom:1px solid #e5e7eb;font-weight:bold;background:#f3f4f6;text-align:center">Transmisión</td><td style="padding:14px;border-bottom:1px solid #e5e7eb;text-align:center">${v.transmission}</td></tr>` : ''}
          ${v.color ? `<tr><td style="padding:14px;font-weight:bold;background:#f3f4f6;text-align:center">Color</td><td style="padding:14px;text-align:center">${v.color?.name}</td></tr>` : ''}
        </table>
        <div style="text-align: center; margin: 40px 0;">
          <a href="${domain}/vehicles/${v.id}" style="display:inline-block;background-color:${primary};color:#fff;padding:18px 36px;text-decoration:none;border-radius:10px;font-weight:bold;font-size:16px;text-transform:uppercase;box-shadow:0 4px 8px rgba(0,0,0,0.2);">Ver Más</a>
        </div>
        <div style="background-color:#f3f4f6;padding:25px;border-radius:12px;margin-top:40px;text-align:center;">
          <h3 style="color:#374151;margin:0 0 15px;font-size:22px;font-weight:bold;">¿Interesado?</h3>
          ${client?.contact?.phone ? `<p style="margin:8px 0;"><strong>📞</strong> ${client.contact.phone}</p>` : ''}
          ${client?.contact?.email ? `<p style="margin:8px 0;"><strong>📧</strong> ${client.contact.email}</p>` : ''}
        </div>
        <p style="margin-top:30px;font-size:14px;color:#9ca3af;font-style:italic;">El equipo de ${client?.name || 'GoAutos'}</p>
      </div>`;
  };

  const saveEmailHistory = async (vehicleId: number, subject: string, customerIds: number[]) => {
    if (!client) return;
    try {
      const historyData: CreateMarketingEmailHistory = {
        client_id: client.id,
        vehicle_id: vehicleId,
        subject,
        from_email: `${formatClientNameForEmail(client.name)}@goauto.cl`,
        from_name: client.name,
        customer_ids: customerIds,
        total_recipients: customerIds.length,
        filters_applied: {
          similarity: filters.similarityThreshold / 100,
          transaction_type: filters.targetAudience.buyers && filters.targetAudience.sellers ? 'both' : filters.targetAudience.buyers ? 'compra' : 'venta',
        },
      };
      await supabase.from('marketing_emails_history').insert(historyData);
    } catch (error) {
      console.error('Error saving history:', error);
    }
  };

  const handleModalManualSearch = async (query: string) => {
    setManualSearch(query);
    if (query.trim().length < 2 || !client) { setManualResults([]); return; }
    setManualSearching(true);
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, full_name, email')
        .eq('client_id', client.id)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .not('email', 'is', null)
        .limit(6);
      setManualResults((data || []).map((c) => ({
        id: c.id,
        full_name: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        email: c.email,
      })));
    } catch { setManualResults([]); }
    finally { setManualSearching(false); }
  };

  const addExtraEmail = () => {
    const email = newExtraEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Email inválido'); return; }
    if (extraEmails.includes(email)) { toast.error('Ya agregado'); return; }
    setExtraEmails([...extraEmails, email]);
    setNewExtraEmail('');
  };

  const handleSendCampaign = async () => {
    if (!client || effectiveVehicles.length === 0) return;

    const fromAddr = `${client.name} <reportes@goauto.cl>`;

    setIsSending(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Send per-vehicle segmented emails (only enabled vehicles)
      const enabledVehicles = effectiveVehicles.filter((v) => v.id && enabledVehicleIds.has(v.id));
      for (const v of enabledVehicles) {
        const emailData = perVehicleEmails[v.id!];
        if (!emailData?.subject?.trim() || !emailData?.content?.trim()) continue;

        const vLabel = `${v.brand?.name} ${v.model?.name}`;
        const vCustomers = vehicleCustomers.get(v.id!) || [];
        const html = buildEmailHtml(v, emailData.content);

        setSendProgress({ current: 0, total: vCustomers.length + (v === enabledVehicles[0] ? extraEmails.length : 0), vehicle: vLabel });

        // Send to each customer
        for (let i = 0; i < vCustomers.length; i++) {
          const c = vCustomers[i];
          setSendProgress((p) => ({ ...p, current: i + 1 }));
          try {
            const { data, error } = await supabase.functions.invoke('send-email', {
              body: { to: [c.email], subject: emailData.subject, from: fromAddr, content: html, variables: { customer_name: getFirstName(c.full_name) } },
            });
            if (error) errorCount++;
            else if (data?.error || data?.success === false) errorCount++;
            else successCount++;
          } catch { errorCount++; }
          await new Promise((r) => setTimeout(r, 100));
        }

        // Extra emails only on the first enabled vehicle
        if (v === enabledVehicles[0]) {
          for (const extra of extraEmails) {
            try {
              const { data: extraData, error } = await supabase.functions.invoke('send-email', {
                body: { to: [extra], subject: emailData.subject, from: fromAddr, content: html },
              });
              if (error) errorCount++;
              else if (extraData?.error || extraData?.success === false) errorCount++;
              else successCount++;
            } catch { errorCount++; }
            await new Promise((r) => setTimeout(r, 100));
          }
        }

        // Save history per vehicle
        await saveEmailHistory(v.id!, emailData.subject, vCustomers.map((c) => c.id));
      }

      if (successCount > 0 && errorCount === 0) {
        posthog.capture({
          distinctId: client?.id ? String(client.id) : 'anonymous',
          event: 'campaign_executed',
          properties: {
            vehicle_count: enabledVehicles.length,
            customer_count: successCount,
          },
        });
        toast.success(`Campaña enviada a ${successCount} destinatarios`);
        onClose();
      } else if (successCount > 0) {
        posthog.capture({
          distinctId: client?.id ? String(client.id) : 'anonymous',
          event: 'campaign_executed',
          properties: {
            vehicle_count: enabledVehicles.length,
            customer_count: successCount,
          },
        });
        toast.warning(`${successCount} exitosos, ${errorCount} fallidos`);
      } else {
        toast.error('Error al enviar la campaña');
      }
    } catch (error) {
      console.error('Campaign error:', error);
      toast.error('Error al enviar la campaña');
    } finally {
      setIsSending(false);
      setSendProgress({ current: 0, total: 0, vehicle: '' });
    }
  };

  if (!vehicle) return null;

  const activeVehicle = effectiveVehicles[activeTab] || effectiveVehicles[0];
  const activeEmail = activeVehicle?.id ? perVehicleEmails[activeVehicle.id] : null;
  const activeCustomers = activeVehicle?.id ? (vehicleCustomers.get(activeVehicle.id) || []) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-6xl h-[95vh] sm:h-[85vh] overflow-hidden p-0 flex flex-col'>
        {/* Header */}
        <div className='px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-gray-100 shrink-0'>
          <DialogHeader>
            <DialogTitle className='text-base font-semibold text-gray-900 tracking-tight'>
              Campaña Segmentada
            </DialogTitle>
            <DialogDescription className='text-xs text-gray-500'>
              {enabledVehicleIds.size} de {effectiveVehicles.length} vehículo{effectiveVehicles.length !== 1 ? 's' : ''} · {totalRecipients} destinatarios
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Vehicle cards — toggle select + click to edit */}
        <div className='border-b border-gray-100 px-3 sm:px-4 py-3 shrink-0'>
          <div className='flex gap-2 overflow-x-auto pb-1'>
            {effectiveVehicles.map((v, idx) => {
              const count = vehicleCustomers.get(v.id!)?.length || 0;
              const isActive = idx === activeTab;
              const isEnabled = enabledVehicleIds.has(v.id!);
              const emailData = v.id ? perVehicleEmails[v.id] : null;
              const hasEmail = !!emailData?.subject?.trim() && !!emailData?.content?.trim();
              return (
                <div
                  key={v.id}
                  className={`flex items-center gap-2 rounded-xl shrink-0 transition-all duration-200 border ${
                    isEnabled
                      ? isActive
                        ? 'border-cyan-300/50 shadow-md shadow-cyan-500/5'
                        : 'border-cyan-200/40'
                      : 'border-gray-200'
                  }`}
                  style={isEnabled ? {
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(59,130,246,0.08) 100%)',
                  } : { background: 'white' }}
                >
                  {/* Toggle checkbox — separate click target */}
                  <button
                    type='button'
                    onClick={() => toggleVehicleEnabled(v.id!)}
                    className='pl-2.5 py-2.5 shrink-0'
                  >
                    <div
                      className={`rounded-full flex items-center justify-center transition-all ${
                        isEnabled
                          ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white'
                          : 'border-2 border-gray-300'
                      }`}
                      style={{ width: 18, height: 18 }}
                    >
                      {isEnabled && <Check className='h-2.5 w-2.5' />}
                    </div>
                  </button>

                  {/* Card body — click to select as active tab */}
                  <button
                    type='button'
                    onClick={() => { setActiveTab(idx); setIsPreview(false); }}
                    className='flex items-center gap-2.5 pr-3 py-2.5 text-left flex-1 min-w-0'
                  >
                    {v.main_image ? (
                      <img src={v.main_image} alt='' className='w-10 h-7 rounded-lg object-cover shrink-0' />
                    ) : (
                      <div className='w-10 h-7 rounded-lg bg-white/50 flex items-center justify-center shrink-0'>
                        <Car className='h-3.5 w-3.5 text-gray-400' />
                      </div>
                    )}
                    <div className='min-w-0'>
                      <p className={`text-xs font-semibold truncate leading-tight ${isEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                        {v.brand?.name} {v.model?.name}
                      </p>
                      <div className='flex items-center gap-1.5 mt-0.5'>
                        <span className='text-[10px] text-gray-500'>{v.year}</span>
                        <span className='text-[10px] text-gray-300'>·</span>
                        <span className='text-[10px] text-gray-500'>{count} clientes</span>
                        {hasEmail && isEnabled && (
                          <>
                            <span className='text-[10px] text-gray-300'>·</span>
                            <span className='text-[10px] text-emerald-500 font-medium'>Listo</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main content — 2 columns */}
        <div className='flex flex-col lg:flex-row overflow-hidden flex-1 min-h-0'>

          {/* Left — Customers for this vehicle */}
          <div className='max-h-[200px] lg:max-h-none lg:w-[320px] shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col overflow-hidden'>
            <div className='px-4 py-2.5 flex items-center justify-between'>
              <p className='text-[11px] font-medium text-gray-400 uppercase tracking-wider'>
                {activeCustomers.length} cliente{activeCustomers.length !== 1 ? 's' : ''}
              </p>
              <p className='text-[10px] text-gray-400'>similitud</p>
            </div>
            <div className='flex-1 overflow-y-auto px-2 pb-2'>
              {activeCustomers.map((c) => (
                <div key={c.id} className='group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors'>
                  <div className='w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0'>
                    {(c.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div className='flex-1 min-w-0'>
                    {editingCustomerId === c.id ? (
                      <div className='flex items-center gap-1'>
                        <Input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className='h-6 text-[11px] rounded-md px-1.5'
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { setEditingCustomerId(null); }
                            if (e.key === 'Escape') { setEditingCustomerId(null); }
                          }}
                        />
                        <button onClick={() => setEditingCustomerId(null)} className='text-gray-400 hover:text-gray-600'>
                          <Check className='h-3 w-3' />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className='text-[12px] font-medium text-gray-800 truncate'>{c.full_name}</p>
                        <p className='text-[10px] text-gray-400 truncate'>{c.email}</p>
                      </>
                    )}
                  </div>
                  <div className='flex items-center gap-1 shrink-0'>
                    {c.similarity > 0 && (
                      <span className='text-[10px] text-gray-400 mr-0.5'>{Math.round(c.similarity * 100)}%</span>
                    )}
                    {c.similarity === 0 && (
                      <span className='text-[9px] text-gray-400 bg-gray-100 rounded px-1 py-0.5 mr-0.5'>Manual</span>
                    )}
                    <button
                      onClick={() => { setEditingCustomerId(c.id); setEditEmail(c.email); }}
                      className='p-1 rounded-md text-gray-300 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all'
                      title='Editar'
                    >
                      <Pencil className='h-3 w-3' />
                    </button>
                    <button
                      onClick={() => removeManualCustomer(c.id)}
                      className='p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all'
                      title='Eliminar'
                    >
                      <Trash2 className='h-3 w-3' />
                    </button>
                  </div>
                </div>
              ))}
              {activeCustomers.length === 0 && (
                <p className='text-xs text-gray-400 text-center py-6'>Sin clientes para este vehículo</p>
              )}
            </div>

            {/* Bottom — unified add input */}
            <div className='border-t border-gray-100 p-3 space-y-2'>
              <div className='flex gap-1.5'>
                <Input
                  placeholder='Agregar cliente o email...'
                  value={manualSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualSearch(val);
                    handleModalManualSearch(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = manualSearch.trim();
                      // If it looks like an email, add as extra email
                      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                        if (!extraEmails.includes(val.toLowerCase())) {
                          setExtraEmails([...extraEmails, val.toLowerCase()]);
                        }
                        setManualSearch('');
                        setManualResults([]);
                      }
                    }
                  }}
                  className='h-7 text-[11px] rounded-lg'
                />
                <Button
                  type='button' variant='ghost' size='sm'
                  onClick={() => {
                    const val = manualSearch.trim();
                    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                      if (!extraEmails.includes(val.toLowerCase())) {
                        setExtraEmails([...extraEmails, val.toLowerCase()]);
                      }
                      setManualSearch('');
                      setManualResults([]);
                    }
                  }}
                  className='h-7 w-7 p-0 shrink-0'
                >
                  <Plus className='h-3 w-3' />
                </Button>
              </div>

              {/* Search results dropdown */}
              {manualSearching && (
                <div className='flex items-center gap-1.5 py-1 text-[10px] text-gray-400'>
                  <Loader2 className='h-2.5 w-2.5 animate-spin' /> Buscando...
                </div>
              )}
              {manualResults.length > 0 && (
                <div className='space-y-0.5 max-h-32 overflow-y-auto'>
                  {manualResults.map((c) => {
                    const alreadyAdded = customers.some((r) => r.id === c.id);
                    return (
                      <button
                        key={c.id}
                        disabled={alreadyAdded}
                        onClick={() => {
                          addManualCustomer({
                            id: c.id, full_name: c.full_name, email: c.email, rut: '', similarity: 0,
                            transaction_type: undefined,
                            last_purchase: { brand: '', model: '', year: 0, price: 0 },
                            matched_vehicle: activeVehicle ? `${activeVehicle.brand?.name} ${activeVehicle.model?.name}` : '',
                          });
                          setManualSearch('');
                          setManualResults([]);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-[11px] transition-colors ${
                          alreadyAdded ? 'text-gray-400 bg-gray-50' : 'hover:bg-primary/5 text-gray-700'
                        }`}
                      >
                        <div className='min-w-0'>
                          <p className='font-medium truncate'>{c.full_name || 'Sin nombre'}</p>
                          <p className='text-[10px] text-gray-400 truncate'>{c.email}</p>
                        </div>
                        {alreadyAdded ? (
                          <span className='text-[9px] text-gray-400 shrink-0'>Agregado</span>
                        ) : (
                          <Plus className='h-3 w-3 text-primary shrink-0' />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Extra email pills */}
              {extraEmails.length > 0 && (
                <div className='flex flex-wrap gap-1'>
                  {extraEmails.map((e) => (
                    <span key={e} className='inline-flex items-center gap-0.5 bg-gray-100 text-gray-600 rounded-full pl-2 pr-1 py-0.5 text-[10px]'>
                      {e}
                      <button onClick={() => setExtraEmails(extraEmails.filter((x) => x !== e))} className='hover:bg-gray-300 rounded-full p-0.5'><X className='h-2.5 w-2.5' /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — Email editor for this vehicle */}
          <div className='flex-1 flex flex-col overflow-hidden min-h-0'>
            {/* Toggle */}
            <div className='flex items-center justify-between px-4 sm:px-5 pt-3 pb-2 shrink-0'>
              <div className='flex items-center gap-2 min-w-0'>
                {activeVehicle?.main_image && (
                  <img src={activeVehicle.main_image} alt='' className='w-10 h-7 rounded-md object-cover hidden sm:block' />
                )}
                <div className='min-w-0'>
                  <p className='text-xs font-semibold text-gray-900 truncate'>{activeVehicle?.brand?.name} {activeVehicle?.model?.name} {activeVehicle?.year}</p>
                  <p className='text-[10px] text-gray-400'>{activeVehicle?.price ? formatPrice(activeVehicle.price) : ''}</p>
                </div>
              </div>
              <div className='flex bg-gray-100 rounded-lg p-0.5'>
                <button onClick={() => setIsPreview(false)} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${!isPreview ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  <Edit3 className='h-3 w-3 inline mr-1' />Editar
                </button>
                <button onClick={() => setIsPreview(true)} className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${isPreview ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  <Eye className='h-3 w-3 inline mr-1' />Preview
                </button>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto px-4 sm:px-5 pb-4 min-h-0'>
              {!isPreview ? (
                <div className='space-y-4'>
                  <div>
                    <Label className='text-[10px] font-medium text-gray-400 uppercase tracking-wider'>Asunto</Label>
                    <Input
                      value={activeEmail?.subject || ''}
                      onChange={(e) => activeVehicle?.id && updateVehicleEmail(activeVehicle.id, 'subject', e.target.value)}
                      className='mt-1 h-9 rounded-xl border-gray-200 text-sm'
                      placeholder='Asunto del email...'
                    />
                  </div>
                  <div>
                    <Label className='text-[10px] font-medium text-gray-400 uppercase tracking-wider'>Mensaje</Label>
                    <p className='text-[10px] text-gray-400 mt-0.5 mb-1'>Solo el mensaje. Imagen, detalles y contacto se agregan automáticamente.</p>
                    <Textarea
                      value={activeEmail?.content || ''}
                      onChange={(e) => activeVehicle?.id && updateVehicleEmail(activeVehicle.id, 'content', e.target.value)}
                      rows={4}
                      className='rounded-xl border-gray-200 text-sm resize-none'
                      placeholder='Escribe tu mensaje...'
                    />
                  </div>
                </div>
              ) : (
                /* Preview: show all enabled vehicles' emails stacked */
                <div className='space-y-4'>
                  {effectiveVehicles.filter((v) => v.id && enabledVehicleIds.has(v.id)).map((v) => {
                    const vEmail = v.id ? perVehicleEmails[v.id] : null;
                    const vCustomers = v.id ? (vehicleCustomers.get(v.id) || []) : [];
                    const primary = client?.theme?.light?.primary || '#374151';
                    return (
                      <div key={v.id} className='bg-gray-50 rounded-2xl p-3'>
                        {/* Segment header */}
                        <div className='flex items-center gap-2 mb-2 px-1'>
                          {v.main_image && <img src={v.main_image} alt='' className='w-8 h-6 rounded-md object-cover' />}
                          <p className='text-[11px] font-semibold text-gray-700'>{v.brand?.name} {v.model?.name} {v.year}</p>
                          <span className='text-[10px] text-gray-400 ml-auto'>{vCustomers.length} destinatarios</span>
                        </div>
                        <div className='bg-white rounded-xl shadow-sm max-w-lg mx-auto overflow-hidden'>
                          <div className='px-5 pt-4 pb-3 text-center'>
                            <p className='text-[10px] text-gray-400 mb-2'>{vEmail?.subject}</p>
                            <h2 className='text-lg font-bold text-gray-800 mb-2'>
                              ¡Hola {vCustomers.length > 0 ? getFirstName(vCustomers[0].full_name) : '[Nombre]'}!
                            </h2>
                            <div className='text-sm text-gray-600 leading-relaxed'>
                              {(vEmail?.content || '').split('\n').map((l, i) => <p key={i} className='mb-1'>{l}</p>)}
                            </div>
                          </div>
                          {v.main_image && (
                            <div className='px-5 pb-2'><img src={v.main_image} alt='' className='w-full h-32 object-cover rounded-xl' /></div>
                          )}
                          <div className='mx-5 mb-2 rounded-xl overflow-hidden border border-gray-100'>
                            <div className='p-2 text-center font-bold text-white text-xs' style={{ backgroundColor: primary }}>
                              {v.brand?.name} {v.model?.name} {v.year}
                            </div>
                            <div className='divide-y divide-gray-100 text-[11px]'>
                              <div className='flex justify-between px-3 py-1.5'><span className='text-gray-500'>Precio</span><span className='font-bold text-emerald-600'>{formatPrice(v.price)}</span></div>
                              {v.mileage && <div className='flex justify-between px-3 py-1.5'><span className='text-gray-500'>Km</span><span>{formatMileage(v.mileage)}</span></div>}
                            </div>
                          </div>
                          <div className='px-5 pb-2 text-center'>
                            <div className='inline-block text-white px-5 py-1.5 rounded-lg font-semibold text-[11px]' style={{ backgroundColor: primary }}>Ver Más</div>
                          </div>
                          <div className='px-5 pb-3 text-center'>
                            <p className='text-[9px] text-gray-400 italic'>El equipo de {client?.name || 'GoAutos'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className='border-t border-gray-100 px-4 sm:px-5 py-3 flex items-center justify-between shrink-0'>
              <div className='text-[11px] text-gray-400 hidden sm:block'>
                {isSending ? (
                  <span className='flex items-center gap-1.5'>
                    <Loader2 className='h-3 w-3 animate-spin' />
                    {sendProgress.vehicle} — {sendProgress.current}/{sendProgress.total}
                  </span>
                ) : (
                  <span>{totalRecipients} destinatario{totalRecipients !== 1 ? 's' : ''} · {effectiveVehicles.length} segmento{effectiveVehicles.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              <div className='flex gap-2'>
                <Button variant='ghost' size='sm' onClick={onClose} className='text-gray-500' disabled={isSending}>
                  Cancelar
                </Button>
                <Button
                  size='sm'
                  onClick={handleSendCampaign}
                  disabled={isSending || totalRecipients === 0 || effectiveVehicles.some((v) => !perVehicleEmails[v.id!]?.subject?.trim())}
                  className='rounded-xl px-5'
                >
                  {isSending ? (
                    <><Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />Enviando...</>
                  ) : (
                    <><Send className='h-3.5 w-3.5 mr-1.5' />Enviar Campaña</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MarketingEmailModal;
