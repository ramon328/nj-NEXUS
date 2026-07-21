
import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { FinancingFormValues } from '../FinancingFormSchema';
import { useI18n } from '@/hooks/useI18n';

type PaymentDetailsSectionProps = {
  form: UseFormReturn<FinancingFormValues>;
};

const PaymentDetailsSection = ({ form }: PaymentDetailsSectionProps) => {
  const { tCommon } = useI18n();
  const paymentDays = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <>
      <FormField
        control={form.control}
        name="downpayment"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[12px] text-slate-500 font-normal">{tCommon('financing.form.labels.downPayment')}</FormLabel>
            <FormControl>
              <Input type="number" placeholder={tCommon('financing.form.placeholders.downPayment')} className="h-9 text-[13px] rounded-xl border-slate-200/60" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="monthly_installment"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[12px] text-slate-500 font-normal">{tCommon('financing.form.labels.monthlyInstallment')}</FormLabel>
            <FormControl>
              <Input type="number" placeholder={tCommon('financing.form.placeholders.monthlyInstallment')} className="h-9 text-[13px] rounded-xl border-slate-200/60" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="payment_day"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[12px] text-slate-500 font-normal">{tCommon('financing.form.labels.paymentDay')}</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger className="h-9 text-[13px] rounded-xl border-slate-200/60">
                  <SelectValue placeholder={tCommon('financing.form.placeholders.paymentDay')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {paymentDays.map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription className="text-[11px] text-slate-400">
              {tCommon('financing.form.descriptions.paymentDay')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="total_installments"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[12px] text-slate-500 font-normal">{tCommon('financing.form.labels.totalInstallments')}</FormLabel>
            <FormControl>
              <Input type="number" placeholder={tCommon('financing.form.placeholders.totalInstallments')} className="h-9 text-[13px] rounded-xl border-slate-200/60" {...field} />
            </FormControl>
            <FormDescription className="text-[11px] text-slate-400">
              {tCommon('financing.form.descriptions.totalInstallments')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default PaymentDetailsSection;
