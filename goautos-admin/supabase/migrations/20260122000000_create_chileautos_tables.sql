-- Create ChileAutos integration table
CREATE TABLE IF NOT EXISTS chileautos_integration (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- ChileAutos OAuth2 Credentials
  ca_client_id VARCHAR(255) NOT NULL,
  ca_client_secret VARCHAR(255) NOT NULL,
  seller_identifier UUID NOT NULL,

  -- OAuth2 Token (auto-renewed)
  access_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,

  -- Configuration
  auto_sync BOOLEAN DEFAULT FALSE,
  sync_on_publish BOOLEAN DEFAULT TRUE,
  sync_on_update BOOLEAN DEFAULT TRUE,
  sync_on_sold BOOLEAN DEFAULT TRUE,
  default_products TEXT[] DEFAULT '{}',
  whatsapp_number VARCHAR(20),

  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  vehicles_published INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(client_id)
);

-- Create indexes for chileautos_integration
CREATE INDEX IF NOT EXISTS idx_chileautos_integration_client ON chileautos_integration(client_id);
CREATE INDEX IF NOT EXISTS idx_chileautos_integration_status ON chileautos_integration(status);

-- Create ChileAutos listing table
CREATE TABLE IF NOT EXISTS chileautos_listing (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  integration_id INTEGER NOT NULL REFERENCES chileautos_integration(id) ON DELETE CASCADE,

  -- ChileAutos Identifier
  chileautos_identifier UUID NOT NULL,

  -- Listing Data (cached)
  title VARCHAR(500),
  price DECIMAL(12, 2),
  currency VARCHAR(3) DEFAULT 'CLP',

  -- Status
  status VARCHAR(50) DEFAULT 'pending',
  sale_status VARCHAR(50) DEFAULT 'In Stock',
  active_products TEXT[] DEFAULT '{}',

  -- Sync Information
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(vehicle_id)
);

-- Create indexes for chileautos_listing
CREATE INDEX IF NOT EXISTS idx_chileautos_listing_vehicle ON chileautos_listing(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_chileautos_listing_integration ON chileautos_listing(integration_id);
CREATE INDEX IF NOT EXISTS idx_chileautos_listing_status ON chileautos_listing(status);
CREATE INDEX IF NOT EXISTS idx_chileautos_listing_client ON chileautos_listing(client_id);
CREATE INDEX IF NOT EXISTS idx_chileautos_listing_ca_identifier ON chileautos_listing(chileautos_identifier);

-- Enable RLS
ALTER TABLE chileautos_integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE chileautos_listing ENABLE ROW LEVEL SECURITY;

-- Create policies for chileautos_integration
CREATE POLICY "Users can view their own chileautos integrations"
  ON chileautos_integration FOR SELECT
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own chileautos integrations"
  ON chileautos_integration FOR INSERT
  WITH CHECK (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update their own chileautos integrations"
  ON chileautos_integration FOR UPDATE
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own chileautos integrations"
  ON chileautos_integration FOR DELETE
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

-- Create policies for chileautos_listing
CREATE POLICY "Users can view their own chileautos listings"
  ON chileautos_listing FOR SELECT
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own chileautos listings"
  ON chileautos_listing FOR INSERT
  WITH CHECK (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can update their own chileautos listings"
  ON chileautos_listing FOR UPDATE
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own chileautos listings"
  ON chileautos_listing FOR DELETE
  USING (client_id IN (
    SELECT client_id FROM users WHERE auth_id = auth.uid()
  ));

-- Grant permissions for service role (for edge functions)
GRANT ALL ON chileautos_integration TO service_role;
GRANT ALL ON chileautos_listing TO service_role;
GRANT USAGE, SELECT ON SEQUENCE chileautos_integration_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE chileautos_listing_id_seq TO service_role;

-- Create function to update vehicles_published count
CREATE OR REPLACE FUNCTION update_chileautos_vehicles_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE chileautos_integration
    SET vehicles_published = (
      SELECT COUNT(*) FROM chileautos_listing
      WHERE integration_id = NEW.integration_id
      AND status = 'published'
    ),
    updated_at = NOW()
    WHERE id = NEW.integration_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chileautos_integration
    SET vehicles_published = (
      SELECT COUNT(*) FROM chileautos_listing
      WHERE integration_id = OLD.integration_id
      AND status = 'published'
    ),
    updated_at = NOW()
    WHERE id = OLD.integration_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-update count
CREATE TRIGGER trigger_update_chileautos_count
  AFTER INSERT OR UPDATE OR DELETE ON chileautos_listing
  FOR EACH ROW
  EXECUTE FUNCTION update_chileautos_vehicles_count();
