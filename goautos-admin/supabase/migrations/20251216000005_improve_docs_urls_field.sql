-- Migration: Improve docs_urls field to support multiple documents
-- The current field is VARCHAR which stores a single URL
-- This migration documents that the field can store comma-separated URLs or JSON

-- Add comment explaining the field format
COMMENT ON COLUMN vehicles_extras.docs_urls IS 'Document URLs. Can be: (1) single URL string, (2) comma-separated URLs, or (3) JSON array of URLs for multiple attachments.';

-- Note: The application code already handles this field as a string that can contain multiple URLs
-- separated by commas or as a JSON array. No schema change needed.

-- For future reference, if you need to query documents as an array:
-- SELECT id, string_to_array(docs_urls, ',') as urls FROM vehicles_extras WHERE docs_urls IS NOT NULL;

-- Or if stored as JSON:
-- SELECT id, docs_urls::jsonb as urls FROM vehicles_extras WHERE docs_urls IS NOT NULL AND docs_urls LIKE '[%';
