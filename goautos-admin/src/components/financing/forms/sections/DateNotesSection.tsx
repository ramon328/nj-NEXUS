
import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { UseFormReturn } from 'react-hook-form';
import { FinancingFormValues } from '../FinancingFormSchema';
import { useI18n } from '@/hooks/useI18n';

type DateNotesSectionProps = {
  form: UseFormReturn<FinancingFormValues>;
};

const DateNotesSection = ({ form }: DateNotesSectionProps) => {
  const { tCommon } = useI18n();
  return (
    <>
      <FormField
        control={form.control}
        name="start_date"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-[12px] text-slate-500 font-normal">{tCommon('financing.form.labels.startDate')}</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal h-9 text-[13px] rounded-xl border-slate-200/60 overflow-hidden",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "PPP", { locale: es })
                    ) : (
                      <span>{tCommon('financing.form.placeholders.selectDate')}</span>
                    )}
                    <CalendarIcon className="ml-auto h-3.5 w-3.5 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) =>
                    date < new Date("1900-01-01")
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormDescription className="text-[11px] text-slate-400">
              {tCommon('financing.form.descriptions.startDate')}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-[12px] text-slate-500 font-normal">{tCommon('financing.form.labels.notes')}</FormLabel>
            <FormControl>
              <Textarea placeholder={tCommon('financing.form.placeholders.notes')} className="min-h-[80px] text-[13px] rounded-xl border-slate-200/60" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default DateNotesSection;
