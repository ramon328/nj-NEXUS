-- Migration: Add stock_type to vehicles
-- Allows categorizing vehicles as online or at a specific dealership/sucursal

ALTER TABLE vehicles
ADD COLUMN stock_type VARCHAR(20) DEFAULT 'online'
CHECK (stock_type IN ('online', 'dealership'));

COMMENT ON COLUMN vehicles.stock_type IS 'Ubicación del vehículo: online (web) o dealership (sucursal física)';
