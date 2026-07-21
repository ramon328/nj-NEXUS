-- =============================================
-- Backfill conservador del método de consignación legacy.
--
-- `metodo_consignacion` se agregó con DEFAULT 'precio_garantizado' NOT NULL, así
-- que TODA fila previa al feature quedó marcada 'precio_garantizado'. Para esas,
-- el cálculo de utilidad hace `sale_price − agreed_price`. Pero si la consignación
-- era en realidad por COMISIÓN (la automotora cobra %/monto fijo y NO compra el
-- auto), quedó mal: utilidad ≈ 0 o negativa (reportado por Mallorca/Carklass/MAO).
--
-- Heurística SEGURA: sólo reclasifica a 'comision' las filas que
--   (a) siguen en el default 'precio_garantizado', Y
--   (b) tienen configuración de comisión (% o monto fijo > 0), Y
--   (c) NO tienen precio acordado (agreed_price nulo/0) — un garantizado real SIEMPRE
--       tiene agreed_price, así que sin él + con comisión es inequívocamente comisión.
-- Es idempotente y no toca consignaciones garantizadas legítimas.
-- =============================================

UPDATE vehicles_consignments
SET metodo_consignacion = 'comision'
WHERE metodo_consignacion = 'precio_garantizado'
  AND (
    COALESCE(porcentaje_comision_consignacion, 0) > 0
    OR COALESCE(monto_fijo_comision_consignacion, 0) > 0
  )
  AND COALESCE(agreed_price, 0) = 0;
