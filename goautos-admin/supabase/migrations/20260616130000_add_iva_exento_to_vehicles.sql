-- =============================================
-- Override de IVA exento POR VEHÍCULO.
--
-- Beichek agregó `clients.ventas_exentas_iva` (toggle por cliente). Esto agrega
-- un override por vehículo para automotoras con stock MIXTO (autos afectos y
-- exentos): `vehicles.iva_exento`.
--   - true  → exento (IVA = 0 en comisión/neto del vendedor)
--   - false → afecto (IVA 19%)
--   - NULL  → usar el default del cliente (clients.ventas_exentas_iva)
-- Nullable a propósito: NULL = "heredar del cliente", para no cambiar el
-- comportamiento de ningún auto existente.
-- =============================================

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS iva_exento BOOLEAN;

COMMENT ON COLUMN vehicles.iva_exento IS
  'Override de IVA por vehículo: true=exento, false=afecto, NULL=usar default del cliente (clients.ventas_exentas_iva).';
