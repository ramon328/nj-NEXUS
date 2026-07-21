import React from 'react';
import { Users, UserCheck } from 'lucide-react';
import { useConsignmentCustomer } from '@/hooks/useConsignmentCustomer';

type ConsignmentCustomerInfoProps = {
  vehicleId: number;
  isOpen: boolean;
};

const ConsignmentCustomerInfo = ({
  vehicleId,
  isOpen,
}: ConsignmentCustomerInfoProps) => {
  const { customer, consignmentSeller, loading } = useConsignmentCustomer(vehicleId);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className='bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] p-4'>
        <div className='flex items-center gap-2.5 animate-pulse'>
          <div className='h-8 w-8 bg-slate-100 rounded-xl'></div>
          <div className='h-4 bg-slate-100 rounded w-48'></div>
        </div>
      </div>
    );
  }

  if (!customer && !consignmentSeller) return null;

  const customerFields = customer ? [
    { label: 'Nombre completo', value: `${customer.first_name} ${customer.last_name}` },
    { label: 'RUT', value: customer.rut || 'No disponible' },
    { label: 'Email', value: customer.email || 'No disponible' },
    { label: 'Teléfono', value: customer.phone || 'No disponible' },
    { label: 'Dirección', value: customer.address || 'No disponible' },
  ] : [];

  return (
    <div className='space-y-3'>
      {/* Cliente consignante */}
      {customer && (
        <div className='bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] p-4'>
          <div className='flex items-center gap-2.5 mb-3'>
            <div className='h-8 w-8 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0'>
              <Users className='h-4 w-4 text-amber-600' />
            </div>
            <h2 className='text-base font-semibold text-slate-900'>
              Cliente Consignante
            </h2>
          </div>
          <div className='grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3'>
            {customerFields.map((field) => (
              <div key={field.label} className='flex flex-col gap-0.5'>
                <span className='text-[13px] text-slate-500 font-medium'>{field.label}</span>
                <span className='text-[13px] text-slate-900 font-semibold'>{field.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendedor que captó la consigna */}
      {consignmentSeller && (
        <div className='bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] p-4'>
          <div className='flex items-center gap-2.5'>
            <div className='h-8 w-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0'>
              <UserCheck className='h-4 w-4 text-blue-600' />
            </div>
            <div>
              <span className='text-[13px] text-slate-500'>Captado por</span>
              <p className='text-[14px] font-semibold text-slate-900'>
                {consignmentSeller.first_name} {consignmentSeller.last_name}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsignmentCustomerInfo;
