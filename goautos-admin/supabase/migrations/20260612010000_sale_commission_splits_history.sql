-- =============================================
-- Historial / auditoría de movimientos de comisión de vendedor.
--
-- Antes la línea de tiempo solo mostraba el ESTADO ACTUAL de
-- sale_commission_splits: si se editaba o borraba un split, el movimiento se
-- perdía (no quedaba rastro de cuándo/quién/cuánto). Esta tabla + trigger
-- registra cada alta/edición/baja, sin importar el call site (drawer del
-- vehículo, servicio de cierre de venta, o SQL manual).
-- =============================================

CREATE TABLE IF NOT EXISTS sale_commission_splits_history (
  id BIGSERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL,
  split_id INTEGER,                 -- id del split afectado (puede ya no existir tras un delete)
  seller_id INTEGER,                -- user_id del vendedor
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  amount NUMERIC,                   -- monto nuevo (o el que tenía al borrar)
  previous_amount NUMERIC,          -- monto anterior (solo en 'updated')
  percentage NUMERIC,
  split_type TEXT,
  vendedor_nombre_snapshot TEXT,    -- nombre del vendedor al momento del movimiento
  changed_by INTEGER,               -- users.id del actor (NULL si no se pudo resolver)
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_splits_history_sale
  ON sale_commission_splits_history (sale_id, changed_at);

-- Trigger: captura INSERT/UPDATE/DELETE. SECURITY DEFINER para poder escribir
-- el historial aunque la RLS del propio historial sea de solo lectura para los
-- clientes (las escrituras las hace exclusivamente este trigger).
CREATE OR REPLACE FUNCTION log_sale_commission_split_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor INTEGER;
BEGIN
  SELECT id INTO v_actor FROM users WHERE auth_id = auth.uid();

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO sale_commission_splits_history
      (sale_id, split_id, seller_id, action, amount, percentage, split_type, vendedor_nombre_snapshot, changed_by)
    VALUES
      (NEW.sale_id, NEW.id, NEW.user_id, 'created', NEW.amount, NEW.percentage, NEW.split_type, NEW.vendedor_nombre_snapshot, v_actor);
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    -- Solo registrar si cambió algo relevante (monto, vendedor o porcentaje).
    IF (NEW.amount IS DISTINCT FROM OLD.amount
        OR NEW.user_id IS DISTINCT FROM OLD.user_id
        OR NEW.percentage IS DISTINCT FROM OLD.percentage) THEN
      INSERT INTO sale_commission_splits_history
        (sale_id, split_id, seller_id, action, amount, previous_amount, percentage, split_type, vendedor_nombre_snapshot, changed_by)
      VALUES
        (NEW.sale_id, NEW.id, NEW.user_id, 'updated', NEW.amount, OLD.amount, NEW.percentage, NEW.split_type, NEW.vendedor_nombre_snapshot, v_actor);
    END IF;
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO sale_commission_splits_history
      (sale_id, split_id, seller_id, action, amount, percentage, split_type, vendedor_nombre_snapshot, changed_by)
    VALUES
      (OLD.sale_id, OLD.id, OLD.user_id, 'deleted', OLD.amount, OLD.percentage, OLD.split_type, OLD.vendedor_nombre_snapshot, v_actor);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_commission_split_change ON sale_commission_splits;
CREATE TRIGGER trg_log_commission_split_change
  AFTER INSERT OR UPDATE OR DELETE ON sale_commission_splits
  FOR EACH ROW EXECUTE FUNCTION log_sale_commission_split_change();

-- RLS: lectura para superadmin o usuarios del cliente dueño de la venta
-- (mismo patrón que sale_commission_splits, 20260609140000). Las escrituras
-- solo las hace el trigger (SECURITY DEFINER), así que no se exponen políticas
-- de INSERT/UPDATE/DELETE a los clientes.
ALTER TABLE sale_commission_splits_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read commission history for their client's sales" ON sale_commission_splits_history;
CREATE POLICY "Read commission history for their client's sales"
  ON sale_commission_splits_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (
        u.rol = 'superadmin'
        OR u.client_id IN (
          SELECT v.client_id FROM vehicles_sales vs
          JOIN vehicles v ON v.id = vs.vehicle_id
          WHERE vs.id = sale_commission_splits_history.sale_id
        )
      )
    )
  );
