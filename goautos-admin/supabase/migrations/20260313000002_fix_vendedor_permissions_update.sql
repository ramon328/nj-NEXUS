-- =============================================
-- Fix: Complete role management overhaul
--
-- Issues fixed:
-- 1. update_role_permissions treated ALL system roles as "Administrador",
--    forcing all permissions on save → Vendedor edits never persisted.
-- 2. user_belongs_to_client had no superadmin bypass → superadmin
--    impersonating a tenant could not edit that tenant's roles.
-- 3. create_role_with_permissions had same superadmin tenant issue.
-- =============================================

-- 1. Fix user_belongs_to_client: add superadmin bypass
CREATE OR REPLACE FUNCTION user_belongs_to_client(check_client_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  belongs BOOLEAN;
  user_role TEXT;
BEGIN
  -- Superadmin can access any client
  SELECT rol INTO user_role FROM users WHERE auth_id = auth.uid();
  IF user_role = 'superadmin' THEN
    RETURN true;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = auth.uid()
      AND client_id = check_client_id
  ) INTO belongs;

  RETURN COALESCE(belongs, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix update_role_permissions: only lock Administrador, allow editing all others
CREATE OR REPLACE FUNCTION update_role_permissions(
  p_role_id INTEGER,
  p_name TEXT,
  p_description TEXT,
  p_permission_codes TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_client_id INTEGER;
  v_is_system BOOLEAN;
  v_role_name TEXT;
  v_invalid_codes TEXT[];
  v_expected INTEGER;
  v_inserted INTEGER;
BEGIN
  -- Verify caller has permission
  IF NOT user_has_permission('roles.manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar roles';
  END IF;

  -- Get the role's client_id, system flag, and name
  SELECT client_id, is_system_role, name INTO v_client_id, v_is_system, v_role_name
  FROM roles WHERE id = p_role_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Rol no encontrado';
  END IF;
  IF NOT user_belongs_to_client(v_client_id) THEN
    RAISE EXCEPTION 'No tienes acceso a este rol';
  END IF;

  -- Only "Administrador" system role gets ALL permissions forced
  IF v_is_system AND v_role_name = 'Administrador' THEN
    UPDATE roles SET
      description = p_description,
      updated_at = NOW()
    WHERE id = p_role_id;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT p_role_id, p.id
    FROM permissions p
    WHERE NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = p_role_id AND rp.permission_id = p.id
    );

    RETURN true;
  END IF;

  -- For all other roles (including Vendedor system role): validate and update permissions
  SELECT ARRAY_AGG(code) INTO v_invalid_codes
  FROM UNNEST(p_permission_codes) AS code
  WHERE code NOT IN (SELECT p.code FROM permissions p);

  IF v_invalid_codes IS NOT NULL AND array_length(v_invalid_codes, 1) > 0 THEN
    RAISE EXCEPTION 'Códigos de permiso no reconocidos: %. Ejecuta la migración de permisos.', array_to_string(v_invalid_codes, ', ');
  END IF;

  -- System roles keep their name; custom roles can be renamed
  IF v_is_system THEN
    UPDATE roles SET
      description = p_description,
      updated_at = NOW()
    WHERE id = p_role_id;
  ELSE
    UPDATE roles SET
      name = p_name,
      description = p_description,
      updated_at = NOW()
    WHERE id = p_role_id;
  END IF;

  -- Count expected insertions
  SELECT COUNT(DISTINCT code) INTO v_expected
  FROM UNNEST(p_permission_codes) AS code;

  -- Delete existing permissions (safe — validation passed)
  DELETE FROM role_permissions WHERE role_id = p_role_id;

  -- Insert new permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT p_role_id, p.id
  FROM permissions p
  WHERE p.code = ANY(p_permission_codes);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted <> v_expected THEN
    RAISE EXCEPTION 'Se esperaban % permisos pero se insertaron %. Posible inconsistencia en la tabla permissions.', v_expected, v_inserted;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix create_role_with_permissions: ensure consistency with updated helpers
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
  v_invalid_codes TEXT[];
BEGIN
  -- Verify caller has permission
  IF NOT user_has_permission('roles.manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar roles';
  END IF;

  -- Verify caller belongs to client (superadmin bypassed via user_belongs_to_client)
  IF NOT user_belongs_to_client(p_client_id) THEN
    RAISE EXCEPTION 'No tienes acceso a este cliente';
  END IF;

  -- Validate ALL codes exist before creating
  SELECT ARRAY_AGG(code) INTO v_invalid_codes
  FROM UNNEST(p_permission_codes) AS code
  WHERE code NOT IN (SELECT p.code FROM permissions p);

  IF v_invalid_codes IS NOT NULL AND array_length(v_invalid_codes, 1) > 0 THEN
    RAISE EXCEPTION 'Códigos de permiso no reconocidos: %. Ejecuta la migración de permisos.', array_to_string(v_invalid_codes, ', ');
  END IF;

  -- Create the role
  INSERT INTO roles (client_id, name, description, is_system_role)
  VALUES (p_client_id, p_name, p_description, false)
  RETURNING id INTO v_role_id;

  -- Insert permissions (validation guarantees all codes exist)
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
