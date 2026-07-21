-- Mejoras a sale_commission_splits para soportar:
-- 1. base_type por split (monto fijo / % venta / % margen). Hasta ahora
--    estaba a nivel venta (commission_base_type en vehicles_sales), pero
--    el modelo deseado lo requiere por línea de split.
-- 2. vendedor_nombre_snapshot: guarda el nombre del vendedor al momento de
--    crear el split. Sirve si el vendedor se elimina del sistema después.
-- 3. FK user_id pasa de ON DELETE CASCADE a ON DELETE SET NULL para
--    preservar el histórico de splits aunque se elimine el vendedor.

ALTER TABLE sale_commission_splits
  ADD COLUMN IF NOT EXISTS base_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS vendedor_nombre_snapshot VARCHAR(255);

ALTER TABLE sale_commission_splits
  DROP CONSTRAINT IF EXISTS sale_commission_splits_base_type_check;

ALTER TABLE sale_commission_splits
  ADD CONSTRAINT sale_commission_splits_base_type_check
    CHECK (
      base_type IS NULL
      OR base_type IN ('monto_fijo', 'porcentaje_venta', 'porcentaje_margen')
    );

-- Cambiar FK de ON DELETE CASCADE a ON DELETE SET NULL
ALTER TABLE sale_commission_splits
  DROP CONSTRAINT IF EXISTS sale_commission_splits_user_id_fkey;

ALTER TABLE sale_commission_splits
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE sale_commission_splits
  ADD CONSTRAINT sale_commission_splits_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN sale_commission_splits.base_type IS
  'Base de cálculo de la comisión de este split: monto_fijo | porcentaje_venta | porcentaje_margen';
COMMENT ON COLUMN sale_commission_splits.vendedor_nombre_snapshot IS
  'Nombre del vendedor al crear el split. Inmutable. Útil si user_id se anula por eliminación.';
