-- ============================================================
-- Push notification preferences per client
-- ============================================================
-- Allows each client (dealership) to choose which types of
-- in-app + push notifications they want to receive.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'push_notification_settings'
  ) THEN
    ALTER TABLE clients ADD COLUMN push_notification_settings JSONB DEFAULT '{
      "smart_alert": true,
      "new_lead": true,
      "vehicle_request": true,
      "sale": true,
      "inventory": true,
      "general": true
    }'::jsonb;
    COMMENT ON COLUMN clients.push_notification_settings IS 'Per-type preferences for in-app and push notifications';
  END IF;
END $$;
