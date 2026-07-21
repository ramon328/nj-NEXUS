-- =============================================
-- Protección: Si un vehículo tiene una venta activa (approved/pending/completed),
-- no permitir que su status se cambie manualmente a algo que no sea "Vendido".
-- Si se intenta, forzar el status a "Vendido" automáticamente.
-- =============================================

CREATE OR REPLACE FUNCTION protect_sold_vehicle_status() RETURNS TRIGGER AS $$
DECLARE
  v_has_active_sale BOOLEAN;
  v_sold_status_id BIGINT;
BEGIN
  -- Solo actuar si el status_id está cambiando
  IF NEW.status_id IS NOT DISTINCT FROM OLD.status_id THEN
    RETURN NEW;
  END IF;

  -- Verificar si el vehículo tiene una venta activa
  SELECT EXISTS(
    SELECT 1 FROM vehicles_sales
    WHERE vehicle_id = NEW.id
      AND status IN ('approved', 'pending', 'completed')
  ) INTO v_has_active_sale;

  IF NOT v_has_active_sale THEN
    RETURN NEW; -- No tiene venta, permitir el cambio
  END IF;

  -- Tiene venta activa: obtener el status "Vendido"
  v_sold_status_id := get_sold_status_id(NEW.client_id);

  -- Si el nuevo status ya es "Vendido", permitir
  IF v_sold_status_id IS NOT NULL AND NEW.status_id = v_sold_status_id THEN
    RETURN NEW;
  END IF;

  -- Si están intentando cambiar a algo que no es "Vendido", forzar a "Vendido"
  IF v_sold_status_id IS NOT NULL THEN
    NEW.status_id := v_sold_status_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_protect_sold_vehicle_status
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION protect_sold_vehicle_status();
