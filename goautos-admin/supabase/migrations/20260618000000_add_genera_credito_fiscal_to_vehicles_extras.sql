-- Fundamento contable de GoAuto — regla 3: bandera de IVA POR LÍNEA, no por documento.
-- Cada línea de gasto declara si genera crédito fiscal recuperable:
--   genera_credito_fiscal = true  → el costo carga el NETO (total − IVA recuperable)
--   genera_credito_fiscal = false → el costo carga el TOTAL
--   NULL (legacy / sin especificar) → se trata como TOTAL (no se descuenta IVA),
--     preservando exactamente el comportamiento actual.
-- El sistema NO puede aplicar /1,19 a ciegas: solo descuenta IVA en las líneas marcadas.
ALTER TABLE vehicles_extras
  ADD COLUMN IF NOT EXISTS genera_credito_fiscal boolean;

COMMENT ON COLUMN vehicles_extras.genera_credito_fiscal IS
  'Regla 3 fundamento contable: si true, la línea carga su NETO (total−IVA recuperable); si false/NULL, carga su TOTAL.';
