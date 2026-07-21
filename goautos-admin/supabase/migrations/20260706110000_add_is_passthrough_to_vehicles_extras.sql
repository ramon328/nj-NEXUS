-- Marca una línea de gasto/ingreso como PASS-THROUGH: dinero que la automotora
-- solo TRASPASA. Lo cobra al cliente y lo paga a un tercero (o al revés), sin que
-- quede utilidad ni costo real. Casos típicos: derechos de transferencia de dominio
-- (CRT) y comisión de tarjeta de crédito que se le cobran al comprador y se pagan al
-- toque — entran y salen sin dejar margen.
--
-- El problema que resuelve: el mismo concepto se digita en DOS lados (como ingreso
-- cobrado y como gasto pagado) con montos distintos; el diferencial recargo−costo
-- inflaba la utilidad (caso Ford SRZR56 consignado). No hay espejo automático: son
-- dos digitaciones manuales. La solución no es borrar ni deduplicar, sino marcar esas
-- líneas como pass-through para que queden INFORMATIVAS y NO sumen ni resten del
-- margen (ver partitionExtras en src/utils/vehicleNetProfit.ts).
--
-- Aditiva y reversible: default false → cero cambio en transacciones existentes.
ALTER TABLE vehicles_extras
  ADD COLUMN IF NOT EXISTS is_passthrough boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN vehicles_extras.is_passthrough IS
  'Dinero que la automotora solo traspasa (ej. CRT / comisión tarjeta cobrada al cliente y pagada a un tercero): no es gasto real ni ingreso real. Informativo, excluido del margen.';
