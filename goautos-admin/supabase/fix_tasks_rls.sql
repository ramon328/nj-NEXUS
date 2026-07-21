-- Fix RLS policies de tasks
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
CREATE POLICY "tasks_select_policy"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (u.client_id = tasks.client_id OR u.rol = 'superadmin')
    )
  );

DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
CREATE POLICY "tasks_insert_policy"
  ON tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (u.client_id = tasks.client_id OR u.rol = 'superadmin')
    )
  );

DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
CREATE POLICY "tasks_update_policy"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND (u.client_id = tasks.client_id OR u.rol = 'superadmin')
    )
  );

DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
CREATE POLICY "tasks_delete_policy"
  ON tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_id = auth.uid()
      AND u.rol IN ('admin', 'superadmin')
      AND (u.client_id = tasks.client_id OR u.rol = 'superadmin')
    )
  );

-- Permisos de tareas
INSERT INTO permissions (code, name, description, category) VALUES
  ('tasks.view', 'Ver tareas', 'Permiso para ver tareas', 'tasks'),
  ('tasks.create', 'Crear tareas', 'Permiso para crear tareas', 'tasks'),
  ('tasks.manage', 'Gestionar tareas', 'Permiso para gestionar tareas', 'tasks')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin' AND p.code IN ('tasks.view', 'tasks.create', 'tasks.manage')
AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
