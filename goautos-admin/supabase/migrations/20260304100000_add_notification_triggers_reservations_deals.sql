-- ============================================================
-- Additional notification triggers:
--   reservation_created, deal_closed, consignment_created, purchase_created
-- Pattern matches existing notify_sale_completed() trigger.
-- ============================================================

-- ============================================================
-- 1) Reservation created
-- ============================================================
CREATE OR REPLACE FUNCTION notify_reservation_created() RETURNS TRIGGER AS $$
DECLARE
  v_brand TEXT;
  v_model TEXT;
  v_client_id INTEGER;
  v_customer TEXT;
BEGIN
  -- Get vehicle info and client_id
  SELECT v.client_id, b.name, m.name
  INTO v_client_id, v_brand, v_model
  FROM vehicles v
  JOIN brands b ON b.id = v.brand_id
  LEFT JOIN models m ON m.id = v.model_id
  WHERE v.id = NEW.vehicle_id;

  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get customer name
  IF NEW.customer_id IS NOT NULL THEN
    SELECT first_name || ' ' || last_name INTO v_customer
    FROM customers WHERE id = NEW.customer_id;
  END IF;

  PERFORM create_notification(
    v_client_id,
    'reservation_created',
    'Reserva creada',
    'Reserva de ' || COALESCE(v_brand, '') || ' ' || COALESCE(v_model, '') ||
    CASE WHEN v_customer IS NOT NULL THEN ' para ' || v_customer ELSE '' END,
    'calendar',
    '/vehiculos/' || NEW.vehicle_id,
    jsonb_build_object('reservation_id', NEW.id, 'vehicle_id', NEW.vehicle_id),
    NULL, NULL, NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_reservation_created
  AFTER INSERT ON vehicles_reservations
  FOR EACH ROW EXECUTE FUNCTION notify_reservation_created();

-- ============================================================
-- 2) Close business deal created
--    Triggers on vehicles_documents with type = 'close_deal'
-- ============================================================
CREATE OR REPLACE FUNCTION notify_deal_closed() RETURNS TRIGGER AS $$
DECLARE
  v_brand TEXT;
  v_model TEXT;
  v_customer TEXT;
BEGIN
  IF NEW.type <> 'close_deal' THEN
    RETURN NEW;
  END IF;

  -- Get vehicle info
  SELECT b.name, m.name INTO v_brand, v_model
  FROM vehicles v
  JOIN brands b ON b.id = v.brand_id
  LEFT JOIN models m ON m.id = v.model_id
  WHERE v.id = NEW.vehicle_id;

  -- Get customer name
  IF NEW.customer_id IS NOT NULL THEN
    SELECT first_name || ' ' || last_name INTO v_customer
    FROM customers WHERE id = NEW.customer_id;
  END IF;

  PERFORM create_notification(
    NEW.client_id,
    'deal_closed',
    'Cierre de negocio',
    'Cierre de ' || COALESCE(v_brand, '') || ' ' || COALESCE(v_model, '') ||
    CASE WHEN v_customer IS NOT NULL THEN ' con ' || v_customer ELSE '' END,
    'handshake',
    '/vehiculos/' || NEW.vehicle_id,
    jsonb_build_object('document_id', NEW.id, 'vehicle_id', NEW.vehicle_id),
    NULL, NULL, NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_deal_closed
  AFTER INSERT ON vehicles_documents
  FOR EACH ROW
  WHEN (NEW.type = 'close_deal')
  EXECUTE FUNCTION notify_deal_closed();

-- ============================================================
-- 3) Consignment created
-- ============================================================
CREATE OR REPLACE FUNCTION notify_consignment_created() RETURNS TRIGGER AS $$
DECLARE
  v_brand TEXT;
  v_model TEXT;
  v_client_id INTEGER;
  v_customer TEXT;
BEGIN
  SELECT v.client_id, b.name, m.name
  INTO v_client_id, v_brand, v_model
  FROM vehicles v
  JOIN brands b ON b.id = v.brand_id
  LEFT JOIN models m ON m.id = v.model_id
  WHERE v.id = NEW.vehicle_id;

  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS NOT NULL THEN
    SELECT first_name || ' ' || last_name INTO v_customer
    FROM customers WHERE id = NEW.customer_id;
  END IF;

  PERFORM create_notification(
    v_client_id,
    'consignment_created',
    'Consignación registrada',
    COALESCE(v_brand, '') || ' ' || COALESCE(v_model, '') ||
    CASE WHEN v_customer IS NOT NULL THEN ' de ' || v_customer ELSE '' END,
    'package',
    '/vehiculos/' || NEW.vehicle_id,
    jsonb_build_object('consignment_id', NEW.id, 'vehicle_id', NEW.vehicle_id),
    NULL, NULL, NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_consignment_created
  AFTER INSERT ON vehicles_consignments
  FOR EACH ROW EXECUTE FUNCTION notify_consignment_created();

-- ============================================================
-- 4) Purchase created
-- ============================================================
CREATE OR REPLACE FUNCTION notify_purchase_created() RETURNS TRIGGER AS $$
DECLARE
  v_brand TEXT;
  v_model TEXT;
  v_client_id INTEGER;
  v_customer TEXT;
BEGIN
  SELECT v.client_id, b.name, m.name
  INTO v_client_id, v_brand, v_model
  FROM vehicles v
  JOIN brands b ON b.id = v.brand_id
  LEFT JOIN models m ON m.id = v.model_id
  WHERE v.id = NEW.vehicle_id;

  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS NOT NULL THEN
    SELECT first_name || ' ' || last_name INTO v_customer
    FROM customers WHERE id = NEW.customer_id;
  END IF;

  PERFORM create_notification(
    v_client_id,
    'purchase_created',
    'Compra registrada',
    'Compra de ' || COALESCE(v_brand, '') || ' ' || COALESCE(v_model, '') ||
    CASE WHEN v_customer IS NOT NULL THEN ' a ' || v_customer ELSE '' END,
    'shopping-cart',
    '/vehiculos/' || NEW.vehicle_id,
    jsonb_build_object('purchase_id', NEW.id, 'vehicle_id', NEW.vehicle_id),
    NULL, NULL, NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_purchase_created
  AFTER INSERT ON vehicles_purchases
  FOR EACH ROW EXECUTE FUNCTION notify_purchase_created();
