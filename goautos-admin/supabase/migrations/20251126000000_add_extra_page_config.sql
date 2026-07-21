-- Add extra_page_config column to document_templates table
ALTER TABLE document_templates
ADD COLUMN IF NOT EXISTS extra_page_config jsonb DEFAULT '{"enabled": false, "files": []}'::jsonb;

-- Update existing records to extract extra_page_config from terms_and_conditions if present
UPDATE document_templates
SET extra_page_config =
  CASE
    WHEN terms_and_conditions::text LIKE '{%' THEN
      COALESCE(
        (terms_and_conditions::jsonb -> 'extra_page_config'),
        '{"enabled": false, "files": []}'::jsonb
      )
    ELSE
      '{"enabled": false, "files": []}'::jsonb
  END
WHERE extra_page_config IS NULL;

-- Clean up terms_and_conditions to contain only the terms text
UPDATE document_templates
SET terms_and_conditions =
  CASE
    WHEN terms_and_conditions::text LIKE '{%' THEN
      COALESCE(
        (terms_and_conditions::jsonb ->> 'terms'),
        terms_and_conditions
      )
    ELSE
      terms_and_conditions
  END
WHERE terms_and_conditions::text LIKE '{%';
