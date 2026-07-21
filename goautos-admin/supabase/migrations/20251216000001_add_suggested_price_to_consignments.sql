-- Migration: Add suggested_price to vehicles_consignments
-- This allows tracking the consignor's suggested price vs the agreed sale price

-- Add suggested_price column to vehicles_consignments table
ALTER TABLE vehicles_consignments
ADD COLUMN IF NOT EXISTS suggested_price DECIMAL(12,2);

-- Add comment to explain the column
COMMENT ON COLUMN vehicles_consignments.suggested_price IS 'Price suggested by the consignor (what they want to receive)';
COMMENT ON COLUMN vehicles_consignments.agreed_price IS 'Agreed sale price (price the dealership will sell at)';
