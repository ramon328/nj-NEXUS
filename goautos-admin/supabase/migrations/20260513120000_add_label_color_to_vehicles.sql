-- Per-vehicle color for the "label" badge shown on public-site cards.
-- NULL means: use the historical hardcoded fallback (green) so existing
-- vehicles with a label keep rendering the same as before.
-- Expected format: CSS-compatible color string (e.g. "#22c55e" or "rgb(34,197,94)").
-- Validation is intentionally light: the column is read directly into a CSS
-- style attribute on the client; constraining further (regex) would break the
-- "custom hex" UX without adding real safety since RLS already guards writes.

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS label_color TEXT NULL;

COMMENT ON COLUMN public.vehicles.label_color IS
  'CSS color for the vehicle label badge on public cards. NULL = default fallback (green).';
