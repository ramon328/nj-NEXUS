-- Migration: Add seller who brought the consignment
-- Tracks which seller sourced/captured the consignment deal

ALTER TABLE vehicles_consignments
ADD COLUMN consignment_seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN vehicles_consignments.consignment_seller_id IS 'Vendedor que trajo/captó la consignación';
