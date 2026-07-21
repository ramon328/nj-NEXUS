import React from 'react';
import { motion } from 'framer-motion';
import { Financing } from '@/types/financing';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye, Banknote } from 'lucide-react';
import { Link } from 'wouter';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import FinancingListRow from './FinancingListRow';
import FinancingStatusBadge from './FinancingStatusBadge';
import FinancingProgressBar from './FinancingProgressBar';
import { getNextPaymentDate, calculateProgress } from './utils/financingStatusUtils';
import { useI18n } from '@/hooks/useI18n';

type FinanciamientoListProps = {
  financingList: Financing[];
};

const FinanciamientoList = ({ financingList }: FinanciamientoListProps) => {
  const { tCommon } = useI18n();

  if (financingList.length === 0) {
    return (
      <div className='bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 py-16 flex flex-col items-center justify-center'>
        <div className='h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3'>
          <Banknote className='h-6 w-6 text-slate-400' />
        </div>
        <p className='text-[14px] font-medium text-slate-600'>{tCommon('financing.list.empty')}</p>
        <p className='text-[12px] text-slate-400 mt-1'>Agrega un financiamiento para comenzar</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className='hidden md:block bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent border-b border-slate-100'>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {tCommon('financing.list.headers.customer')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {tCommon('financing.list.headers.vehicle')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {tCommon('financing.list.headers.downPayment')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {tCommon('financing.list.headers.installment')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {tCommon('financing.list.headers.status')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {tCommon('financing.list.headers.nextPayment')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium'>
                {tCommon('financing.list.headers.progress')}
              </TableHead>
              <TableHead className='bg-slate-50/80 h-9 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium text-right'>
                {tCommon('general.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {financingList.map((financing) => (
              <FinancingListRow key={financing.id} financing={financing} />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className='space-y-2 md:hidden'>
        {financingList.map((financing, index) => {
          const customerName = financing.customer
            ? `${financing.customer.first_name} ${financing.customer.last_name}`
            : 'N/A';
          const vehicleInfo = financing.vehicle
            ? `${financing.vehicle.brand_id} ${financing.vehicle.year}`
            : 'N/A';
          const nextPayment = getNextPaymentDate(financing);
          const nextPaymentDisplay =
            nextPayment === 'No hay pagos programados'
              ? tCommon('financing.nextPayment.none')
              : nextPayment === 'Todos los pagos completados'
              ? tCommon('financing.nextPayment.completed')
              : nextPayment;
          const progress = calculateProgress(financing);
          const paidCount = financing.payments?.filter((p) => p.is_paid).length || 0;

          return (
            <motion.div
              key={financing.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className='bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 p-3.5'
            >
              {/* Header: name + badge */}
              <div className='flex items-center gap-3 mb-3'>
                <div className='flex-1 min-w-0'>
                  <p className='text-[14px] font-semibold text-slate-900 truncate'>{customerName}</p>
                  <p className='text-[12px] text-slate-400 truncate'>{vehicleInfo} · {financing.vehicle?.license_plate}</p>
                </div>
                <FinancingStatusBadge financing={financing} />
              </div>

              {/* Info Grid 2x2 */}
              <div className='grid grid-cols-2 gap-2.5 mb-3'>
                <div>
                  <p className='text-[11px] text-slate-400 font-medium uppercase tracking-wider'>Pie</p>
                  <p className='text-[13px] font-medium text-slate-700'>{formatCurrency(Number(financing.downpayment))}</p>
                </div>
                <div>
                  <p className='text-[11px] text-slate-400 font-medium uppercase tracking-wider'>Cuota</p>
                  <p className='text-[13px] font-medium text-slate-700'>{formatCurrency(Number(financing.monthly_installment))}</p>
                </div>
                <div>
                  <p className='text-[11px] text-slate-400 font-medium uppercase tracking-wider'>Próximo pago</p>
                  <p className='text-[13px] font-medium text-slate-700'>{nextPaymentDisplay}</p>
                </div>
                <div>
                  <p className='text-[11px] text-slate-400 font-medium uppercase tracking-wider'>Progreso</p>
                  <div className='flex items-center gap-1.5'>
                    <div className='flex-1 h-1.5 rounded-full bg-slate-100'>
                      <div
                        className='h-1.5 rounded-full bg-primary transition-all'
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <span className='text-[11px] text-slate-500 whitespace-nowrap'>
                      {paidCount}/{financing.total_installments}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <Button
                variant='outline'
                size='sm'
                className='w-full h-8 rounded-lg text-[12px] font-medium border-slate-200/60 hover:bg-slate-50'
                asChild
              >
                <Link href={`/financiamiento/${financing.id}`}>
                  <Eye className='mr-1.5 h-3.5 w-3.5' />
                  {tCommon('financing.list.buttons.viewDetail')}
                </Link>
              </Button>
            </motion.div>
          );
        })}
      </div>
    </>
  );
};

export default FinanciamientoList;
