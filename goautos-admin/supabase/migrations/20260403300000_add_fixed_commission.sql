-- Migration: Add fixed amount commissions
-- Sellers can now have percentage-based OR fixed amount commissions per tier

ALTER TABLE seller_commission_tiers
ADD COLUMN fixed_amount NUMERIC DEFAULT NULL,
ADD COLUMN commission_type VARCHAR(10) DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed'));

COMMENT ON COLUMN seller_commission_tiers.fixed_amount IS 'Monto fijo de comisión (cuando commission_type = fixed)';
COMMENT ON COLUMN seller_commission_tiers.commission_type IS 'Tipo: percentage (%) o fixed (monto fijo)';
