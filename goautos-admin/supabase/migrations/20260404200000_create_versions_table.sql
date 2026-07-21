-- Create versions table for the Categoría → Marca → Modelo → Versión hierarchy
CREATE TABLE IF NOT EXISTS versions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  model_id INTEGER NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by model
CREATE INDEX IF NOT EXISTS idx_versions_model_id ON versions(model_id);

-- Add version columns to vehicles (nullable for backward compatibility)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS version_id INTEGER REFERENCES versions(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS version_name TEXT;

-- Enable RLS
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read versions
CREATE POLICY "Anyone can read versions" ON versions
  FOR SELECT USING (true);

-- Allow authenticated users to insert versions
CREATE POLICY "Authenticated users can insert versions" ON versions
  FOR INSERT WITH CHECK (true);
