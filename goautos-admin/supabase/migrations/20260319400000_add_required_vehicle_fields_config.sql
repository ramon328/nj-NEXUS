-- =============================================
-- Add configurable required vehicle fields per client
-- Allows each dealership to choose which documentation
-- fields are mandatory when adding a vehicle.
-- =============================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'required_vehicle_fields'
  ) THEN
    ALTER TABLE clients ADD COLUMN required_vehicle_fields JSONB DEFAULT '{
      "tech_inspection_expiry": false,
      "circulation_permit_expiry": false,
      "emissions_expiry": false,
      "municipality_permit_expiry": false
    }'::jsonb;

    COMMENT ON COLUMN clients.required_vehicle_fields IS 'Per-client config: which vehicle documentation fields are mandatory. Keys match vehicle column names.';
  END IF;
END $$;
