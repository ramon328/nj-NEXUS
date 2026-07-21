/**
 * Regla 3 del fundamento contable de GoAuto (ver reference_goauto_fundamento_contable):
 * la bandera de IVA vive en la LÍNEA de gasto, no en el documento.
 *
 *   genera_crédito_fiscal = true  → la línea carga su NETO (total − IVA recuperable).
 *   genera_crédito_fiscal = false → la línea carga su TOTAL.
 *   undefined / null              → se trata como TOTAL (no descuenta IVA), preservando
 *                                   el comportamiento actual (no se aplica /1,19 a ciegas).
 *
 * Un mismo auto puede mezclar líneas de ambos tipos el mismo día (repuestos con factura
 * afecta = neto; contrato/boleta/derechos de transferencia = total).
 */

// Mismo valor que DEFAULT_IVA_PERCENTAGE (sellerCalculation), inline para mantener este
// módulo puro y sin dependencias (lo consume el helper de margen y el harness headless).
const DEFAULT_IVA_PERCENTAGE = 19;

const n = (x: unknown): number => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};

/**
 * Costo con el que una línea entra a la patente.
 * Solo descuenta IVA cuando la línea genera crédito fiscal recuperable.
 */
export const lineCostBasis = (
  amount: number,
  generaCreditoFiscal: boolean | null | undefined,
  ivaPct: number = DEFAULT_IVA_PERCENTAGE
): number => {
  const total = n(amount);
  if (generaCreditoFiscal === true) {
    return total / (1 + n(ivaPct) / 100);
  }
  return total;
};
