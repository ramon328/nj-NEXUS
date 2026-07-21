-- Ensure client_website_config has an `integrations` jsonb column used to
-- store per-site tracking configuration (Meta Pixel, GTM, GA4) and the
-- cookie-consent requirement flag. The column may already exist on some
-- environments because the TypeScript type referenced it — this migration
-- makes it authoritative and idempotent.

ALTER TABLE public.client_website_config
  ADD COLUMN IF NOT EXISTS integrations jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill the default shape so reads don't need null-checks on each key.
UPDATE public.client_website_config
SET integrations = jsonb_build_object(
  'google_reviews_enabled', COALESCE((integrations->>'google_reviews_enabled')::boolean, false),
  'pixel_id',               COALESCE(integrations->>'pixel_id', ''),
  'gtm_id',                 COALESCE(integrations->>'gtm_id', ''),
  'ga4_id',                 COALESCE(integrations->>'ga4_id', ''),
  'require_cookie_consent', COALESCE((integrations->>'require_cookie_consent')::boolean, true)
)
WHERE integrations IS NULL
   OR NOT (integrations ? 'pixel_id')
   OR NOT (integrations ? 'require_cookie_consent');
