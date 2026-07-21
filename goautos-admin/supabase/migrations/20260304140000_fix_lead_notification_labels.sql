-- ============================================================
-- Fix: notify_new_lead() shows raw type (buy-direct) instead
-- of human-readable label (Compra Directa)
-- ============================================================

CREATE OR REPLACE FUNCTION notify_new_lead() RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_type_label TEXT;
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
    INTO v_customer_name
    FROM customers
    WHERE id = NEW.customer_id;
  END IF;

  -- Map lead type to friendly Spanish label
  v_type_label := CASE NEW.type
    WHEN 'buy-direct'       THEN 'Compra Directa'
    WHEN 'buy-consignment'  THEN 'Consignación'
    WHEN 'search-request'   THEN 'Buscar tu Auto'
    WHEN 'sell-vehicle'     THEN 'Venta Vehículo'
    WHEN 'sell-financing'   THEN 'Financiamiento'
    WHEN 'sell-transfer'    THEN 'Transferencia'
    WHEN 'contact-general'  THEN 'Contacto General'
    ELSE COALESCE(NEW.type, 'Web')
  END;

  INSERT INTO notifications (client_id, type, title, body, icon, url, data, target_role, created_by)
  VALUES (
    NEW.client_id,
    'new_lead',
    'Nuevo lead — ' || v_type_label,
    COALESCE(NULLIF(TRIM(v_customer_name), ''), 'Sin nombre'),
    'mail-plus',
    '/leads',
    jsonb_build_object('lead_id', NEW.id::text, 'source', NEW.type),
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
