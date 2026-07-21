-- =============================================
-- Permitir devolver una venta aprobada/completada al estado "pending"
-- Caso de uso: contabilidad necesita reabrir la venta porque faltó info
-- (financiera, comisión, etc.) y quiere corregirla sin crear una venta nueva.
--
-- La columna vehicles_sales.vehicle_id es UNIQUE, por lo que no podemos
-- crear una venta nueva mientras exista una para ese vehículo. Reabrir
-- la misma venta y volver a aprobarla es el flujo natural.
-- =============================================

-- 1) Columnas de auditoría para la devolución
ALTER TABLE vehicles_sales
  ADD COLUMN IF NOT EXISTS reverted_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reverted_by   BIGINT REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revert_reason TEXT;

COMMENT ON COLUMN vehicles_sales.reverted_at   IS 'Última vez que la venta fue devuelta de aprobada a pendiente';
COMMENT ON COLUMN vehicles_sales.reverted_by   IS 'Usuario que ejecutó la devolución a pendiente';
COMMENT ON COLUMN vehicles_sales.revert_reason IS 'Motivo de la devolución (e.g. "faltó cargar financiera")';

-- 2) Extender trg_sale_status_changed: cuando la venta pasa de
--    approved/completed a pending, devolver el vehículo a "Publicado".
--    El resto del comportamiento queda igual.
CREATE OR REPLACE FUNCTION trg_sale_status_changed() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Aprobación: marcar como vendido
  IF NEW.status IN ('approved', 'completed') THEN
    PERFORM mark_vehicle_as_sold(NEW.vehicle_id);
  END IF;

  -- Rechazo: devolver a Publicado (si estaba en Vendido)
  IF NEW.status = 'rejected' AND OLD.status IN ('approved', 'completed', 'pending') THEN
    PERFORM restore_vehicle_status(NEW.vehicle_id);
  END IF;

  -- Devolución a pendiente desde una venta confirmada: devolver vehículo a Publicado
  IF NEW.status = 'pending' AND OLD.status IN ('approved', 'completed') THEN
    PERFORM restore_vehicle_status(NEW.vehicle_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
