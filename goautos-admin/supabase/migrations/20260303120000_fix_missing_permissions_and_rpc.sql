-- =============================================
-- Fix: Add missing permission codes + atomic RPC for role updates
-- =============================================

-- 1. Insert missing permission codes that exist in the TypeScript enum but not in the DB
INSERT INTO permissions (code, name, description, category) VALUES
  ('chileautos.view', 'Ver ChileAutos', 'Acceso a integración de ChileAutos', 'marketing'),
  ('notifications.view', 'Ver Notificaciones', 'Acceso a notificaciones', 'notifications'),
  ('notifications.create', 'Crear Notificaciones', 'Crear notificaciones', 'notifications'),
  ('vehicle_requests.view', 'Ver Solicitudes de Vehículos', 'Acceso a solicitudes de vehículos', 'notifications'),
  ('vehicle_requests.create', 'Crear Solicitudes de Vehículos', 'Crear solicitudes de vehículos', 'notifications'),
  ('vehicle_requests.manage', 'Gestionar Solicitudes de Vehículos', 'Gestionar solicitudes de vehículos', 'notifications'),
  ('ai_assistant.view', 'Ver Asistente IA', 'Acceso al asistente de inteligencia artificial', 'general')
ON CONFLICT (code) DO NOTHING;

-- 2. Assign new permissions to "Administrador" system role of every client
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrador'
  AND p.code IN (
    'chileautos.view',
    'notifications.view',
    'notifications.create',
    'vehicle_requests.view',
    'vehicle_requests.create',
    'vehicle_requests.manage',
    'ai_assistant.view'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 3. Atomic RPC to update role permissions (SECURITY DEFINER bypasses RLS)
--    This avoids the race condition where DELETE removes the user's own
--    roles.manage permission before INSERT can run.
CREATE OR REPLACE FUNCTION update_role_permissions(
  p_role_id INTEGER,
  p_name TEXT,
  p_description TEXT,
  p_permission_codes TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_client_id INTEGER;
BEGIN
  -- Verify caller has permission
  IF NOT user_has_permission('roles.manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar roles';
  END IF;

  -- Get the role's client_id and verify the caller belongs to that client
  SELECT client_id INTO v_client_id FROM roles WHERE id = p_role_id;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Rol no encontrado';
  END IF;
  IF NOT user_belongs_to_client(v_client_id) THEN
    RAISE EXCEPTION 'No tienes acceso a este rol';
  END IF;

  -- Update role metadata
  UPDATE roles SET
    name = p_name,
    description = p_description,
    updated_at = NOW()
  WHERE id = p_role_id;

  -- Delete existing permissions
  DELETE FROM role_permissions WHERE role_id = p_role_id;

  -- Insert new permissions (only those that exist in the permissions table)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT p_role_id, p.id
  FROM permissions p
  WHERE p.code = ANY(p_permission_codes);

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atomic RPC to create a role with permissions
CREATE OR REPLACE FUNCTION create_role_with_permissions(
  p_client_id INTEGER,
  p_name TEXT,
  p_description TEXT,
  p_permission_codes TEXT[]
)
RETURNS JSON AS $$
DECLARE
  v_role_id INTEGER;
  v_role JSON;
BEGIN
  -- Verify caller has permission
  IF NOT user_has_permission('roles.manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar roles';
  END IF;

  -- Verify caller belongs to client
  IF NOT user_belongs_to_client(p_client_id) THEN
    RAISE EXCEPTION 'No tienes acceso a este cliente';
  END IF;

  -- Create the role
  INSERT INTO roles (client_id, name, description, is_system_role)
  VALUES (p_client_id, p_name, p_description, false)
  RETURNING id INTO v_role_id;

  -- Insert permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_role_id, p.id
  FROM permissions p
  WHERE p.code = ANY(p_permission_codes);

  -- Return the created role with permissions
  SELECT json_build_object(
    'id', r.id,
    'client_id', r.client_id,
    'name', r.name,
    'description', r.description,
    'is_system_role', r.is_system_role,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'permissions', COALESCE(
      (SELECT json_agg(p.code)
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = r.id),
      '[]'::json
    )
  ) INTO v_role
  FROM roles r
  WHERE r.id = v_role_id;

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
