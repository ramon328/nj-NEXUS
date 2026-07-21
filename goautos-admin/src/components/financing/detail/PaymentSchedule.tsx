import React from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { FinancingDetailType, FinancingPayment } from '@/types/financing';
import { formatCurrency, formatDate, formatDateShort } from '@/lib/utils';

type PaymentScheduleProps = {
  financing: FinancingDetailType;
  onMarkAsPaid: (payment: FinancingPayment) => void;
};

const PaymentSchedule = ({ financing, onMarkAsPaid }: PaymentScheduleProps) => {
  const { t } = useTranslation('common');

  const calculateTotalAmount = () => {
    return Number(financing.monthly_installment) * financing.total_installments;
  };

  const calculateRemainingBalance = () => {
    const totalAmount = calculateTotalAmount();
    const amountPaid = financing.payments
      .filter(payment => payment.is_paid)
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
    return totalAmount - amountPaid;
  };

  const getPaymentRowStatus = (payment: FinancingPayment) => {
    if (payment.is_paid) {
      return {
        status: 'paid',
        label: t('financing.detail.paymentSchedule.status.paid'),
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
        rowClass: 'bg-emerald-50/30',
      };
    }

    const dueDate = new Date(payment.due_date);
    const today = new Date();

    if (dueDate < today) {
      return {
        status: 'late',
        label: t('financing.detail.paymentSchedule.status.late'),
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        badgeClass: 'bg-red-50 text-red-700 border-red-200/60',
        rowClass: '',
      };
    } else {
      return {
        status: 'pending',
        label: t('financing.detail.paymentSchedule.status.pending'),
        icon: <Clock className="h-3.5 w-3.5" />,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/60',
        rowClass: '',
      };
    }
  };

  const sortedPayments = [...financing.payments].sort((a, b) => a.installment_number - b.installment_number);
  const totalAmount = calculateTotalAmount();
  const remainingBalance = calculateRemainingBalance();

  return (
    <div className='lg:col-span-3 bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden'>
      <div className='px-5 pt-5 pb-3'>
        <h3 className='text-[13px] font-medium text-slate-400 uppercase tracking-wider'>
          {t('financing.detail.paymentSchedule.title')}
        </h3>
      </div>

      {/* Desktop Table */}
      <div className='hidden md:block'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent border-b border-slate-100'>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {t('financing.detail.paymentSchedule.headers.installment')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {t('financing.detail.paymentSchedule.headers.dueDate')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {t('financing.detail.paymentSchedule.headers.amount')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {t('financing.detail.paymentSchedule.headers.status')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {t('financing.detail.paymentSchedule.headers.paymentDate')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {t('financing.detail.paymentSchedule.headers.interest')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {t('financing.detail.paymentSchedule.headers.notes')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium text-right'>
                {t('financing.detail.paymentSchedule.headers.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayments.length > 0 ? (
              sortedPayments.map((payment) => {
                const status = getPaymentRowStatus(payment);
                return (
                  <TableRow key={payment.installment_number} className={`hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-b-0 ${status.rowClass}`}>
                    <TableCell className='px-3 py-3 text-[13px] text-slate-700 font-medium'>
                      #{payment.installment_number}
                    </TableCell>
                    <TableCell className='px-3 py-3 text-[13px] text-slate-700'>{formatDate(payment.due_date)}</TableCell>
                    <TableCell className='px-3 py-3 text-[13px] text-slate-700 font-medium'>{formatCurrency(Number(payment.amount))}</TableCell>
                    <TableCell className='px-3 py-3'>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${status.badgeClass}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className='px-3 py-3 text-[13px] text-slate-500'>
                      {payment.payment_date ? formatDate(payment.payment_date) : "-"}
                    </TableCell>
                    <TableCell className='px-3 py-3 text-[13px] text-slate-500'>
                      {payment.interest_amount > 0 ? formatCurrency(Number(payment.interest_amount)) : "-"}
                    </TableCell>
                    <TableCell className='px-3 py-3 text-[13px] text-slate-500 max-w-[150px] truncate'>
                      {payment.notes || "-"}
                    </TableCell>
                    <TableCell className='px-3 py-3 text-right'>
                      {!payment.is_paid && (
                        <Button
                          variant="outline"
                          size="sm"
                          className='h-8 rounded-lg text-[12px] font-medium border-slate-200/60 hover:bg-slate-50'
                          onClick={() => onMarkAsPaid(payment)}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          {t('financing.detail.paymentSchedule.buttons.markPaid')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-[13px] text-slate-400">
                  {t('financing.detail.paymentSchedule.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className='md:hidden px-3.5 pb-2'>
        {sortedPayments.length > 0 ? (
          <div className='space-y-2'>
            {sortedPayments.map((payment) => {
              const status = getPaymentRowStatus(payment);
              return (
                <div
                  key={payment.installment_number}
                  className={`rounded-xl border border-slate-100 p-3 ${status.rowClass}`}
                >
                  <div className='flex items-center justify-between mb-2'>
                    <span className='text-[13px] font-medium text-slate-700'>
                      Cuota #{payment.installment_number}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${status.badgeClass}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  <div className='grid grid-cols-2 gap-2 text-[12px]'>
                    <div>
                      <span className='text-slate-400'>Vencimiento</span>
                      <p className='text-slate-700 font-medium'>{formatDateShort(payment.due_date)}</p>
                    </div>
                    <div>
                      <span className='text-slate-400'>Monto</span>
                      <p className='text-slate-700 font-medium'>{formatCurrency(Number(payment.amount))}</p>
                    </div>
                    {payment.payment_date && (
                      <div>
                        <span className='text-slate-400'>Fecha pago</span>
                        <p className='text-slate-700 font-medium'>{formatDateShort(payment.payment_date)}</p>
                      </div>
                    )}
                    {payment.interest_amount > 0 && (
                      <div>
                        <span className='text-slate-400'>Interés</span>
                        <p className='text-slate-700 font-medium'>{formatCurrency(Number(payment.interest_amount))}</p>
                      </div>
                    )}
                  </div>
                  {!payment.is_paid && (
                    <Button
                      variant="outline"
                      size="sm"
                      className='w-full mt-2.5 h-8 rounded-lg text-[12px] font-medium border-slate-200/60 hover:bg-slate-50'
                      onClick={() => onMarkAsPaid(payment)}
                    >
                      <CheckCircle className="mr-1 h-3.5 w-3.5" />
                      {t('financing.detail.paymentSchedule.buttons.markPaid')}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className='py-8 text-center text-[13px] text-slate-400'>
            {t('financing.detail.paymentSchedule.empty')}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className='flex justify-between items-center border-t border-slate-100 px-5 py-3.5'>
        <div>
          <span className='block text-[11px] text-slate-400 font-medium uppercase tracking-wider'>
            {t('financing.detail.paymentSchedule.totalAmount')}
          </span>
          <span className='text-[15px] font-semibold text-slate-900'>{formatCurrency(totalAmount)}</span>
        </div>
        <div className='text-right'>
          <span className='block text-[11px] text-slate-400 font-medium uppercase tracking-wider'>
            {t('financing.detail.paymentSchedule.remainingBalance')}
          </span>
          <span className='text-[15px] font-semibold text-amber-600'>{formatCurrency(remainingBalance)}</span>
        </div>
      </div>
    </div>
  );
};

export default PaymentSchedule;
