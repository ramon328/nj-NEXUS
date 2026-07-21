/**
 * Régimen tributario del vehículo — regla 2 del fundamento contable de GoAuto
 * (ver reference_goauto_fundamento_contable).
 *
 * "El régimen (afecto / exento / consignación) se fija en la ENTRADA y se hereda en la
 *  SALIDA." Acá lo formalizamos como un concepto único, derivado de los campos que ya
 *  existen (is_consigned + iva_exento), para que todo el código lo lea igual.
 *
 * Encadenamiento (cómo acumula el costo en la patente):
 *   - afecto       → NETOS  (total − IVA recuperable); la salida factura afecta (con IVA).
 *   - exento       → TOTALES (sin IVA recuperable);    la salida es exenta / contrato.
 *   - consignación → NO entra al stock propio;         la salida factura solo comisión + IVA.
 */

export type Regimen = 'afecto' | 'exento' | 'consignacion';

export interface RegimenSource {
  is_consigned?: boolean | null;
  iva_exento?: boolean | null;
}

/**
 * Régimen del vehículo. consignación manda sobre todo; si no, exento/afecto según
 * iva_exento (null = hereda el default del cliente, `clientExempt`).
 */
export const getVehicleRegimen = (
  v: RegimenSource | null | undefined,
  clientExempt = false
): Regimen => {
  if (v?.is_consigned) return 'consignacion';
  const exempt = v?.iva_exento ?? clientExempt;
  return exempt ? 'exento' : 'afecto';
};

/** Base de costo que acumula la patente según el régimen. */
export type CostBasis = 'neto' | 'total' | 'sin_stock';
export const regimenCostBasis = (r: Regimen): CostBasis =>
  r === 'afecto' ? 'neto' : r === 'exento' ? 'total' : 'sin_stock';

/**
 * ¿La VENTA del auto lleva IVA? Solo el régimen afecto. Exento no; en consignación la
 * automotora no vende el auto (factura solo la comisión), así que la venta del auto no
 * lleva IVA recuperable de la automotora.
 */
export const regimenSaleHasIva = (r: Regimen): boolean => r === 'afecto';

export const REGIMEN_LABELS: Record<Regimen, string> = {
  afecto: 'Afecto (con IVA)',
  exento: 'Exento (sin IVA)',
  consignacion: 'Consignación',
};
