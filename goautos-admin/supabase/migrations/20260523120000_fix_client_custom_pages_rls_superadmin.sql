-- client_custom_pages RLS: allow superadmins (client_id null / distinct) to manage
-- pages for ANY client, mirroring the pattern used by tasks/calendar_events.
-- Previously only a tenant admin whose own client_id matched could create pages,
-- so the GoAuto team (superadmins) were blocked entirely ("Error al crear página").

DROP POLICY IF EXISTS "Users can view their client custom pages" ON client_custom_pages;
DROP POLICY IF EXISTS "Users can manage their client custom pages" ON client_custom_pages;

CREATE POLICY "client_custom_pages_access" ON client_custom_pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
        AND (u.client_id = client_custom_pages.client_id OR u.rol = 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
        AND (u.client_id = client_custom_pages.client_id OR u.rol = 'superadmin')
    )
  );
