
import { z } from 'zod';

export const financingFormSchema = z.object({
  vehicle_id: z.string().min(1, "Seleccione un vehículo"),
  customer_id: z.string().min(1, "Seleccione un cliente"),
  downpayment: z.string().min(1, "Ingrese un monto de pie"),
  monthly_installment: z.string().min(1, "Ingrese un monto de cuota"),
  payment_day: z.string().min(1, "Seleccione un día de pago"),
  total_installments: z.string().min(1, "Ingrese un número de cuotas"),
  start_date: z.date(),
  notes: z.string().optional(),
});

export type FinancingFormValues = z.infer<typeof financingFormSchema>;
