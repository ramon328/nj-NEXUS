-- =============================================
-- Backfill del COSTO de los autos recibidos en parte de pago (trade-in).
--
-- Un auto recibido en parte de pago entra al stock con costo = valor de toma
-- (`trade_in_value`). El flujo actual (tradeInVehicleService.createTradeInVehicle)
-- escribe ese costo en DOS lugares:
--   - vehicles.purchase_price            (denormalizado, lo leen varias vistas)
--   - vehicles_purchases.purchase_price  (fuente del margen: fila más reciente)
--
-- Las tomas ANTIGUAS (previas al fix del servicio) quedaron con costo $0: el auto
-- recibido aparece con utilidad inflada (precio venta − 0) y el dashboard no cuadra.
-- Esta migración rellena ese costo desde la fuente autoritativa, SIN tocar costos
-- ya correctos.
--
-- Fuente del valor de toma (en orden de prioridad):
--   1. Junction `vehicles_sales_trade_ins` (autoritativa: una fila por auto recibido).
--   2. Legacy `vehicles_sales.trade_in_value` (sólo si el auto NO tiene fila en la
--      junction — la columna legacy guarda una sola toma por venta).
--
-- Es idempotente (sólo escribe donde el costo está en $0) y conservadora
-- (sólo afecta autos que efectivamente son tomas).
-- =============================================

-- CTE reutilizable: costo correcto por auto recibido en parte de pago.
WITH trade_in_costs AS (
  SELECT
    ti.trade_in_vehicle_id AS vehicle_id,
    MAX(ti.trade_in_value)  AS trade_in_value
  FROM vehicles_sales_trade_ins ti
  WHERE ti.trade_in_vehicle_id IS NOT NULL
    AND COALESCE(ti.trade_in_value, 0) > 0
  GROUP BY ti.trade_in_vehicle_id

  UNION

  SELECT
    s.trade_in_vehicle_id AS vehicle_id,
    MAX(s.trade_in_value)  AS trade_in_value
  FROM vehicles_sales s
  WHERE s.trade_in_vehicle_id IS NOT NULL
    AND COALESCE(s.trade_in_value, 0) > 0
    AND NOT EXISTS (
      SELECT 1 FROM vehicles_sales_trade_ins ti
      WHERE ti.trade_in_vehicle_id = s.trade_in_vehicle_id
        AND COALESCE(ti.trade_in_value, 0) > 0
    )
  GROUP BY s.trade_in_vehicle_id
)

-- Paso 1: rellenar vehicles.purchase_price donde quedó en $0.
UPDATE vehicles v
SET purchase_price = tc.trade_in_value,
    updated_at = now()
FROM trade_in_costs tc
WHERE v.id = tc.vehicle_id
  AND COALESCE(v.purchase_price, 0) = 0;

-- Paso 2: rellenar filas existentes de vehicles_purchases con precio $0.
WITH trade_in_costs AS (
  SELECT
    ti.trade_in_vehicle_id AS vehicle_id,
    MAX(ti.trade_in_value)  AS trade_in_value
  FROM vehicles_sales_trade_ins ti
  WHERE ti.trade_in_vehicle_id IS NOT NULL
    AND COALESCE(ti.trade_in_value, 0) > 0
  GROUP BY ti.trade_in_vehicle_id
  UNION
  SELECT
    s.trade_in_vehicle_id AS vehicle_id,
    MAX(s.trade_in_value)  AS trade_in_value
  FROM vehicles_sales s
  WHERE s.trade_in_vehicle_id IS NOT NULL
    AND COALESCE(s.trade_in_value, 0) > 0
    AND NOT EXISTS (
      SELECT 1 FROM vehicles_sales_trade_ins ti
      WHERE ti.trade_in_vehicle_id = s.trade_in_vehicle_id
        AND COALESCE(ti.trade_in_value, 0) > 0
    )
  GROUP BY s.trade_in_vehicle_id
)
UPDATE vehicles_purchases p
SET purchase_price = tc.trade_in_value
FROM trade_in_costs tc
WHERE p.vehicle_id = tc.vehicle_id
  AND COALESCE(p.purchase_price, 0) = 0;

-- Paso 3: crear la fila de costo para tomas que NO tienen ninguna en vehicles_purchases.
WITH trade_in_costs AS (
  SELECT
    ti.trade_in_vehicle_id AS vehicle_id,
    MAX(ti.trade_in_value)  AS trade_in_value
  FROM vehicles_sales_trade_ins ti
  WHERE ti.trade_in_vehicle_id IS NOT NULL
    AND COALESCE(ti.trade_in_value, 0) > 0
  GROUP BY ti.trade_in_vehicle_id
  UNION
  SELECT
    s.trade_in_vehicle_id AS vehicle_id,
    MAX(s.trade_in_value)  AS trade_in_value
  FROM vehicles_sales s
  WHERE s.trade_in_vehicle_id IS NOT NULL
    AND COALESCE(s.trade_in_value, 0) > 0
    AND NOT EXISTS (
      SELECT 1 FROM vehicles_sales_trade_ins ti
      WHERE ti.trade_in_vehicle_id = s.trade_in_vehicle_id
        AND COALESCE(ti.trade_in_value, 0) > 0
    )
  GROUP BY s.trade_in_vehicle_id
)
INSERT INTO vehicles_purchases
  (vehicle_id, customer_id, purchase_price, purchase_date, payment_method, notes, status)
SELECT
  v.id,
  NULL,
  tc.trade_in_value,
  COALESCE(v.created_at, now()),
  'trade-in',
  'Backfill costo parte de pago (migración 20260622000000)',
  'completed'
FROM trade_in_costs tc
JOIN vehicles v ON v.id = tc.vehicle_id
WHERE NOT EXISTS (
  SELECT 1 FROM vehicles_purchases p WHERE p.vehicle_id = v.id
);
