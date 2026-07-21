-- Migration: Create appraisals table for Tasador GAIA history
CREATE TABLE IF NOT EXISTS appraisals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_id BIGINT NOT NULL,
  query TEXT NOT NULL,
  vehicle_details JSONB,
  appraisal_result TEXT,
  contains_links BOOLEAN DEFAULT false,
  sources JSONB DEFAULT '[]'::jsonb,
  price_analysis JSONB,
  estimated_range JSONB,
  confidence TEXT DEFAULT 'low',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast history lookups by client
CREATE INDEX IF NOT EXISTS idx_appraisals_client_id ON appraisals(client_id);
CREATE INDEX IF NOT EXISTS idx_appraisals_created_at ON appraisals(created_at DESC);

-- RLS
ALTER TABLE appraisals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their client's appraisals
CREATE POLICY "Users can read own client appraisals"
  ON appraisals FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role (edge functions) to insert
CREATE POLICY "Service role can insert appraisals"
  ON appraisals FOR INSERT
  TO authenticated
  WITH CHECK (true);
