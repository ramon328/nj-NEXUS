-- Migration: Fix legal_info constraints to allow multiple entries per client
-- Purpose: Remove old unique constraint that prevents multiple legal_info per client
-- Date: 2025-01-11

-- Drop ALL old unique constraints on client_id that prevent multiple entries
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find and drop any unique constraint on client_id
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'legal_info'::regclass
        AND contype = 'u' -- unique constraint
        AND array_length(conkey, 1) = 1 -- single column constraint
        AND EXISTS (
            SELECT 1
            FROM pg_attribute
            WHERE attrelid = conrelid
            AND attnum = conkey[1]
            AND attname = 'client_id'
        )
    LOOP
        EXECUTE format('ALTER TABLE legal_info DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Now create the correct partial unique indexes if they don't exist
-- One general legal_info per client (where dealership_id IS NULL)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_legal_info_unique_client'
    ) THEN
        CREATE UNIQUE INDEX idx_legal_info_unique_client ON legal_info(client_id)
        WHERE dealership_id IS NULL;
        RAISE NOTICE 'Created index: idx_legal_info_unique_client';
    END IF;
END $$;

-- One legal_info per dealership
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_legal_info_unique_dealership'
    ) THEN
        CREATE UNIQUE INDEX idx_legal_info_unique_dealership ON legal_info(dealership_id)
        WHERE dealership_id IS NOT NULL;
        RAISE NOTICE 'Created index: idx_legal_info_unique_dealership';
    END IF;
END $$;

-- Verify the changes
DO $$
BEGIN
    RAISE NOTICE '=== Legal Info Constraints Status ===';
    RAISE NOTICE 'Unique constraints remaining: %', (
        SELECT count(*)
        FROM pg_constraint
        WHERE conrelid = 'legal_info'::regclass
        AND contype = 'u'
    );
    RAISE NOTICE 'Partial indexes created: %', (
        SELECT count(*)
        FROM pg_indexes
        WHERE tablename = 'legal_info'
        AND indexname IN ('idx_legal_info_unique_client', 'idx_legal_info_unique_dealership')
    );
END $$;
