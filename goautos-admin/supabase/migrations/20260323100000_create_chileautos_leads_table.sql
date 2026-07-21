-- Table to store raw ChileAutos lead data for analytics and audit.
-- The lead_id column links to the main leads table for CRM integration.
-- raw_payload stores the complete webhook payload for debugging/analysis.

CREATE TABLE IF NOT EXISTS chileautos_leads (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  integration_id INTEGER NOT NULL REFERENCES chileautos_integration(id) ON DELETE CASCADE,
  lead_id BIGINT REFERENCES leads(id) ON DELETE SET NULL,

  -- ChileAutos identifiers
  chileautos_lead_identifier UUID NOT NULL,
  prospect_identifier UUID,
  vehicle_identifier UUID,

  -- Prospect info (denormalized for quick analytics)
  prospect_name TEXT,
  prospect_email TEXT,
  prospect_phone TEXT,

  -- Lead classification
  source_type TEXT NOT NULL DEFAULT 'chileautos', -- 'chileautos', 'chileautos-whatsapp', 'chileautos-callconnect'

  -- Vehicle info (denormalized)
  vehicle_title TEXT,
  chileautos_url TEXT,

  -- Full payload for audit
  raw_payload JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chileautos_leads_client ON chileautos_leads(client_id);
CREATE INDEX idx_chileautos_leads_created ON chileautos_leads(created_at DESC);
CREATE INDEX idx_chileautos_leads_source ON chileautos_leads(source_type);
CREATE UNIQUE INDEX idx_chileautos_leads_identifier ON chileautos_leads(chileautos_lead_identifier);

-- RLS
ALTER TABLE chileautos_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chileautos_leads_select_own" ON chileautos_leads
  FOR SELECT USING (
    client_id IN (
      SELECT client_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Service role can insert (edge function uses service role)
CREATE POLICY "chileautos_leads_insert_service" ON chileautos_leads
  FOR INSERT WITH CHECK (true);

-- Comment
COMMENT ON TABLE chileautos_leads IS 'Raw ChileAutos lead webhook data for analytics. Each row = one lead received from ChileAutos.';
