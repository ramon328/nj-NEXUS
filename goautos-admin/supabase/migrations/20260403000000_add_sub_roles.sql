-- Migration: Add sub-roles support
-- Adds parent_role_id to roles table for hierarchical role organization.
-- Sub-roles inherit permissions from a parent role as a template (resolved at creation time).

-- 1. Add parent_role_id column
ALTER TABLE roles ADD COLUMN parent_role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL;

-- Depth=1 enforcement is handled in the create_role_with_permissions RPC
-- (PostgreSQL CHECK constraints cannot use subqueries)

-- 2. Update create_role_with_permissions to accept parent_role_id
CREATE OR REPLACE FUNCTION create_role_with_permissions(
  p_client_id INTEGER,
  p_name TEXT,
  p_description TEXT,
  p_permission_codes TEXT[],
  p_parent_role_id INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_role_id INTEGER;
  v_role JSON;
  v_invalid_codes TEXT[];
  v_parent_depth INTEGER;
BEGIN
  -- Verify caller has permission
  IF NOT user_has_permission('roles.manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar roles';
  END IF;

  -- Verify caller belongs to client
  IF NOT user_belongs_to_client(p_client_id) THEN
    RAISE EXCEPTION 'No tienes acceso a este cliente';
  END IF;

  -- Validate parent role if provided
  IF p_parent_role_id IS NOT NULL THEN
    -- Parent must exist and belong to same client
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_parent_role_id AND client_id = p_client_id) THEN
      RAISE EXCEPTION 'El rol base no existe o no pertenece a este cliente';
    END IF;
    -- Enforce max depth = 1 (parent cannot itself be a sub-role)
    IF EXISTS (SELECT 1 FROM roles WHERE id = p_parent_role_id AND parent_role_id IS NOT NULL) THEN
      RAISE EXCEPTION 'No se pueden crear sub-roles de sub-roles (máximo 1 nivel)';
    END IF;
  END IF;

  -- Validate ALL permission codes exist
  SELECT ARRAY_AGG(code) INTO v_invalid_codes
  FROM UNNEST(p_permission_codes) AS code
  WHERE code NOT IN (SELECT p.code FROM permissions p);

  IF v_invalid_codes IS NOT NULL AND array_length(v_invalid_codes, 1) > 0 THEN
    RAISE EXCEPTION 'Códigos de permiso no reconocidos: %. Ejecuta la migración de permisos.', array_to_string(v_invalid_codes, ', ');
  END IF;

  -- Create the role
  INSERT INTO roles (client_id, name, description, is_system_role, parent_role_id)
  VALUES (p_client_id, p_name, p_description, false, p_parent_role_id)
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
    'parent_role_id', r.parent_role_id,
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

-- 3. Update get_role_with_permissions to include parent_role_id
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
    'parent_role_id', r.parent_role_id,
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

-- 4. Update get_client_roles to include parent_role_id
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
      'parent_role_id', r.parent_role_id,
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
    ORDER BY r.parent_role_id NULLS FIRST, r.is_system_role DESC, r.name ASC
  ) INTO roles_json
  FROM roles r
  WHERE r.client_id = p_client_id;

  RETURN COALESCE(roles_json, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
