-- ============================================================================
-- Trigger: Auto-sync vehicle to ChileAutos when ANY relevant field changes
-- Extends the price-only trigger to cover mileage, description, images, etc.
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_chileautos_on_vehicle_change() RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_integration RECORD;
  v_listing RECORD;
  v_changed BOOLEAN := FALSE;
BEGIN
  -- Check if any ChileAutos-relevant field actually changed
  IF OLD.price IS DISTINCT FROM NEW.price THEN v_changed := TRUE; END IF;
  IF OLD.mileage IS DISTINCT FROM NEW.mileage THEN v_changed := TRUE; END IF;
  IF OLD.description IS DISTINCT FROM NEW.description THEN v_changed := TRUE; END IF;
  IF OLD.main_image IS DISTINCT FROM NEW.main_image THEN v_changed := TRUE; END IF;
  IF OLD.gallery IS DISTINCT FROM NEW.gallery THEN v_changed := TRUE; END IF;
  IF OLD.brand_id IS DISTINCT FROM NEW.brand_id THEN v_changed := TRUE; END IF;
  IF OLD.model_id IS DISTINCT FROM NEW.model_id THEN v_changed := TRUE; END IF;
  IF OLD.year IS DISTINCT FROM NEW.year THEN v_changed := TRUE; END IF;
  IF OLD.color_id IS DISTINCT FROM NEW.color_id THEN v_changed := TRUE; END IF;
  IF OLD.fuel_type_id IS DISTINCT FROM NEW.fuel_type_id THEN v_changed := TRUE; END IF;
  IF OLD.transmission IS DISTINCT FROM NEW.transmission THEN v_changed := TRUE; END IF;
  IF OLD.license_plate IS DISTINCT FROM NEW.license_plate THEN v_changed := TRUE; END IF;
  IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN v_changed := TRUE; END IF;
  IF OLD.transfer_value IS DISTINCT FROM NEW.transfer_value THEN v_changed := TRUE; END IF;

  IF NOT v_changed THEN
    RETURN NEW;
  END IF;

  -- Check if client has an active ChileAutos integration with sync_on_update enabled
  SELECT id, sync_on_update, status
  INTO v_integration
  FROM chileautos_integration
  WHERE client_id = NEW.client_id
  LIMIT 1;

  IF NOT FOUND OR v_integration.status != 'active' OR NOT v_integration.sync_on_update THEN
    RETURN NEW;
  END IF;

  -- Check if this vehicle has a published listing
  SELECT id, chileautos_identifier
  INTO v_listing
  FROM chileautos_listing
  WHERE vehicle_id = NEW.id
    AND status = 'published'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get Supabase URL and service role key
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://miuiujntdjrjhhcysiba.supabase.co';
  END IF;

  -- Call the chileautos-sync edge function via pg_net
  IF v_service_role_key IS NOT NULL AND v_service_role_key != '' THEN
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/chileautos-sync',
      body := jsonb_build_object(
        'operation', 'update',
        'vehicleId', NEW.id,
        'clientId', NEW.client_id
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'chileautos vehicle sync trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the old price-only trigger with the new comprehensive one
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    -- Drop old price-only trigger
    DROP TRIGGER IF EXISTS trigger_chileautos_price_sync ON vehicles;
    -- Drop new trigger if exists (idempotent)
    DROP TRIGGER IF EXISTS trigger_chileautos_vehicle_sync ON vehicles;
    -- Create new comprehensive trigger
    CREATE TRIGGER trigger_chileautos_vehicle_sync
      AFTER UPDATE ON vehicles
      FOR EACH ROW
      EXECUTE FUNCTION sync_chileautos_on_vehicle_change();
  END IF;
END;
$$;
