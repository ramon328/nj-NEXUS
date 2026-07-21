-- Add lead_id column to vehicle_requests
-- Links a vehicle request back to the lead it was created from
ALTER TABLE vehicle_requests
  ADD COLUMN IF NOT EXISTS lead_id BIGINT REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_requests_lead ON vehicle_requests(lead_id) WHERE lead_id IS NOT NULL;
