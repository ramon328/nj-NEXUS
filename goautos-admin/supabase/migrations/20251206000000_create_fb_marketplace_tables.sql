-- Create Facebook Marketplace integration table
CREATE TABLE IF NOT EXISTS fb_marketplace_integration (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Facebook Business Account Data
  fb_business_id VARCHAR(255),
  fb_business_name VARCHAR(255),
  fb_page_id VARCHAR(255),
  fb_page_name VARCHAR(255),

  -- Catalog Information
  catalog_id VARCHAR(255),
  catalog_name VARCHAR(255),

  -- OAuth Tokens
  access_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'long_lived',
  expires_at TIMESTAMP WITH TIME ZONE,

  -- User Info
  fb_user_id VARCHAR(255),
  fb_user_name VARCHAR(255),
  email VARCHAR(255),

  -- Configuration
  default_cta VARCHAR(50) DEFAULT 'LEARN_MORE',
  whatsapp_number VARCHAR(20),
  landing_url TEXT,

  -- Status
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(client_id, fb_business_id)
);

-- Create indexes for fb_marketplace_integration
CREATE INDEX IF NOT EXISTS idx_fb_marketplace_integration_client ON fb_marketplace_integration(client_id);
CREATE INDEX IF NOT EXISTS idx_fb_marketplace_integration_status ON fb_marketplace_integration(status);

-- Create Facebook Marketplace post table
CREATE TABLE IF NOT EXISTS fb_marketplace_post (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  integration_id INTEGER NOT NULL REFERENCES fb_marketplace_integration(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Facebook Product/Item IDs
  fb_product_id VARCHAR(255) NOT NULL,
  fb_catalog_item_id VARCHAR(255),
  fb_retailer_id VARCHAR(255),

  -- Publication Data
  title VARCHAR(500),
  price DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'CLP',

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  availability VARCHAR(50) DEFAULT 'available',

  -- URLs
  url_landing TEXT,
  fb_product_url TEXT,

  -- Sync Information
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(vehicle_id, integration_id)
);

-- Create indexes for fb_marketplace_post
CREATE INDEX IF NOT EXISTS idx_fb_marketplace_post_vehicle ON fb_marketplace_post(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fb_marketplace_post_integration ON fb_marketplace_post(integration_id);
CREATE INDEX IF NOT EXISTS idx_fb_marketplace_post_status ON fb_marketplace_post(status);
CREATE INDEX IF NOT EXISTS idx_fb_marketplace_post_client ON fb_marketplace_post(client_id);

-- Enable RLS
ALTER TABLE fb_marketplace_integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_marketplace_post ENABLE ROW LEVEL SECURITY;

-- Create policies for fb_marketplace_integration
CREATE POLICY "Users can view their own integrations"
  ON fb_marketplace_integration FOR SELECT
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own integrations"
  ON fb_marketplace_integration FOR INSERT
  WITH CHECK (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update their own integrations"
  ON fb_marketplace_integration FOR UPDATE
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own integrations"
  ON fb_marketplace_integration FOR DELETE
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

-- Create policies for fb_marketplace_post
CREATE POLICY "Users can view their own posts"
  ON fb_marketplace_post FOR SELECT
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own posts"
  ON fb_marketplace_post FOR INSERT
  WITH CHECK (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update their own posts"
  ON fb_marketplace_post FOR UPDATE
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own posts"
  ON fb_marketplace_post FOR DELETE
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

-- Grant permissions for service role (for edge functions)
GRANT ALL ON fb_marketplace_integration TO service_role;
GRANT ALL ON fb_marketplace_post TO service_role;
GRANT USAGE, SELECT ON SEQUENCE fb_marketplace_integration_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE fb_marketplace_post_id_seq TO service_role;
