import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface Props {
  grossMargin: number;
  grossMarginPct: number;
  sellerCommissions: number;
  operationalExpenses: number;
  netMargin: number;
  netMarginPct: number;
  loading: boolean;
}

const Row: React.FC<{
  label: string;
  amount: string;
  pct?: string;
  emphasis?: boolean;
  subtle?: boolean;
}> = ({ label, amount, pct, emphasis, subtle }) => (
  <div className='flex items-baseline justify-between py-2 gap-3'>
    <span
      className={cn(
        'text-[13px] sm:text-sm',
        emphasis ? 'font-semibold text-slate-900' : 'text-slate-600',
        subtle && 'text-slate-500'
      )}
    >
      {label}
    </span>
    <span className='flex items-baseline gap-2 tabular-nums'>
      <span
        className={cn(
          'text-sm sm:text-base',
          emphasis ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
        )}
      >
        {amount}
      </span>
      {pct && (
        <span
          className={cn(
            'text-xs sm:text-sm tabular-nums',
            emphasis ? 'font-semibold text-slate-700' : 'text-slate-500'
          )}
        >
          {pct}
        </span>
      )}
    </span>
  </div>
);

const MargenBreakdown: React.FC<Props> = ({
  grossMargin,
  grossMarginPct,
  sellerCommissions,
  operationalExpenses,
  netMargin,
  netMarginPct,
  loading,
}) => {
  const { formatPrice } = useCurrency();
  const { t } = useTranslation('dashboard');

  if (loading) {
    return (
      <Card className='rounded-2xl bg-white border border-slate-200/60'>
        <CardContent className='p-5'>
          <div className='space-y-3'>
            <span className='inline-block w-40 h-5 bg-slate-100 animate-pulse rounded' />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className='flex items-center justify-between'>
                <span className='inline-block w-32 h-4 bg-slate-100 animate-pulse rounded' />
                <span className='inline-block w-24 h-4 bg-slate-100 animate-pulse rounded' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='rounded-2xl bg-white border border-slate-200/60'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm sm:text-base font-semibold text-slate-700'>
          {t('breakdown.title', 'Desglose de Rentabilidad')}
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-0 pb-4 px-5'>
        <Row
          label={t('stats.grossMargin')}
          amount={formatPrice(grossMargin)}
          pct={`${grossMarginPct.toFixed(1)}%`}
          emphasis
        />
        <Row
          label={`− ${t('stats.sellerCommissions')}`}
          amount={`−${formatPrice(sellerCommissions)}`}
          subtle
        />
        <Row
          label={`− ${t('stats.operationalExpenses')}`}
          amount={`−${formatPrice(operationalExpenses)}`}
          subtle
        />
        <div className='border-t border-slate-200 my-1' />
        <Row
          label={t('stats.netMargin')}
          amount={formatPrice(netMargin)}
          pct={`${netMarginPct.toFixed(1)}%`}
          emphasis
        />
      </CardContent>
    </Card>
  );
};

export default MargenBreakdown;
