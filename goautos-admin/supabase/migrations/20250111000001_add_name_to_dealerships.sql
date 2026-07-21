-- Migration: Add name field to dealerships table
-- Purpose: Add a descriptive name field for dealerships
-- Date: 2025-01-11

-- Add name column to dealerships table
ALTER TABLE dealerships
ADD COLUMN name TEXT NOT NULL DEFAULT 'Sucursal Principal';

-- Remove the default after adding the column (so new rows must provide a name)
ALTER TABLE dealerships
ALTER COLUMN name DROP DEFAULT;

-- Add comment to explain the column
COMMENT ON COLUMN dealerships.name IS 'Descriptive name for the dealership/branch (e.g., "Sucursal Santiago Centro", "Sucursal Las Condes")';

-- Update existing rows to have a meaningful name based on address or id
UPDATE dealerships
SET name = COALESCE(
  CASE
    WHEN address IS NOT NULL AND address != '' THEN 'Sucursal - ' || address
    ELSE 'Sucursal #' || id::text
  END,
  'Sucursal #' || id::text
)
WHERE name = 'Sucursal Principal';
