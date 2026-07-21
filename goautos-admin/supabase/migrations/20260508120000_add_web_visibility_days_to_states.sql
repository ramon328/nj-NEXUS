-- Add a per-state visibility window for the public website.
-- web_visibility_days = N means: vehicles in this state are only shown on the
-- public site if their event_date (sale/reservation date) is within the last
-- N days. NULL means no time window (always show, while show_in_web=true).
--
-- Replaces the hardcoded 3-day window in VehicleCarousel.tsx, letting each
-- dealership decide how long sold/reserved vehicles linger on their site.

ALTER TABLE public.clients_vehicles_states
  ADD COLUMN IF NOT EXISTS web_visibility_days INTEGER NULL;

COMMENT ON COLUMN public.clients_vehicles_states.web_visibility_days IS
  'Days window for public-site visibility when show_in_web is true. NULL = no window. Applied against event_date for sold/reserved-style states.';
