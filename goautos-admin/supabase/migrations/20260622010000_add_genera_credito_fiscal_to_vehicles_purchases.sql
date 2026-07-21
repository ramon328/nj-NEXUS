-- Fundamento contable de GoAuto — IVA de COMPRA, independiente del IVA de VENTA.
--
-- La COMPRA de un auto propio puede tener factura afecta con IVA recuperable
-- (crédito fiscal), igual que un gasto (regla 3). Hasta ahora el precio de compra
-- entraba SIEMPRE bruto al margen; esta columna permite marcar la compra como
-- "con IVA recuperable" para que el costo entre por su NETO (total − IVA).
--
--   genera_credito_fiscal = true  → el costo de compra carga el NETO (total / 1,19)
--   genera_credito_fiscal = false → carga el TOTAL (compra sin factura / sin crédito)
--   NULL (legacy / sin especificar) → se trata como TOTAL, preservando EXACTAMENTE
--     el comportamiento actual (cero cambio en autos existentes).
--
-- Es independiente de `vehicles.iva_exento` (que define el IVA de la VENTA / débito
-- fiscal): se puede comprar con IVA y vender exento, o comprar sin IVA y vender afecto.
ALTER TABLE vehicles_purchases
  ADD COLUMN IF NOT EXISTS genera_credito_fiscal boolean;

COMMENT ON COLUMN vehicles_purchases.genera_credito_fiscal IS
  'IVA de compra (independiente del régimen de venta): si true, el costo de compra carga su NETO (total−IVA recuperable); si false/NULL, carga su TOTAL.';
