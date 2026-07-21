
import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
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

type VehicleCustomerSectionProps = {
  form: UseFormReturn<FinancingFormValues>;
  vehicles: any[];
  customers: any[];
};

const VehicleCustomerSection = ({ form, vehicles, customers }: VehicleCustomerSectionProps) => {
  const { tCommon } = useI18n();
  return (
    <>
      <FormField
        control={form.control}
        name="vehicle_id"
        render={({ field }) => (
          <FormItem className="min-w-0">
            <FormLabel className="text-[12px] text-slate-500 font-normal">{tCommon('financing.form.labels.vehicle')}</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger className="h-9 text-[13px] rounded-xl border-slate-200/60">
                  <SelectValue placeholder={tCommon('financing.form.placeholders.selectVehicle')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                    {`${vehicle.brand_id} - ${vehicle.year} (${vehicle.license_plate || tCommon('financing.form.noPlate')})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="customer_id"
        render={({ field }) => (
          <FormItem className="min-w-0">
            <FormLabel className="text-[12px] text-slate-500 font-normal">{tCommon('financing.form.labels.customer')}</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger className="h-9 text-[13px] rounded-xl border-slate-200/60">
                  <SelectValue placeholder={tCommon('financing.form.placeholders.selectCustomer')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={String(customer.id)}>
                    {`${customer.first_name} ${customer.last_name} (${customer.rut || tCommon('financing.form.noRut')})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default VehicleCustomerSection;
