import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, DollarSign, Calendar, FileText } from 'lucide-react';
import { FinancingDetailType } from '@/types/financing';
import { formatCurrency, formatDate } from '@/lib/utils';

type FinancingDetailsProps = {
  financing: FinancingDetailType;
};

const FinancingDetails = ({ financing }: FinancingDetailsProps) => {
  const { t } = useTranslation('common');

  const items = [
    {
      icon: CreditCard,
      label: t('financing.form.labels.downPayment'),
      value: formatCurrency(Number(financing.downpayment)),
    },
    {
      icon: DollarSign,
      label: t('financing.form.labels.monthlyInstallment'),
      value: formatCurrency(Number(financing.monthly_installment)),
    },
    {
      icon: Calendar,
      label: t('financing.form.labels.paymentDay'),
      value: `Día ${financing.payment_day}`,
    },
    {
      icon: FileText,
      label: t('financing.form.labels.totalInstallments'),
      value: `${financing.total_installments} cuotas`,
    },
    {
      icon: Calendar,
      label: t('financing.form.labels.startDate'),
      value: formatDate(financing.start_date),
    },
  ];

  return (
    <div className='bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 p-5'>
      <h3 className='text-[13px] font-medium text-slate-400 uppercase tracking-wider mb-4'>
        {t('financing.detail.financingDetailsTitle')}
      </h3>

      <div className='grid grid-cols-2 gap-3'>
        {items.map((item, i) => (
          <div
            key={i}
            className={`rounded-xl bg-slate-50/80 p-3 ${i === items.length - 1 && items.length % 2 !== 0 ? 'col-span-2' : ''}`}
          >
            <div className='flex items-center gap-2 mb-1'>
              <item.icon className='h-3.5 w-3.5 text-slate-400' />
              <span className='text-[11px] text-slate-400 font-medium'>{item.label}</span>
            </div>
            <p className='text-[14px] font-semibold text-slate-800'>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinancingDetails;
