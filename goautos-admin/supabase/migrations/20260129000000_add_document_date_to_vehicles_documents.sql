-- Add document_date column to vehicles_documents table
-- This allows users to set a custom date for documents instead of using created_at

ALTER TABLE vehicles_documents
ADD COLUMN IF NOT EXISTS document_date TIMESTAMP WITH TIME ZONE;

-- Set default value for existing records to use created_at
UPDATE vehicles_documents
SET document_date = created_at
WHERE document_date IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN vehicles_documents.document_date IS 'Custom date for the document. If NULL, created_at should be used as fallback.';
