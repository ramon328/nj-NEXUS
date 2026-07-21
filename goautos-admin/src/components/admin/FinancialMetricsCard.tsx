import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FinancialMetricsCardProps {
  totalSales: number;
  totalExpenses: number;
  totalNetProfit: number;
  vehiclesSoldCount: number;
  loading: boolean;
}

const FinancialMetricsCard: React.FC<FinancialMetricsCardProps> = ({
  totalSales,
  totalExpenses,
  totalNetProfit,
  vehiclesSoldCount,
  loading,
}) => {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);

  // Calculate metrics
  const profitMargin = totalSales > 0 ? (totalNetProfit / totalSales) * 100 : 0;
  const roi = totalExpenses > 0 ? (totalNetProfit / totalExpenses) * 100 : 0;

  const MetricRow = ({
    label,
    value,
    isPercentage = false,
    isPositive = true
  }: {
    label: string;
    value: number;
    isPercentage?: boolean;
    isPositive?: boolean;
  }) => (
    <div className='flex justify-between items-center py-2 border-b border-slate-100 last:border-0'>
      <span className='text-[13px] text-slate-600'>{label}</span>
      <div className='flex items-center gap-2'>
        <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          {isPercentage ? `${value.toFixed(1)}%` : formatPrice(value)}
        </span>
        {isPositive ? (
          <TrendingUp className='h-4 w-4 text-emerald-600' />
        ) : (
          <TrendingDown className='h-4 w-4 text-red-600' />
        )}
      </div>
    </div>
  );

  return (
    <Card className='rounded-2xl border-slate-200/60 bg-white'>
      <CardHeader className='pb-3'>
        <div className='flex items-center gap-2'>
          <div className='text-primary'>
            <DollarSign className='h-5 w-5 opacity-70' />
          </div>
          <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight'>
            {dv('Métricas Financieras Clave', 'Key Financial Metrics')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='space-y-3'>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className='h-10 bg-slate-100 animate-pulse rounded' />
            ))}
          </div>
        ) : (
          <div className='space-y-1'>
            <MetricRow
              label={dv('Margen de Ganancia', 'Profit Margin')}
              value={profitMargin}
              isPercentage
              isPositive={profitMargin > 0}
            />
            <MetricRow
              label={dv('ROI (Retorno de Inversión)', 'ROI (Return on Investment)')}
              value={roi}
              isPercentage
              isPositive={roi > 0}
            />
            <MetricRow
              label={dv('Ganancia Neta', 'Net Profit')}
              value={totalNetProfit}
              isPositive={totalNetProfit > 0}
            />
            <MetricRow
              label={dv('Ganancia Promedio por Venta', 'Average Profit per Sale')}
              value={vehiclesSoldCount > 0 ? totalNetProfit / vehiclesSoldCount : 0}
              isPositive={totalNetProfit > 0}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialMetricsCard;
