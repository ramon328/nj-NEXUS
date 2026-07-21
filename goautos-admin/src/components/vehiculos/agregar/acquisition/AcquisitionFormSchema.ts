import * as z from 'zod';

// Esquema base flexible para uso en componentes hijos
export const acquisitionFormSchema = z.object({
  acquisitionType: z.enum(['purchase', 'consignment', 'online_consignment']).default('purchase'),
  acquisitionDate: z.string().optional(),
  purchaseCustomerId: z.union([z.string(), z.number()]).optional(),
  purchasePrice: z.union([z.string(), z.number()]).optional(),
  // Régimen de IVA de la COMPRA (R2: se fija en la entrada y se hereda a la salida).
  // inherit = usar default del cliente (clients.ventas_exentas_iva); afecto = con
  // factura IVA; exento = sin IVA recuperable. Se mapea a vehicles.iva_exento.
  purchaseIvaMode: z.enum(['inherit', 'afecto', 'exento']).optional(),
  // IVA de COMPRA, independiente del régimen de venta: true = la compra tiene factura
  // afecta con IVA recuperable → el costo entra NETO. false/undefined = sin crédito
  // (bruto). Se mapea a vehicles_purchases.genera_credito_fiscal.
  purchaseGeneraCreditoFiscal: z.boolean().optional(),
  consignmentCustomerId: z.union([z.string(), z.number()]).optional(),
  consignmentAgreedPrice: z.union([z.string(), z.number()]).optional(),
  consignmentSuggestedPrice: z.union([z.string(), z.number()]).optional(),
  documentNotes: z.string().optional(),
  // Banking information for purchase payments
  purchaseBankName: z.string().optional(),
  purchaseAccountType: z.enum(['corriente', 'ahorro', 'vista', 'rut']).optional().or(z.literal('')),
  purchaseAccountNumber: z.string().optional(),
  purchaseAccountHolderName: z.string().optional(),
  purchaseAccountHolderRut: z.string().optional(),
  // Banking information for consignment payments
  consignmentBankName: z.string().optional(),
  consignmentAccountType: z.enum(['corriente', 'ahorro', 'vista', 'rut']).optional().or(z.literal('')),
  consignmentAccountNumber: z.string().optional(),
  consignmentAccountHolderName: z.string().optional(),
  consignmentAccountHolderRut: z.string().optional(),
  // New consignment fields
  consignmentSaleType: z.enum(['contado', 'credito']).nullish().or(z.literal('')),
  consignmentDealershipId: z.union([z.string(), z.number()]).optional(),
  consignmentFinanciera: z.string().optional(),
  consignmentSellerId: z.union([z.string(), z.number()]).optional(),
  // Método de consignación + sus parámetros. Sin default: se obliga a elegir
  // explícitamente (la validación vive en VehicleAcquisitionForm) para no asumir
  // 'precio_garantizado' por descuido, que restaba el auto como costo.
  consignmentMetodo: z
    .enum(['precio_garantizado', 'comision'])
    .optional(),
  consignmentComisionPercentage: z.union([z.string(), z.number()]).optional(),
  consignmentComisionFixed: z.union([z.string(), z.number()]).optional(),
});

export type AcquisitionFormValues = z.infer<typeof acquisitionFormSchema>;
