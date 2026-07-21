/**
 * Regla 5b del fundamento contable de GoAuto (ver reference_goauto_fundamento_contable):
 *
 * El valor de toma de un auto recibido en parte de pago NO se ingresa a mano: se DERIVA
 * del precio de venta REAL (no el publicado) menos la diferencia que el cliente paga en
 * efectivo. Así el costo de la unidad que entra y el margen de la que sale no "mienten".
 *
 *   valor_toma = precio_venta_real − diferencia_efectivo
 *   diferencia_efectivo = precio_venta_real − valor_toma   (relación inversa)
 *
 * Ejemplos del documento (mismo trato al cliente "tu auto + 20", distinta toma según el
 * precio real de cierre):
 *   - Mantengo el precio:  venta 100, diferencia 20 → toma 80
 *   - Ajusto el precio:    venta  90, diferencia 20 → toma 70
 */

const n = (x: unknown): number => {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
};

/** valor_toma = precio_venta_real − diferencia_efectivo (nunca negativo). */
export const deriveTradeInValue = (
  realSalePrice: number,
  cashDifference: number
): number => Math.max(0, n(realSalePrice) - n(cashDifference));

/**
 * diferencia_efectivo = precio_venta_real − valor_toma.
 * Puede ser NEGATIVA: si la toma supera el precio de venta, ese excedente es
 * "saldo a favor del cliente" (la automotora le queda debiendo la diferencia).
 */
export const cashDifferenceFromToma = (
  realSalePrice: number,
  tradeInValue: number
): number => n(realSalePrice) - n(tradeInValue);
