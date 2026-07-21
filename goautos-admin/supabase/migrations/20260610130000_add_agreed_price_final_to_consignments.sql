-- Consignación: precio garantizado REAJUSTADO.
--
-- Cuando el precio final de venta de un consignado difiere del precio acordado
-- inicial, la automotora puede renegociar con el consignante un nuevo "precio
-- garantizado". Guardamos ese reajuste en una columna aparte para PRESERVAR el
-- acordado original (`agreed_price`) y poder mostrar "acordado $X → reajustado $Y".
--
-- El cálculo de utilidad del consignado por precio garantizado usa el final si
-- está cargado, si no el acordado original:
--   utilidad bruta = sale_price − (agreed_price_final ?? agreed_price)

ALTER TABLE vehicles_consignments
  ADD COLUMN IF NOT EXISTS agreed_price_final DECIMAL(12,2);

ALTER TABLE vehicles_consignments
  ADD COLUMN IF NOT EXISTS agreed_price_adjusted_at TIMESTAMPTZ;

COMMENT ON COLUMN vehicles_consignments.agreed_price_final IS
  'Precio garantizado reajustado tras renegociar con el consignante (preserva agreed_price original). NULL = sin reajuste.';
