import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, DollarSign } from 'lucide-react';
import { useFixedMonthlyExpenses } from '@/hooks/useFixedMonthlyExpenses';
import FixedMonthlyExpensesForm from './FixedMonthlyExpensesForm';
import { useCurrency } from '@/hooks/useCurrency';
import { useI18n } from '@/hooks/useI18n';
import { useTranslation } from 'react-i18next';

const FixedMonthlyExpensesManager = () => {
  const { formatPrice } = useCurrency();
  const { tCommon, tForm } = useI18n();
  const { t: tDashboard } = useTranslation('dashboard');
  const {
    expenses,
    isLoading,
    deleteExpense,
    toggleActiveStatus,
    getTotalMonthlyAmount,
    refetch,
  } = useFixedMonthlyExpenses();

  const handleDelete = async (id: number) => {
    if (confirm(tForm('messages.confirmDelete'))) {
      await deleteExpense(id);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    await toggleActiveStatus(id, !currentStatus);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {tDashboard('fixedExpenses.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8'>{tCommon('actions.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle className='flex items-center gap-2'>
            <DollarSign className='w-5 h-5' />
            {tDashboard('fixedExpenses.title')}
          </CardTitle>
          <p className='text-sm text-muted-foreground mt-1'>
            {tDashboard('fixedExpenses.monthlyTotal')}: {formatPrice(
              getTotalMonthlyAmount()
            )}
          </p>
        </div>
        <FixedMonthlyExpensesForm onSuccess={refetch} />
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>
            {tDashboard('fixedExpenses.empty')}
            <br />
            {tDashboard('fixedExpenses.hint')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tForm('labels.title')}</TableHead>
                <TableHead>{tForm('labels.description')}</TableHead>
                <TableHead className='text-right'>
                  {tForm('labels.amount')}
                </TableHead>
                <TableHead className='text-center'>
                  {tForm('labels.status')}
                </TableHead>
                <TableHead className='text-center'>
                  {tCommon('general.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className='font-medium'>{expense.title}</TableCell>
                  <TableCell className='text-muted-foreground'>
                    {expense.description || '-'}
                  </TableCell>
                  <TableCell className='text-right font-mono'>
                    {formatPrice(expense.amount)}
                  </TableCell>
                  <TableCell className='text-center'>
                    <Badge
                      variant={expense.is_active ? 'default' : 'secondary'}
                      className='cursor-pointer'
                      onClick={() =>
                        handleToggleActive(expense.id!, expense.is_active)
                      }
                    >
                      {expense.is_active
                        ? tCommon('status.active')
                        : tCommon('status.inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-center'>
                    <div className='flex justify-center gap-2'>
                      <FixedMonthlyExpensesForm
                        expense={expense}
                        onSuccess={refetch}
                        trigger={
                          <Button variant='ghost' size='sm'>
                            <Edit className='w-4 h-4' />
                          </Button>
                        }
                      />
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleDelete(expense.id!)}
                        className='text-destructive hover:text-destructive'
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default FixedMonthlyExpensesManager;
