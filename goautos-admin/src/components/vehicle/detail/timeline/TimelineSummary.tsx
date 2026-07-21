import React from 'react';
import { Icon } from '@iconify/react';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { REGIMEN_LABELS, type Regimen } from '@/utils/vehicleRegimen';

type TimelineSummaryProps = {
  eventCount: number;
  totalExpenses: number;
  totalIncome: number;
  /** Resultado canónico (utilidad bruta del helper unificado). Si viene, se usa
   *  tal cual para que cuadre con el Resumen Financiero; si no, cae al cálculo
   *  ingresos − gastos. */
  netResult?: number;
  /** Régimen tributario — paridad con el Resumen Financiero. */
  regimen?: Regimen;
  /** IVA débito fiscal informativo (afecto). */
  ivaDebitoFiscal?: number;
  isCompact?: boolean;
};

const TimelineSummary = ({
  eventCount,
  totalExpenses,
  totalIncome,
  netResult,
  regimen,
  ivaDebitoFiscal,
  isCompact = false,
}: TimelineSummaryProps) => {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation('vehicleTimeline');

  const formatCurrencyCompact = (amount: number) => {
    // Para el modo compacto, acortar valores grandes para celulares (con signo).
    if (isCompact) {
      const abs = Math.abs(amount);
      const sign = amount < 0 ? '-' : '';
      if (abs >= 1000000000) return sign + formatPrice(abs / 1000000000) + 'B';
      if (abs >= 1000000) return sign + formatPrice(abs / 1000000) + 'M';
      if (abs >= 1000) return sign + formatPrice(abs / 1000) + 'k';
    }
    return formatPrice(amount);
  };

  const result = netResult ?? totalIncome - totalExpenses;
  const resultPositive = result >= 0;
  return (
    <div className='mt-4 mb-10 space-y-2'>
      <div className='grid grid-cols-3 gap-2 sm:gap-5'>
      {/* Total profit */}
      <div
        className='bg-white rounded-2xl px-4 py-3 sm:px-6 sm:py-4 flex flex-col items-center justify-center sm:flex-row sm:items-center sm:justify-start gap-1 sm:gap-4 border border-slate-200/60 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)]'
      >
        <div
          className={`flex items-center justify-center w-5 h-5 sm:w-11 sm:h-11 rounded-full mb-1 sm:mb-0 ${
            resultPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'
          }`}
        >
          <Icon
            icon={resultPositive ? 'mdi:cash-multiple' : 'mdi:cash-remove'}
            className={resultPositive ? 'text-emerald-600' : 'text-red-600'}
            width={18}
            height={18}
            style={{ width: '18px', height: '18px' }}
          />
        </div>
        <div className='flex flex-col items-center sm:items-start'>
          <div className='text-slate-500 text-[8px] sm:text-sm font-medium mb-0.5 sm:mb-1 uppercase tracking-wide'>
            {t('summary.totalProfit')}
          </div>
          <div
            className={`text-xs sm:text-xl font-semibold ${
              resultPositive ? 'text-slate-900' : 'text-red-600'
            }`}
          >
            {formatCurrencyCompact(result)}
          </div>
        </div>
      </div>
      {/* Expenses */}
      <div
        className='bg-white rounded-2xl px-4 py-3 sm:px-6 sm:py-4 flex flex-col items-center justify-center sm:flex-row sm:items-center sm:justify-start gap-1 sm:gap-4 border border-slate-200/60 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)]'
      >
        <div className='flex items-center justify-center w-5 h-5 sm:w-11 sm:h-11 rounded-full bg-red-500/10 mb-1 sm:mb-0'>
          <Icon
            icon='mdi:trending-down'
            className='text-red-500'
            width={18}
            height={18}
            style={{ width: '18px', height: '18px' }}
          />
        </div>
        <div className='flex flex-col items-center sm:items-start'>
          <div className='text-slate-500 text-[8px] sm:text-sm font-medium mb-0.5 sm:mb-1 uppercase tracking-wide'>
            {t('summary.expenses')}
          </div>
          <div className='text-xs sm:text-xl font-semibold text-slate-900'>
            {formatCurrencyCompact(totalExpenses)}
          </div>
        </div>
      </div>
      {/* Income */}
      <div
        className='bg-white rounded-2xl px-4 py-3 sm:px-6 sm:py-4 flex flex-col items-center justify-center sm:flex-row sm:items-center sm:justify-start gap-1 sm:gap-4 border border-slate-200/60 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)]'
      >
        <div className='flex items-center justify-center w-5 h-5 sm:w-11 sm:h-11 rounded-full bg-emerald-500/10 mb-1 sm:mb-0'>
          <Icon
            icon='mdi:trending-up'
            className='text-emerald-600'
            width={18}
            height={18}
            style={{ width: '18px', height: '18px' }}
          />
        </div>
        <div className='flex flex-col items-center sm:items-start'>
          <div className='text-slate-500 text-[8px] sm:text-sm font-medium mb-0.5 sm:mb-1 uppercase tracking-wide'>
            {t('summary.income')}
          </div>
          <div className='text-xs sm:text-xl font-semibold text-slate-900'>
            {formatCurrencyCompact(totalIncome)}
          </div>
        </div>
      </div>
      </div>

      {/* Régimen + IVA débito (paridad con el Resumen Financiero) */}
      {regimen && (regimen === 'afecto' || regimen === 'exento') && (
        <div className='flex items-center justify-between rounded-xl border border-slate-200/60 bg-white px-4 py-2 text-[12px]'>
          <span className='flex items-center gap-1.5 text-slate-500'>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                regimen === 'afecto'
                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {REGIMEN_LABELS[regimen]}
            </span>
            {regimen === 'afecto' && 'IVA débito fiscal (19% incluido en el margen)'}
          </span>
          {regimen === 'afecto' && (
            <span className='tabular-nums text-slate-500'>
              {formatCurrencyCompact(ivaDebitoFiscal ?? 0)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineSummary;
