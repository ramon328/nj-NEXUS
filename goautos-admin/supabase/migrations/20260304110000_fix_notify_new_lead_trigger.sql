-- ============================================================
-- Fix: notify_new_lead trigger was not created because it
-- already existed from whatsapp migration (20251227000001).
-- Migration 20260303110000 used CREATE TRIGGER without
-- DROP TRIGGER IF EXISTS first, so the in-app notification
-- function was never wired up.
-- ============================================================

-- 1) Drop the old trigger (whatsapp-only version)
DROP TRIGGER IF EXISTS trigger_notify_new_lead ON leads;

-- 2) Recreate the function that inserts in-app notifications
CREATE OR REPLACE FUNCTION notify_new_lead() RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')
    INTO v_customer_name
    FROM customers
    WHERE id = NEW.customer_id;
  END IF;

  -- In-app notification for all roles
  INSERT INTO notifications (client_id, type, title, body, icon, url, data, target_role, created_by)
  VALUES (
    NEW.client_id,
    'new_lead',
    'Nuevo lead',
    COALESCE(NULLIF(TRIM(v_customer_name), ''), 'Sin nombre') || ' — ' || COALESCE(NEW.type, 'web'),
    'mail-plus',
    '/leads',
    jsonb_build_object('lead_id', NEW.id::text, 'source', NEW.type),
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Create the trigger properly
CREATE TRIGGER trigger_notify_new_lead
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_lead();
