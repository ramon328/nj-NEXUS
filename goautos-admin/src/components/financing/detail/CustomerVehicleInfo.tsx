import React from 'react';
import { useTranslation } from 'react-i18next';
import { FinancingDetailType } from '@/types/financing';
import { Car, Hash } from 'lucide-react';

type CustomerVehicleInfoProps = {
  financing: FinancingDetailType;
};

const CustomerVehicleInfo = ({ financing }: CustomerVehicleInfoProps) => {
  const { t } = useTranslation('common');

  return (
    <div className='bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 p-5'>
      <h3 className='text-[13px] font-medium text-slate-400 uppercase tracking-wider mb-4'>
        {t('financing.detail.title')}
      </h3>

      {/* Customer */}
      <div className='mb-5'>
        <p className='text-[15px] font-semibold text-slate-900'>
          {financing.customer.first_name} {financing.customer.last_name}
        </p>
        <p className='text-[12px] text-slate-400'>{financing.customer.rut}</p>
      </div>

      {/* Vehicle info */}
      <div className='space-y-3'>
        <div className='flex items-center gap-3'>
          <div className='h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center'>
            <Car className='h-4 w-4 text-slate-400' />
          </div>
          <div>
            <p className='text-[11px] text-slate-400'>{t('financing.detail.labels.vehicle')}</p>
            <p className='text-[14px] font-medium text-slate-800'>
              {financing.vehicle.brand_id} {financing.vehicle.year}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <div className='h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center'>
            <Hash className='h-4 w-4 text-slate-400' />
          </div>
          <div>
            <p className='text-[11px] text-slate-400'>{t('financing.detail.labels.licensePlate')}</p>
            <p className='text-[14px] font-medium text-slate-800'>
              {financing.vehicle.license_plate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerVehicleInfo;
