-- Add photo_urls array to calendar_events for photo attachments on events/activities/reminders
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}'::TEXT[];

COMMENT ON COLUMN public.calendar_events.photo_urls IS 'Public URLs of photos attached to the event (stored in vehicle-images bucket under calendar-events/).';
