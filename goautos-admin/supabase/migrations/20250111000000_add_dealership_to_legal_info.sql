-- Migration: Add dealership_id to legal_info table
-- Purpose: Allow legal information to be associated with specific dealerships
-- Date: 2025-01-11

-- Add dealership_id column to legal_info table (nullable for backward compatibility)
-- Check if column exists first to make this migration idempotent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'legal_info' AND column_name = 'dealership_id'
    ) THEN
        ALTER TABLE legal_info
        ADD COLUMN dealership_id BIGINT REFERENCES dealerships(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for better query performance (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_legal_info_dealership_id'
    ) THEN
        CREATE INDEX idx_legal_info_dealership_id ON legal_info(dealership_id);
    END IF;
END $$;

-- Add comment to explain the column
COMMENT ON COLUMN legal_info.dealership_id IS 'Optional dealership ID. If null, this legal_info applies to the entire client. If set, it applies only to that specific dealership.';

-- Modify the unique constraint to allow multiple legal_info entries per client
-- but only one per dealership (and one general per client)
-- First, drop the existing unique constraint on client_id if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'legal_info_client_id_key'
    ) THEN
        ALTER TABLE legal_info DROP CONSTRAINT legal_info_client_id_key;
    END IF;
END $$;

-- Create a unique constraint: either one general legal_info per client (dealership_id IS NULL)
-- or one legal_info per dealership
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_legal_info_unique_client'
    ) THEN
        CREATE UNIQUE INDEX idx_legal_info_unique_client ON legal_info(client_id)
        WHERE dealership_id IS NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_legal_info_unique_dealership'
    ) THEN
        CREATE UNIQUE INDEX idx_legal_info_unique_dealership ON legal_info(dealership_id)
        WHERE dealership_id IS NOT NULL;
    END IF;
END $$;

-- Add check constraint to ensure at least client_id or dealership_id is set
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'check_legal_info_ownership'
    ) THEN
        ALTER TABLE legal_info
        ADD CONSTRAINT check_legal_info_ownership
        CHECK (client_id IS NOT NULL);
    END IF;
END $$;

COMMENT ON TABLE legal_info IS 'Legal information for clients and dealerships. Can be associated with a client (general) or a specific dealership. If dealership_id is NULL, the legal_info applies to the whole client. Otherwise, it applies only to that dealership.';
