-- Add translations column for builder multi-language support
-- Stores auto-translated text overlays per page: { "home": { "nodeId": { "title": "translated" } }, ... }
ALTER TABLE client_website_config
ADD COLUMN IF NOT EXISTS translations text;
