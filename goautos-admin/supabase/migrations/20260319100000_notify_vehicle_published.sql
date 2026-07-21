-- =============================================
-- Notificación cuando un vehículo cambia a estado "Publicado"
-- =============================================

CREATE OR REPLACE FUNCTION notify_vehicle_published() RETURNS TRIGGER AS $$
DECLARE
  v_status_name TEXT;
  v_brand TEXT;
  v_model TEXT;
  v_year INTEGER;
BEGIN
  -- Check if new status is "Publicado"
  SELECT name INTO v_status_name
  FROM clients_vehicles_states
  WHERE id = NEW.status_id AND client_id = NEW.client_id;

  IF v_status_name IS DISTINCT FROM 'Publicado' THEN
    RETURN NEW;
  END IF;

  -- Get vehicle info
  SELECT b.name, m.name, NEW.year
  INTO v_brand, v_model, v_year
  FROM brands b
  LEFT JOIN models m ON m.id = NEW.model_id
  WHERE b.id = NEW.brand_id;

  PERFORM create_notification(
    NEW.client_id::INTEGER,
    'vehicle_published'::TEXT,
    'Vehículo publicado'::TEXT,
    (COALESCE(v_brand, '') || ' ' || COALESCE(v_model, '') || ' ' || COALESCE(v_year::TEXT, '') || ' fue publicado en la web.')::TEXT,
    'globe'::TEXT,
    ('/vehiculos/' || NEW.id)::TEXT,
    jsonb_build_object('vehicle_id', NEW.id, 'brand', v_brand, 'model', v_model)::JSONB,
    NULL::UUID,
    NULL::TEXT,
    NULL::UUID
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires when status_id changes on vehicles table
CREATE TRIGGER trigger_notify_vehicle_published
  AFTER UPDATE OF status_id ON vehicles
  FOR EACH ROW
  WHEN (OLD.status_id IS DISTINCT FROM NEW.status_id)
  EXECUTE FUNCTION notify_vehicle_published();
