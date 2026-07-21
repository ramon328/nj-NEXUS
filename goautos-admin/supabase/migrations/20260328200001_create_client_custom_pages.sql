-- Custom pages created by tenants via the builder
CREATE TABLE IF NOT EXISTS client_custom_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  icon text DEFAULT 'FileText',
  is_published boolean DEFAULT true,
  seo_title text,
  seo_description text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, slug)
);

-- RLS
ALTER TABLE client_custom_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their client custom pages"
  ON client_custom_pages FOR SELECT
  USING (client_id IN (SELECT client_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users can manage their client custom pages"
  ON client_custom_pages FOR ALL
  USING (client_id IN (SELECT client_id FROM users WHERE auth_id = auth.uid()));
