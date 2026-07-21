-- Comisión que paga la financiera a la automotora por una venta a crédito.
-- El vendedor la escribe a mano al registrar la venta (monto variable, no fijo).
-- Se suma a la utilidad de ese auto vía el helper unificado calculateVehicleNetProfit
-- (inyectada como ingreso de la automotora en los fetchers de utilidad).
--
-- Migración ADITIVA: columna opcional. No toca filas existentes ni rompe el
-- código actual. Uso interno: NO aparece en la nota de venta del cliente.

ALTER TABLE public.vehicles_sales
  ADD COLUMN IF NOT EXISTS financing_commission numeric;
