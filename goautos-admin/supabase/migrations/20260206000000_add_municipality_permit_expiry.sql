-- Add municipality permit expiry date to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS municipality_permit_expiry DATE;

-- Add comment to describe the field
COMMENT ON COLUMN vehicles.municipality_permit_expiry IS 'Fecha de vencimiento del permiso municipal';
