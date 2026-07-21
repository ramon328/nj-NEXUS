-- ============================================================================
-- SISTEMA DE CALENDARIO
-- Eventos manuales: reuniones, capacitaciones, recordatorios, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting'
    CHECK (event_type IN ('meeting', 'training', 'vendor', 'deadline', 'reminder', 'other')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  color TEXT,
  location TEXT,
  assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notify_before_minutes INTEGER DEFAULT 30,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_client_id ON calendar_events(client_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_at ON calendar_events(start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_client_range ON calendar_events(client_id, start_at);

CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_select_policy" ON calendar_events;
CREATE POLICY "calendar_events_select_policy"
  ON calendar_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (u.client_id = calendar_events.client_id OR u.rol = 'superadmin')
    )
  );

DROP POLICY IF EXISTS "calendar_events_insert_policy" ON calendar_events;
CREATE POLICY "calendar_events_insert_policy"
  ON calendar_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (u.client_id = calendar_events.client_id OR u.rol = 'superadmin')
    )
  );

DROP POLICY IF EXISTS "calendar_events_update_policy" ON calendar_events;
CREATE POLICY "calendar_events_update_policy"
  ON calendar_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (u.client_id = calendar_events.client_id OR u.rol = 'superadmin')
    )
  );

DROP POLICY IF EXISTS "calendar_events_delete_policy" ON calendar_events;
CREATE POLICY "calendar_events_delete_policy"
  ON calendar_events FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND u.rol IN ('admin', 'superadmin')
      AND (u.client_id = calendar_events.client_id OR u.rol = 'superadmin')
    )
  );

GRANT ALL ON calendar_events TO service_role;

-- Insertar permisos de calendario
INSERT INTO permissions (code, name, description, category) VALUES
  ('calendar.view', 'Ver Calendario', 'Permite ver el calendario', 'calendar'),
  ('calendar.create', 'Crear Eventos', 'Permite crear eventos', 'calendar'),
  ('calendar.manage', 'Gestionar Calendario', 'Permite gestionar eventos', 'calendar')
ON CONFLICT (code) DO NOTHING;

-- Asignar permisos de calendario a TODOS los roles existentes
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.code IN ('calendar.view', 'calendar.create', 'calendar.manage')
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);
