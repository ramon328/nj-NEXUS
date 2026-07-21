-- Autos Intel — migración 2026-06-10
-- Agrega 'linze' como nueva fuente (source) para el scraper de linze.cl.
--
-- Contexto validado contra la estructura existente:
--   * listings.source es enum public.source_site = {chileautos, mercadolibre, yapo}.
--     => insertar source='linze' FALLA hasta agregar el valor al enum.
--   * Las tablas listings / price_history / listing_snapshots / scrape_runs son
--     agnósticas a la fuente (filtran por la columna source). No requieren cambios:
--     una vez que el enum acepta 'linze', los avisos de linze fluyen por el mismo
--     upsert, el mismo historial de precios y la misma reconciliación de vendidos
--     que el resto de las fuentes.
--
-- Nota de Postgres: ALTER TYPE ... ADD VALUE no puede ejecutarse dentro de un
-- bloque transaccional junto con el uso del nuevo valor, por eso NO va envuelto
-- en begin/commit. Es idempotente gracias a IF NOT EXISTS.

alter type public.source_site add value if not exists 'linze';

-- Verificación (opcional): debería listar los 4 valores.
--   select enum_range(null::public.source_site);
