-- Add missing credential columns to chileautos_integration table

-- Add ca_client_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'ca_client_id'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN ca_client_id VARCHAR(255);
  END IF;
END $$;

-- Add ca_client_secret if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'ca_client_secret'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN ca_client_secret VARCHAR(255);
  END IF;
END $$;

-- Add seller_identifier if not exists (as VARCHAR to handle UUID format)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'seller_identifier'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN seller_identifier VARCHAR(255);
  END IF;
END $$;

-- Add access_token if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'access_token'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN access_token TEXT;
  END IF;
END $$;

-- Add token_expires_at if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add auto_sync if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'auto_sync'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN auto_sync BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add sync_on_publish if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'sync_on_publish'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN sync_on_publish BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Add sync_on_update if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'sync_on_update'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN sync_on_update BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Add sync_on_sold if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'sync_on_sold'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN sync_on_sold BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Add default_products if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'default_products'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN default_products TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Add whatsapp_number if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN whatsapp_number VARCHAR(20);
  END IF;
END $$;

-- Add status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'status'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
  END IF;
END $$;

-- Add last_sync_at if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'last_sync_at'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN last_sync_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add last_error if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'last_error'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN last_error TEXT;
  END IF;
END $$;

-- Add vehicles_published if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chileautos_integration' AND column_name = 'vehicles_published'
  ) THEN
    ALTER TABLE chileautos_integration ADD COLUMN vehicles_published INTEGER DEFAULT 0;
  END IF;
END $$;
