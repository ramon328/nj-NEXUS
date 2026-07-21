import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { useFixedMonthlyExpenses } from '@/hooks/useFixedMonthlyExpenses';
import { FixedMonthlyExpense } from '@/types/fixedMonthlyExpenses';
import { useTranslation } from 'react-i18next';

interface FixedMonthlyExpensesFormProps {
  expense?: FixedMonthlyExpense;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const FixedMonthlyExpensesForm: React.FC<FixedMonthlyExpensesFormProps> = ({
  expense,
  onSuccess,
  trigger,
}) => {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createExpense, updateExpense } = useFixedMonthlyExpenses();

  const formSchema = useMemo(() => z.object({
    title: z.string().min(1, t('admin.fixedExpenses.validation.titleRequired')),
    description: z.string().optional(),
    amount: z.string().min(1, t('admin.fixedExpenses.validation.amountRequired')),
    is_active: z.boolean().default(true),
  }), [t]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: expense?.title || '',
      description: expense?.description || '',
      amount: expense?.amount?.toString() || '',
      is_active: expense?.is_active ?? true,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    try {
      const amount = parseFloat(values.amount.replace(/\./g, ''));

      const expenseData = {
        title: values.title,
        description: values.description,
        amount,
        is_active: values.is_active,
      };

      let success = false;
      if (expense) {
        success = await updateExpense(expense.id!, expenseData);
      } else {
        success = await createExpense(expenseData);
      }

      if (success) {
        setOpen(false);
        form.reset();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (value: string) => {
    // Remove all non-digits
    const digitsOnly = value.replace(/\D/g, '');
    // Add thousand separators
    return digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (value: string) => {
    const formatted = formatAmount(value);
    form.setValue('amount', formatted);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className='w-4 h-4 mr-2' />
            {t('admin.fixedExpenses.addButton')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>
            {expense
              ? t('admin.fixedExpenses.dialog.editTitle')
              : t('admin.fixedExpenses.dialog.createTitle')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='title'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.fixedExpenses.fields.title')} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('admin.fixedExpenses.fields.titlePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='amount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.fixedExpenses.fields.amount')} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('admin.fixedExpenses.fields.amountPlaceholder')}
                      {...field}
                      onChange={(e) => handleAmountChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('admin.fixedExpenses.fields.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('admin.fixedExpenses.fields.descriptionPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='is_active'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'>
                  <div className='space-y-0.5'>
                    <FormLabel>{t('admin.fixedExpenses.fields.active')}</FormLabel>
                    <div className='text-sm text-muted-foreground'>
                      {t('admin.fixedExpenses.fields.activeHint')}
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className='flex justify-end space-x-2 pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setOpen(false)}
              >
                {t('buttons.cancel')}
              </Button>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting
                  ? t('actions.saving')
                  : expense
                  ? t('buttons.update')
                  : t('buttons.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FixedMonthlyExpensesForm;
