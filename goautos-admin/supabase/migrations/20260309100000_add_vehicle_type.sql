-- ============================================================================
-- Add vehicle_type to vehicles table
-- Supports: car, truck, machinery, nautical
-- Default 'car' ensures all existing data is unaffected
-- ============================================================================

-- Create enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type') THEN
    CREATE TYPE vehicle_type AS ENUM ('car', 'truck', 'machinery', 'nautical');
  END IF;
END;
$$;

-- Add column with default 'car' so all existing vehicles stay as cars
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type vehicle_type NOT NULL DEFAULT 'car';

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type ON vehicles (vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_client_type ON vehicles (client_id, vehicle_type);
