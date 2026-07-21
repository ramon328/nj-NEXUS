-- =============================================
-- Trigger: Mover vehículo a "Vendido" automáticamente al registrar venta
-- Esto garantiza que SIEMPRE se actualice el estado, sin depender del frontend
-- =============================================

-- Función helper reutilizable para obtener el sold_status_id de un cliente
CREATE OR REPLACE FUNCTION get_sold_status_id(p_client_id BIGINT) RETURNS BIGINT AS $$
DECLARE
  v_status_id BIGINT;
BEGIN
  -- Buscar por nombre "vendido"
  SELECT id INTO v_status_id
  FROM clients_vehicles_states
  WHERE client_id = p_client_id AND name ILIKE '%vendido%'
  LIMIT 1;

  IF v_status_id IS NOT NULL THEN RETURN v_status_id; END IF;

  -- Fallback: "sold" o "venta"
  SELECT id INTO v_status_id
  FROM clients_vehicles_states
  WHERE client_id = p_client_id AND (name ILIKE '%sold%' OR name ILIKE '%venta%')
  LIMIT 1;

  IF v_status_id IS NOT NULL THEN RETURN v_status_id; END IF;

  -- Fallback: estado con order más alto
  SELECT id INTO v_status_id
  FROM clients_vehicles_states
  WHERE client_id = p_client_id
  ORDER BY "order" DESC
  LIMIT 1;

  RETURN v_status_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función que marca el vehículo como vendido
CREATE OR REPLACE FUNCTION mark_vehicle_as_sold(p_vehicle_id BIGINT) RETURNS VOID AS $$
DECLARE
  v_client_id BIGINT;
  v_sold_status_id BIGINT;
BEGIN
  SELECT client_id INTO v_client_id
  FROM vehicles WHERE id = p_vehicle_id;

  IF v_client_id IS NULL THEN RETURN; END IF;

  v_sold_status_id := get_sold_status_id(v_client_id);

  IF v_sold_status_id IS NOT NULL THEN
    UPDATE vehicles
    SET status_id = v_sold_status_id, updated_at = NOW()
    WHERE id = p_vehicle_id
      AND status_id IS DISTINCT FROM v_sold_status_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: al insertar una venta (solo si ya viene aprobada)
CREATE OR REPLACE FUNCTION trg_auto_sold_on_insert() RETURNS TRIGGER AS $$
BEGIN
  -- Solo marcar como vendido si la venta viene aprobada directamente (sin vendedor)
  -- Las ventas con vendedor se crean como 'pending' y se marcan al aprobar
  IF NEW.status IN ('approved', 'completed') THEN
    PERFORM mark_vehicle_as_sold(NEW.vehicle_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_sold_on_sale_insert
  AFTER INSERT ON vehicles_sales
  FOR EACH ROW EXECUTE FUNCTION trg_auto_sold_on_insert();

-- Trigger: al aprobar una venta (status cambia a approved o completed)
CREATE OR REPLACE FUNCTION trg_auto_sold_on_approve() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approved', 'completed') AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM mark_vehicle_as_sold(NEW.vehicle_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_auto_sold_on_sale_approve
  AFTER UPDATE ON vehicles_sales
  FOR EACH ROW EXECUTE FUNCTION trg_auto_sold_on_approve();
