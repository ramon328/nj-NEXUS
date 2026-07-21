-- Marca un gasto/ingreso como PROVISIONAL (monto estimado "por mientras"), para
-- poder corregirlo después sin perder de vista que falta confirmarlo.
--
-- Caso de uso principal: comisiones de Transbank. La comisión real varía mes a mes
-- y las facturas de Transbank agrupan varios autos, así que al cargar el gasto se
-- deja un número estimado y se ajusta cuando llega la factura. El monto SÍ cuenta
-- en el resumen (es una estimación, no un cero); el flag solo lo marca como
-- "por confirmar" (badge en la línea de tiempo) para saber cuáles corregir.
--
-- Aditiva y reversible: default false → cero cambio en transacciones existentes.
ALTER TABLE vehicles_extras
  ADD COLUMN IF NOT EXISTS is_provisional boolean DEFAULT false;

COMMENT ON COLUMN vehicles_extras.is_provisional IS
  'Monto provisional/estimado por confirmar (ej. comisión Transbank). El monto cuenta en el resumen; el flag solo lo marca como pendiente de corregir.';
