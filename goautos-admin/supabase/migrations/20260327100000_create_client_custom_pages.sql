-- Custom pages per tenant for the website builder
CREATE TABLE IF NOT EXISTS client_custom_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  icon TEXT DEFAULT 'FileText',
  is_published BOOLEAN DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, slug)
);

-- Index for fast lookups by client
CREATE INDEX IF NOT EXISTS idx_client_custom_pages_client_id ON client_custom_pages(client_id);

-- RLS policies
ALTER TABLE client_custom_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own custom pages"
  ON client_custom_pages FOR SELECT
  USING (client_id IN (
    SELECT client_id FROM user_clients WHERE user_id = auth.uid()
  ));

CREATE POLICY "Clients can insert their own custom pages"
  ON client_custom_pages FOR INSERT
  WITH CHECK (client_id IN (
    SELECT client_id FROM user_clients WHERE user_id = auth.uid()
  ));

CREATE POLICY "Clients can update their own custom pages"
  ON client_custom_pages FOR UPDATE
  USING (client_id IN (
    SELECT client_id FROM user_clients WHERE user_id = auth.uid()
  ));

CREATE POLICY "Clients can delete their own custom pages"
  ON client_custom_pages FOR DELETE
  USING (client_id IN (
    SELECT client_id FROM user_clients WHERE user_id = auth.uid()
  ));

-- Service role can do everything
CREATE POLICY "Service role full access on client_custom_pages"
  ON client_custom_pages FOR ALL
  USING (auth.role() = 'service_role');
