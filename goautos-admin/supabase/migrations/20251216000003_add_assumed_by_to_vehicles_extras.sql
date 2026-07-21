-- Migration: Add assumed_by field to vehicles_extras
-- This allows tracking who assumes the expense: dealership or customer

-- Add assumed_by column to vehicles_extras table
ALTER TABLE vehicles_extras
ADD COLUMN IF NOT EXISTS assumed_by VARCHAR(20) DEFAULT 'dealership';

-- Add constraint to validate assumed_by values
ALTER TABLE vehicles_extras
ADD CONSTRAINT vehicles_extras_assumed_by_check
CHECK (assumed_by IS NULL OR assumed_by IN ('dealership', 'customer'));

-- Add comment to explain the column
COMMENT ON COLUMN vehicles_extras.assumed_by IS 'Indicates who assumes the expense: dealership (automotora) or customer (cliente)';

-- Update existing expense records to default to dealership
UPDATE vehicles_extras
SET assumed_by = 'dealership'
WHERE assumed_by IS NULL AND type = 'expense';
