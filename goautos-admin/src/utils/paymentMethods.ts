// Las llaves se almacenan en lowercase y el lookup es case-insensitive.
// Convivimos con dos universos de valores en producción:
//   - Sales / Nota de Compra:   códigos en inglés (cash, transfer, ...)
//   - Cierre de Negocio:        palabras en español (transferencia, efectivo, ...)
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  // Códigos en inglés
  cash: 'Efectivo',
  transfer: 'Transferencia',
  check: 'Cheque',
  vale_vista: 'Vale Vista',
  credit: 'Crédito',
  mixed: 'Mixto',
  'trade-in': 'Parte de Pago',
  // Variantes en español (datos legacy del módulo Cierre de Negocio)
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  credito: 'Crédito',
  mixto: 'Mixto',
};

export const getPaymentMethodLabel = (value?: string | null): string => {
  if (!value) return '';
  const mapped = PAYMENT_METHOD_LABELS[value.toLowerCase()];
  if (mapped) return mapped;
  // Fallback para valores legacy/desconocidos: garantizar mayúscula inicial
  // para no perder la presentación que daba `className='capitalize'`.
  return value.charAt(0).toUpperCase() + value.slice(1);
};

