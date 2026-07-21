-- Migration: Rollback dealership_id from legal_info (if needed)
-- Purpose: Remove the dealership_id column and related constraints if you need to start fresh
-- Date: 2025-01-11
-- IMPORTANT: Only run this if you want to UNDO the changes and start over

-- Drop constraints first
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_legal_info_ownership'
    ) THEN
        ALTER TABLE legal_info DROP CONSTRAINT check_legal_info_ownership;
    END IF;
END $$;

-- Drop unique indexes
DROP INDEX IF EXISTS idx_legal_info_unique_dealership;
DROP INDEX IF EXISTS idx_legal_info_unique_client;

-- Drop regular index
DROP INDEX IF EXISTS idx_legal_info_dealership_id;

-- Restore original unique constraint on client_id if it was there
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'legal_info_client_id_key'
    ) THEN
        ALTER TABLE legal_info
        ADD CONSTRAINT legal_info_client_id_key UNIQUE (client_id);
    END IF;
END $$;

-- Drop the column (this will also drop the foreign key constraint)
ALTER TABLE legal_info DROP COLUMN IF EXISTS dealership_id;

-- Remove comments
COMMENT ON COLUMN legal_info.dealership_id IS NULL;
COMMENT ON TABLE legal_info IS NULL;
