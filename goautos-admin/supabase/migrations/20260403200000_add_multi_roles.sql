-- Migration: Multi-roles per user
-- Users can now have multiple roles. Permissions are the union of all assigned roles.

-- 1. Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS: users can view their own roles
CREATE POLICY "Users can view own roles"
ON user_roles FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = user_roles.user_id AND u.auth_id = auth.uid())
);

-- RLS: users can view roles of users in same client
CREATE POLICY "Users can view client user_roles"
ON user_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN users me ON me.auth_id = auth.uid()
    WHERE u.id = user_roles.user_id AND u.client_id = me.client_id
  )
);

-- RLS: users with roles.manage can insert/update/delete
CREATE POLICY "Managers can manage user_roles"
ON user_roles FOR ALL
USING (user_has_permission('roles.manage'))
WITH CHECK (user_has_permission('roles.manage'));

-- 2. Migrate existing users.role_id into user_roles
INSERT INTO user_roles (user_id, role_id)
SELECT id, role_id FROM users
WHERE role_id IS NOT NULL AND role_id > 0
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 3. Update user_has_permission to check via user_roles junction table
CREATE OR REPLACE FUNCTION user_has_permission(permission_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
  user_role TEXT;
BEGIN
  -- Superadmin has all permissions
  SELECT rol INTO user_role FROM users WHERE auth_id = auth.uid();
  IF user_role = 'superadmin' THEN
    RETURN true;
  END IF;

  -- Check permission via user_roles junction table (multi-role)
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.auth_id = auth.uid()
      AND p.code = permission_code
  ) INTO has_perm;

  -- Fallback: legacy single role_id (backward compat)
  IF has_perm IS NULL OR has_perm = false THEN
    SELECT EXISTS (
      SELECT 1
      FROM users u
      JOIN role_permissions rp ON rp.role_id = u.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.auth_id = auth.uid()
        AND p.code = permission_code
    ) INTO has_perm;
  END IF;

  -- Fallback: legacy admin role string
  IF has_perm IS NULL OR has_perm = false THEN
    IF user_role = 'admin' THEN
      RETURN true;
    END IF;
  END IF;

  RETURN COALESCE(has_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create RPC to get all roles with permissions for a user
CREATE OR REPLACE FUNCTION get_user_roles_with_permissions(p_user_id INTEGER)
RETURNS JSON AS $$
DECLARE
  roles_json JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', r.id,
      'client_id', r.client_id,
      'name', r.name,
      'description', r.description,
      'is_system_role', r.is_system_role,
      'parent_role_id', r.parent_role_id,
      'permissions', COALESCE(
        (SELECT json_agg(p.code)
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = r.id),
        '[]'::json
      )
    )
  ) INTO roles_json
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id;

  RETURN COALESCE(roles_json, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper: assign roles to a user (replaces all current roles)
CREATE OR REPLACE FUNCTION set_user_roles(p_user_id INTEGER, p_role_ids INTEGER[])
RETURNS VOID AS $$
BEGIN
  -- Verify caller has permission
  IF NOT user_has_permission('roles.manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar roles';
  END IF;

  -- Delete existing roles for user
  DELETE FROM user_roles WHERE user_id = p_user_id;

  -- Insert new roles
  INSERT INTO user_roles (user_id, role_id)
  SELECT p_user_id, unnest(p_role_ids)
  ON CONFLICT (user_id, role_id) DO NOTHING;

  -- Keep users.role_id in sync (first role for backward compat)
  UPDATE users SET role_id = (
    SELECT role_id FROM user_roles WHERE user_id = p_user_id ORDER BY role_id LIMIT 1
  ) WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
