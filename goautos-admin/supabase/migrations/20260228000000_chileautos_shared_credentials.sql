-- Migration: Move ChileAutos OAuth credentials to shared system config
-- GoAutos is a certified integrator - credentials are shared across all tenants.
-- Each tenant only needs their seller_identifier (UUID).

-- 1. Create shared system config table for caching the OAuth token
CREATE TABLE IF NOT EXISTS chileautos_system_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Enforce single row
  access_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  last_refreshed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the single config row
INSERT INTO chileautos_system_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Grant permissions for service role (edge functions)
GRANT ALL ON chileautos_system_config TO service_role;

-- RLS: only service_role can access this table (no user-facing access)
ALTER TABLE chileautos_system_config ENABLE ROW LEVEL SECURITY;

-- 2. Make ca_client_id and ca_client_secret nullable (DEPRECATED - credentials now come from env vars)
ALTER TABLE chileautos_integration
  ALTER COLUMN ca_client_id DROP NOT NULL;

ALTER TABLE chileautos_integration
  ALTER COLUMN ca_client_secret DROP NOT NULL;

-- Add comments to mark deprecated columns
COMMENT ON COLUMN chileautos_integration.ca_client_id IS 'DEPRECATED: OAuth credentials now stored as env vars. Kept for backward compatibility.';
COMMENT ON COLUMN chileautos_integration.ca_client_secret IS 'DEPRECATED: OAuth credentials now stored as env vars. Kept for backward compatibility.';
COMMENT ON COLUMN chileautos_integration.access_token IS 'DEPRECATED: Token now cached in chileautos_system_config (shared across tenants).';
COMMENT ON COLUMN chileautos_integration.token_expires_at IS 'DEPRECATED: Token expiry now tracked in chileautos_system_config.';
