-- Agrega soporte para método de consignación explícito.
-- Hasta ahora todas las consignaciones se trataban implícitamente como
-- "precio garantizado" (utilidad = sale_price − agreed_price). Esta migration
-- permite distinguir entre:
--   - precio_garantizado: la automotora le paga al consignante el agreed_price,
--     se queda con la diferencia. Utilidad = sale_price − agreed_price.
--   - comision: la automotora cobra una comisión sobre el precio de venta
--     (% + monto fijo opcional). Utilidad = sale_price × % + fijo.
--
-- El DEFAULT 'precio_garantizado' backfillea registros existentes manteniendo
-- el comportamiento actual sin tocar data.

ALTER TABLE vehicles_consignments
  ADD COLUMN IF NOT EXISTS metodo_consignacion VARCHAR(20)
    DEFAULT 'precio_garantizado' NOT NULL,
  ADD COLUMN IF NOT EXISTS porcentaje_comision_consignacion DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS monto_fijo_comision_consignacion DECIMAL(12, 2);

ALTER TABLE vehicles_consignments
  DROP CONSTRAINT IF EXISTS vehicles_consignments_metodo_consignacion_check;

ALTER TABLE vehicles_consignments
  ADD CONSTRAINT vehicles_consignments_metodo_consignacion_check
    CHECK (metodo_consignacion IN ('comision', 'precio_garantizado'));

COMMENT ON COLUMN vehicles_consignments.metodo_consignacion IS
  'Método de cobro de la consignación: precio_garantizado (utilidad=sale−agreed) o comision (utilidad=sale×%+fijo)';
COMMENT ON COLUMN vehicles_consignments.porcentaje_comision_consignacion IS
  'Porcentaje sobre el precio de venta cobrado por la automotora (solo si metodo=comision)';
COMMENT ON COLUMN vehicles_consignments.monto_fijo_comision_consignacion IS
  'Monto fijo cobrado por la automotora (solo si metodo=comision, puede sumarse al %)';
