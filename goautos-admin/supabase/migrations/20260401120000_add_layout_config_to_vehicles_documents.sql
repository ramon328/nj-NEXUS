-- Add layout_config JSONB column to vehicles_documents
-- Stores per-document layout settings and inline content overrides
-- When present, takes precedence over template-level layout_config
ALTER TABLE vehicles_documents
ADD COLUMN IF NOT EXISTS layout_config JSONB;

COMMENT ON COLUMN vehicles_documents.layout_config IS 'Per-document layout settings and inline content overrides (contentOverrides, notesOverride, termsOverride, etc.)';
