import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useI18n } from '@/hooks/useI18n';
import { Mail, Phone, MapPin, Cake, Calendar, Car, Building2, ExternalLink, Pencil, Trash2, X, ArrowLeft } from 'lucide-react';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCustomerVehicleHistory } from '@/hooks/useCustomerVehicleHistory';
import CustomerForm from '@/components/customer/CustomerForm';
import CustomerDeleteModal from '@/components/customer/CustomerDeleteModal';
import { formatDateShort } from '@/lib/utils';
import { getCustomerDisplayName, getCustomerInitials, isCompanyCustomer } from '@/utils/customerName';

type Customer = {
  id: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email: string;
  phone: string;
  rut: string;
  address: string;
  birth_date?: string;
  created_at: string;
  bank_name?: string;
  account_type?: string;
  account_number?: string;
  account_holder_name?: string;
  account_holder_rut?: string;
};

interface CustomerDetailSheetProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteSuccess: () => void;
  onEditSuccess: () => void;
  initialMode?: 'view' | 'edit';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
      <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-3">{title}</h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: any }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-50 last:border-b-0">
      <span className="text-[12px] text-slate-500 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className="text-[12px] font-medium text-slate-900 text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

function capitalizeWords(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
}

function formatBirthday(dateString: string) {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

const typeBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  sale: 'default',
  purchase: 'secondary',
  consignment: 'outline',
};

export default function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
  onDeleteSuccess,
  onEditSuccess,
  initialMode = 'view',
}: CustomerDetailSheetProps) {
  const { tCommon } = useI18n();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { history, loading: historyLoading } = useCustomerVehicleHistory(open ? customer?.id ?? null : null);

  // Reset mode when drawer opens/closes or initialMode changes
  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  if (!customer) return null;

  const fullName = isCompanyCustomer(customer)
    ? getCustomerDisplayName(customer)
    : capitalizeWords(getCustomerDisplayName(customer));
  const initials = getCustomerInitials(customer);

  const hasBankingInfo = customer.bank_name || customer.account_number || customer.account_type;

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      sale: tCommon('customers.vehicleHistory.sale'),
      purchase: tCommon('customers.vehicleHistory.purchase'),
      consignment: tCommon('customers.vehicleHistory.consignment'),
    };
    return labels[type] || type;
  };

  const accountTypeLabels: Record<string, string> = {
    corriente: 'Cuenta Corriente',
    ahorro: 'Cuenta de Ahorro',
    vista: 'Cuenta Vista',
    rut: 'Cuenta RUT',
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="right">
        <DrawerContentRight className="bg-[#f5f5f7] p-0 md:min-w-[520px]">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
            {/* Header */}
            <div className="bg-white px-5 py-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-[13px] font-semibold text-white shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h2 className="text-[16px] font-semibold text-slate-900 tracking-tight truncate leading-tight">{fullName}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] text-slate-400">
                      {formatDateShort(customer.created_at)}
                    </span>
                    {customer.rut && (
                      <>
                        <span className="text-slate-200">·</span>
                        <span className="text-[11px] text-slate-400">{customer.rut}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setMode('edit')}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Contact info inline */}
              <div className="mt-3 space-y-1">
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-slate-300" />
                    <span className="text-[12px] text-slate-500">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-slate-300" />
                    <span className="text-[12px] text-slate-500">{customer.phone}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-slate-300" />
                    <span className="text-[12px] text-slate-500">{customer.address}</span>
                  </div>
                )}
                {customer.birth_date && (
                  <div className="flex items-center gap-2">
                    <Cake className="w-3 h-3 text-slate-300" />
                    <span className="text-[12px] text-slate-500">{formatBirthday(customer.birth_date)}</span>
                  </div>
                )}
              </div>
            </div>

            {mode === 'view' ? (
              <div className="p-4 space-y-3">

                {/* Banking info (only if data exists) */}
                {hasBankingInfo && (
                  <Section title={tCommon('customers.detail.bankingInfo')}>
                    <InfoRow label="Banco" value={customer.bank_name} />
                    <InfoRow label="Tipo" value={customer.account_type ? accountTypeLabels[customer.account_type] || customer.account_type : null} />
                    <InfoRow label="N° Cuenta" value={customer.account_number} />
                    <InfoRow label="Titular" value={customer.account_holder_name} />
                    <InfoRow label="RUT Titular" value={customer.account_holder_rut} />
                  </Section>
                )}

                {/* Vehicle history */}
                <Section title={tCommon('customers.detail.vehicleHistory')}>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-4 text-slate-400">
                      <span className="text-[12px]">{tCommon('actions.loading')}</span>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                      <Car className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-[12px] mb-2">{tCommon('customers.detail.noVehicles')}</p>
                      <button
                        onClick={() => {
                          onOpenChange(false);
                          navigate('/vehiculos');
                        }}
                        className="text-[12px] font-medium text-sky-500 hover:text-sky-600 transition-colors"
                      >
                        Vincular un vehículo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {history.map((entry, idx) => (
                        <div
                          key={`${entry.type}-${entry.vehicleId}-${idx}`}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/80 border border-slate-100"
                        >
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant={typeBadgeVariant[entry.type]} className="text-[10px] px-1.5 py-0 h-4">
                                {getTypeLabel(entry.type)}
                              </Badge>
                              <span className="text-[11px] text-slate-400">
                                {formatDateShort(entry.date)}
                              </span>
                            </div>
                            <p className="text-[12px] font-medium text-slate-700 truncate">
                              {entry.brand} {entry.model} {entry.year}
                            </p>
                            {entry.licensePlate && (
                              <p className="text-[11px] text-slate-400">{entry.licensePlate}</p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              onOpenChange(false);
                              navigate(`/vehiculos/${entry.vehicleId}`);
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors shrink-0 ml-2"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Delete — tertiary action */}
                <div className="pt-4 pb-4">
                  <button
                    onClick={() => setDeleteOpen(true)}
                    className="w-full text-center text-[11px] text-slate-400 hover:text-red-500 transition-colors py-1"
                  >
                    {tCommon('customers.detail.deleteCustomer')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                {/* Edit mode header */}
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setMode('view')}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-[15px] font-semibold text-slate-900">{tCommon('customers.detail.editCustomer')}</h3>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200/60">
                  <CustomerForm
                    initialData={customer}
                    onSuccess={() => {
                      onEditSuccess();
                      setMode('view');
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </DrawerContentRight>
      </Drawer>

      <CustomerDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onSuccess={() => {
          setDeleteOpen(false);
          onDeleteSuccess();
          onOpenChange(false);
        }}
        customer={customer}
      />
    </>
  );
}
