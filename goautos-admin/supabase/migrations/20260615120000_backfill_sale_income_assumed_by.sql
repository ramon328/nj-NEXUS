-- =============================================
-- Backfill: filas legacy de `sale_income` sin `assumed_by`.
--
-- `vehicles_extras.assumed_by` tiene default 'dealership'. El cálculo de utilidad
-- (vehicleNetProfit.partitionExtras) trata un `sale_income` con assumed_by='dealership'
-- como GASTO, pero un `sale_income` es por definición un INGRESO que paga el cliente.
-- Las filas viejas (creadas antes de que el form setee assumed_by) quedaron en NULL →
-- default 'dealership' → restaban indebidamente de la utilidad.
--
-- Este backfill las marca como 'customer' (= ingreso de la automotora), consistente
-- con el default documentado del modal de cierre de venta. Sólo toca filas NULL, así
-- que es seguro re-correr y no pisa datos cargados a mano.
-- =============================================

UPDATE vehicles_extras
SET assumed_by = 'customer'
WHERE type = 'sale_income'
  AND assumed_by IS NULL;
