
import * as z from 'zod';

export const quotationSchema = z.object({
  customer_id: z.string().optional(),
  estimated_price: z.string().min(1, { message: "El precio es requerido" }),
  validity_period: z.string().min(1, { message: "La validez es requerida" }),
  notes: z.string().optional(),
});

export type QuotationFormData = z.infer<typeof quotationSchema>;
