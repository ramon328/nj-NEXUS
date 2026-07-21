-- =============================================
-- Fix: Corregir recursión infinita en políticas RLS
-- =============================================

-- 1. Eliminar las políticas problemáticas
DROP POLICY IF EXISTS "Users with team.manage can insert roles" ON roles;
DROP POLICY IF EXISTS "Users with team.manage can update roles" ON roles;
DROP POLICY IF EXISTS "Users with team.manage can delete non-system roles" ON roles;
DROP POLICY IF EXISTS "Users with roles.manage can modify role_permissions" ON role_permissions;
DROP POLICY IF EXISTS "Users can view role_permissions in their client" ON role_permissions;

-- 2. Crear función SECURITY DEFINER para verificar permisos (bypass RLS)
CREATE OR REPLACE FUNCTION user_has_permission(permission_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_perm BOOLEAN;
  user_role TEXT;
BEGIN
  -- Primero verificar si es superadmin (tiene todos los permisos)
  SELECT rol INTO user_role FROM users WHERE auth_id = auth.uid();
  IF user_role = 'superadmin' THEN
    RETURN true;
  END IF;

  -- Verificar permiso en role_permissions
  SELECT EXISTS (
    SELECT 1
    FROM users u
    JOIN role_permissions rp ON rp.role_id = u.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.auth_id = auth.uid()
      AND p.code = permission_code
  ) INTO has_perm;

  -- Fallback: si no tiene role_id, verificar permisos legacy por rol string
  IF has_perm IS NULL OR has_perm = false THEN
    IF user_role = 'admin' THEN
      RETURN true; -- Admin tiene todos los permisos por defecto
    END IF;
  END IF;

  RETURN COALESCE(has_perm, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear función para verificar si usuario pertenece a un cliente
CREATE OR REPLACE FUNCTION user_belongs_to_client(check_client_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  belongs BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
      AND client_id = check_client_id
  ) INTO belongs;

  RETURN COALESCE(belongs, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Función para obtener permisos de un rol (SECURITY DEFINER - bypass RLS)
CREATE OR REPLACE FUNCTION get_role_permissions(p_role_id INTEGER)
RETURNS TABLE(
  permission_code VARCHAR(50),
  permission_name VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.code, p.name
  FROM role_permissions rp
  JOIN permissions p ON rp.permission_id = p.id
  WHERE rp.role_id = p_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para obtener rol completo con permisos (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_role_with_permissions(p_role_id INTEGER)
RETURNS JSON AS $$
DECLARE
  role_json JSON;
BEGIN
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
  ) INTO role_json
  FROM roles r
  WHERE r.id = p_role_id;

  RETURN role_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recrear políticas para roles usando las funciones
CREATE POLICY "Users with roles.manage can insert roles"
ON roles FOR INSERT
WITH CHECK (
  user_belongs_to_client(client_id)
  AND user_has_permission('roles.manage')
);

CREATE POLICY "Users with roles.manage can update roles"
ON roles FOR UPDATE
USING (
  user_belongs_to_client(client_id)
  AND user_has_permission('roles.manage')
);

CREATE POLICY "Users with roles.manage can delete non-system roles"
ON roles FOR DELETE
USING (
  is_system_role = false
  AND user_belongs_to_client(client_id)
  AND user_has_permission('roles.manage')
);

-- 7. Políticas para role_permissions (simplificadas para evitar recursión)
-- SELECT: permitir a usuarios ver permisos de roles de su cliente
CREATE POLICY "Users can view role_permissions"
ON role_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM roles r
    JOIN users u ON u.client_id = r.client_id
    WHERE r.id = role_permissions.role_id
      AND u.auth_id = auth.uid()
  )
);

-- INSERT: solo usuarios con permiso roles.manage
CREATE POLICY "Users with roles.manage can insert role_permissions"
ON role_permissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id = role_id
      AND user_belongs_to_client(r.client_id)
  )
  AND user_has_permission('roles.manage')
);

-- UPDATE: solo usuarios con permiso roles.manage
CREATE POLICY "Users with roles.manage can update role_permissions"
ON role_permissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id = role_id
      AND user_belongs_to_client(r.client_id)
  )
  AND user_has_permission('roles.manage')
);

-- DELETE: solo usuarios con permiso roles.manage
CREATE POLICY "Users with roles.manage can delete role_permissions"
ON role_permissions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id = role_id
      AND user_belongs_to_client(r.client_id)
  )
  AND user_has_permission('roles.manage')
);

-- 8. Función para obtener todos los roles de un cliente con sus permisos (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_client_roles(p_client_id INTEGER)
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
      'created_at', r.created_at,
      'updated_at', r.updated_at,
      'permissions', COALESCE(
        (SELECT json_agg(p.code)
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = r.id),
        '[]'::json
      )
    )
    ORDER BY r.is_system_role DESC, r.name ASC
  ) INTO roles_json
  FROM roles r
  WHERE r.client_id = p_client_id;

  RETURN COALESCE(roles_json, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
