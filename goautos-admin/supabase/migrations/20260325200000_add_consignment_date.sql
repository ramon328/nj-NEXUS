-- Add consignment_date column to vehicles_consignments
ALTER TABLE vehicles_consignments
ADD COLUMN IF NOT EXISTS consignment_date DATE;
