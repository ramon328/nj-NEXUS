import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/useCurrency';
import { ShoppingBag, Car, Wallet, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MonthlyAdminData } from '@/hooks/admin/types';

interface ExpensesBreakdownCardProps {
  monthlyData: MonthlyAdminData[];
  loading: boolean;
}

const ExpensesBreakdownCard: React.FC<ExpensesBreakdownCardProps> = ({
  monthlyData,
  loading,
}) => {
  const { formatPrice } = useCurrency();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) => (i18n.language?.toLowerCase().startsWith('es') ? es : en);

  // Calculate totals from monthly data
  const vehicleExpenses = monthlyData.reduce((sum, item) => sum + item.vehicleExpenses, 0);
  const commonExpenses = monthlyData.reduce((sum, item) => sum + item.commonExpenses, 0);
  const commissions = monthlyData.reduce((sum, item) => sum + item.commissions, 0);
  const totalExpenses = vehicleExpenses + commonExpenses + commissions;

  const ExpenseRow = ({
    icon: Icon,
    label,
    amount,
    color,
  }: {
    icon: any;
    label: string;
    amount: number;
    color: string;
  }) => {
    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;

    return (
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className='h-4 w-4 text-white' />
            </div>
            <span className='text-sm font-medium text-gray-700'>{label}</span>
          </div>
          <div className='text-right'>
            <p className='text-sm font-semibold text-gray-900'>{formatPrice(amount)}</p>
            <p className='text-xs text-gray-500'>{percentage.toFixed(1)}%</p>
          </div>
        </div>
        <div className='w-full bg-gray-200 rounded-full h-2'>
          <div
            className={`h-2 rounded-full transition-all ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <Card className='border bg-white'>
      <CardHeader className='pb-3'>
        <div className='flex items-center gap-2'>
          <div className='text-primary'>
            <ShoppingBag className='h-5 w-5 opacity-70' />
          </div>
          <CardTitle className='text-lg font-medium'>
            {dv('Desglose de Gastos', 'Expenses Breakdown')}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='space-y-4'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='space-y-2'>
                <div className='h-10 bg-gray-100 animate-pulse rounded' />
                <div className='h-2 bg-gray-100 animate-pulse rounded-full' />
              </div>
            ))}
          </div>
        ) : (
          <div className='space-y-4'>
            <ExpenseRow
              icon={Car}
              label={dv('Gastos de Vehículos', 'Vehicle Expenses')}
              amount={vehicleExpenses}
              color='bg-blue-500'
            />
            <ExpenseRow
              icon={ShoppingBag}
              label={dv('Gastos Comunes', 'Common Expenses')}
              amount={commonExpenses}
              color='bg-gray-500'
            />
            <ExpenseRow
              icon={Wallet}
              label={dv('Comisiones', 'Commissions')}
              amount={commissions}
              color='bg-purple-500'
            />
            <div className='pt-3 border-t border-gray-200'>
              <div className='flex justify-between items-center'>
                <span className='text-sm font-semibold text-gray-700'>
                  {dv('Total de Gastos', 'Total Expenses')}
                </span>
                <span className='text-lg font-bold text-gray-900'>
                  {formatPrice(totalExpenses)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpensesBreakdownCard;
