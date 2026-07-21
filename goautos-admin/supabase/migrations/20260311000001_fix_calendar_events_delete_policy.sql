-- Fix: allow event creators to delete their own manual calendar events
-- Previous policy only allowed admin/superadmin, which made "delete reminder" appear to fail for normal users.

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_delete_policy" ON calendar_events;
CREATE POLICY "calendar_events_delete_policy"
  ON calendar_events FOR DELETE
  USING (
    user_belongs_to_client(calendar_events.client_id)
    AND (
      -- Anyone with manage permission can delete (regardless of role)
      user_has_permission('calendar.manage')
      -- Or: creator can delete their own events if they can at least create calendar events
      OR (calendar_events.created_by = auth.uid() AND user_has_permission('calendar.create'))
    )
  );

