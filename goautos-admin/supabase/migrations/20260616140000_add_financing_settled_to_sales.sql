-- =============================================
-- Cuentas por cobrar de financieras (saldo pendiente).
--
-- En ventas a crédito, la financiera le debe a la automotora el monto financiado
-- (precio − pie/abonos del cliente). Hoy ese saldo sólo se mostraba en el form,
-- no se podía marcar como cobrado ni filtrar los pendientes (reportado por Beichek).
--
-- Se agregan 2 columnas a vehicles_sales para trackear el cobro a la financiera:
--   - financing_settled: true cuando la financiera ya pagó a la automotora.
--   - financing_settled_at: cuándo se marcó cobrado.
-- Sólo aplica a ventas a crédito (payment_method='credit'); en las demás se ignora.
-- Aditivo y con default FALSE → no cambia ninguna venta existente.
-- =============================================

ALTER TABLE vehicles_sales
  ADD COLUMN IF NOT EXISTS financing_settled BOOLEAN DEFAULT FALSE;

ALTER TABLE vehicles_sales
  ADD COLUMN IF NOT EXISTS financing_settled_at TIMESTAMPTZ;

COMMENT ON COLUMN vehicles_sales.financing_settled IS
  'Venta a crédito: true cuando la financiera ya pagó el monto financiado a la automotora.';
