-- Backfill assumed_by='customer' para sale_additional huérfanos.
-- Los sale_additional son ingresos pagados por el cliente sobre el precio base
-- de venta. Hasta hoy se insertaban sin assumed_by, lo que hacía que el filtro
-- de la nota de venta (assumed_by='customer') los ignorara — los adicionales
-- quedaban "zombie": guardados en BD pero invisibles en nota y resumen.
-- A partir de esta migración, los inserts nuevos ya traen assumed_by='customer'
-- por default desde el código.

UPDATE vehicles_extras
SET assumed_by = 'customer'
WHERE type = 'sale_additional'
  AND assumed_by IS NULL;
