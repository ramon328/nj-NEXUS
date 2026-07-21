
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form
} from '@/components/ui/form';

import { financingFormSchema, FinancingFormValues } from './forms/FinancingFormSchema';
import { useFinancingFormData } from './hooks/useFinancingFormData';
import { useFinancingFormSubmit } from './hooks/useFinancingFormSubmit';
import VehicleCustomerSection from './forms/sections/VehicleCustomerSection';
import PaymentDetailsSection from './forms/sections/PaymentDetailsSection';
import DateNotesSection from './forms/sections/DateNotesSection';
import FormActions from './forms/sections/FormActions';

type FinanciamientoFormProps = {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: {
    id: number;
    [key: string]: any;
  };
};

const FinanciamientoForm = ({ onSuccess, onCancel, initialData }: FinanciamientoFormProps) => {
  const { vehicles, customers } = useFinancingFormData();
  const { onSubmit, isLoading } = useFinancingFormSubmit({ onSuccess, initialData });

  const form = useForm<FinancingFormValues>({
    resolver: zodResolver(financingFormSchema),
    defaultValues: initialData ? {
      vehicle_id: String(initialData.vehicle_id),
      customer_id: String(initialData.customer_id),
      downpayment: String(initialData.downpayment),
      monthly_installment: String(initialData.monthly_installment),
      payment_day: String(initialData.payment_day),
      total_installments: String(initialData.total_installments),
      start_date: new Date(initialData.start_date),
      notes: initialData.notes || '',
    } : {
      vehicle_id: '',
      customer_id: '',
      downpayment: '',
      monthly_installment: '',
      payment_day: '1',
      total_installments: '',
      start_date: new Date(),
      notes: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 min-w-0">
        {/* Card 1: Core financing data */}
        <div className="bg-white rounded-xl p-3 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
          <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-2">Datos del Financiamiento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0 [&>*]:min-w-0">
            <VehicleCustomerSection form={form} vehicles={vehicles} customers={customers} />
            <PaymentDetailsSection form={form} />
          </div>
        </div>

        {/* Card 2: Schedule & notes */}
        <div className="bg-white rounded-xl p-3 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
          <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium mb-2">Calendario de Pagos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0 [&>*]:min-w-0">
            <DateNotesSection form={form} />
          </div>
        </div>

        <FormActions onCancel={onCancel} isLoading={isLoading} />
      </form>
    </Form>
  );
};

export default FinanciamientoForm;
