-- Add is_online_consignment flag to vehicles
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS is_online_consignment BOOLEAN NOT NULL DEFAULT FALSE;
