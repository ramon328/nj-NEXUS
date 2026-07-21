-- Fix: cast argument types in alert_fast_sale_restock to match create_notification signature
CREATE OR REPLACE FUNCTION alert_fast_sale_restock() RETURNS TRIGGER AS $$
DECLARE
  v_days_in_stock INTEGER;
  v_brand TEXT;
  v_model TEXT;
  v_year INTEGER;
  v_vendido_name TEXT;
BEGIN
  SELECT name INTO v_vendido_name
  FROM clients_vehicles_states
  WHERE id = NEW.status_id AND client_id = NEW.client_id;

  IF v_vendido_name IS DISTINCT FROM 'Vendido' THEN
    RETURN NEW;
  END IF;

  v_days_in_stock := EXTRACT(DAY FROM (NOW() - NEW.created_at));

  IF v_days_in_stock <= 30 THEN
    SELECT b.name, m.name, NEW.year
    INTO v_brand, v_model, v_year
    FROM brands b
    LEFT JOIN models m ON m.id = NEW.model_id
    WHERE b.id = NEW.brand_id;

    PERFORM create_notification(
      NEW.client_id::INTEGER,
      'fast_sale_restock'::TEXT,
      'Venta rápida — buscar reemplazo'::TEXT,
      (COALESCE(v_brand, '') || ' ' || COALESCE(v_model, '') || ' ' || COALESCE(v_year::TEXT, '') ||
       ' se vendió en ' || v_days_in_stock || ' días. Busca uno similar.')::TEXT,
      'zap'::TEXT,
      ('/vehiculos/' || NEW.id)::TEXT,
      jsonb_build_object('vehicle_id', NEW.id, 'days_in_stock', v_days_in_stock, 'brand', v_brand, 'model', v_model),
      NULL::UUID,
      NULL::TEXT,
      NULL::UUID
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
