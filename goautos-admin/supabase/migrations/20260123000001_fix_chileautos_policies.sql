-- Fix ChileAutos policies: drop and recreate to avoid conflicts

-- Drop existing policies for chileautos_integration
DROP POLICY IF EXISTS "Users can view their own chileautos integrations" ON chileautos_integration;
DROP POLICY IF EXISTS "Users can insert their own chileautos integrations" ON chileautos_integration;
DROP POLICY IF EXISTS "Users can update their own chileautos integrations" ON chileautos_integration;
DROP POLICY IF EXISTS "Users can delete their own chileautos integrations" ON chileautos_integration;

-- Drop existing policies for chileautos_listing
DROP POLICY IF EXISTS "Users can view their own chileautos listings" ON chileautos_listing;
DROP POLICY IF EXISTS "Users can insert their own chileautos listings" ON chileautos_listing;
DROP POLICY IF EXISTS "Users can update their own chileautos listings" ON chileautos_listing;
DROP POLICY IF EXISTS "Users can delete their own chileautos listings" ON chileautos_listing;

-- Recreate policies for chileautos_integration
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

-- Recreate policies for chileautos_listing
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
