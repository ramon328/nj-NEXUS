-- Add permit_municipality (text) to store which municipality issued the circulation permit
-- Replaces the municipality_permit_expiry date field in the UI

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS permit_municipality TEXT;

COMMENT ON COLUMN vehicles.permit_municipality IS 'Municipalidad donde se sacó el permiso de circulación';
