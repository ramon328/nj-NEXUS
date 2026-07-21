import { VehicleAcquisition } from '@/types/vehicleCreation';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomers } from '@/hooks/useCustomers';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';

interface AcquisitionCardProps {
  acquisition: VehicleAcquisition;
}

const AcquisitionCard = ({ acquisition }: AcquisitionCardProps) => {
  const { clientId } = useAuth();
  const { t } = useTranslation('common');
  const { customers } = useCustomers(clientId);

  const findCustomerName = (customerId?: number | null) => {
    if (!customerId) return '-';
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return '-';
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
  };

  const formatCurrency = (value?: number | null) => {
    if (!value) return '-';
    return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
  };

  const isConsignment = acquisition.isConsigned;

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">
            {t('addVehicle.acquisition.title', { defaultValue: 'Adquisición' })}
          </h3>
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {isConsignment ? 'Consignación' : 'Compra'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Cliente/Proveedor */}
        <div className="p-2 bg-slate-50 rounded-lg">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">
            {isConsignment ? 'Consignatario' : 'Proveedor'}
          </p>
          <p className="text-sm font-semibold text-slate-900 truncate">
            {isConsignment
              ? findCustomerName(acquisition.consignmentCustomerId)
              : findCustomerName(acquisition.purchaseCustomerId)
            }
          </p>
        </div>

        {/* Precio */}
        <div className="p-2 bg-slate-50 rounded-lg">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">
            {isConsignment ? 'Precio acordado' : 'Precio de compra'}
          </p>
          <p className="text-sm font-semibold text-slate-900">
            {isConsignment
              ? formatCurrency(acquisition.consignmentAgreedPrice)
              : formatCurrency(acquisition.purchasePrice)
            }
          </p>
        </div>

        {/* Fecha de adquisición */}
        {acquisition.acquisitionDate && (
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
            <CalendarDays className="w-4 h-4 text-blue-500" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                {isConsignment ? 'Fecha de consignación' : 'Fecha de compra'}
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {new Date(acquisition.acquisitionDate + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {/* Notas */}
        {acquisition.documentNotes && (
          <div className="p-2 bg-slate-50 rounded-lg">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Notas</p>
            <p className="text-xs text-slate-600 line-clamp-2">
              {acquisition.documentNotes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcquisitionCard;
