-- Flag por venta: ¿el valor de transferencia (CRT) se le cobra al cliente
-- (se suma al total a pagar / saldo y aparece en la nota de venta) o es solo
-- informativo (se guarda como dato del auto pero no se cobra)?
--
-- Default TRUE para mantener consistencia con el comportamiento actual: los
-- documentos (nota de venta, cotización, reserva, cierre de negocio) ya suman
-- vehicles.transfer_value al total del cliente de forma incondicional. Dejar las
-- filas existentes en TRUE evita cambiar totales históricos. El toggle agrega la
-- capacidad NUEVA de marcar una venta puntual como "no cobrado".
--
-- IMPORTANTE: este flag NO afecta la utilidad/margen. El CRT sigue siendo
-- pass-through (excluido del margen en vehicleNetProfit / VehicleFinancialSummary).
ALTER TABLE vehicles_sales
  ADD COLUMN IF NOT EXISTS transfer_value_charged boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN vehicles_sales.transfer_value_charged IS
  'Si TRUE, el valor de transferencia (transfer_value) se le cobra al cliente: suma al total de la venta y aparece en la nota de venta. Si FALSE, es solo informativo. No afecta la utilidad/margen (el CRT es pass-through).';
