-- Allow editing permissions for the "Vendedor" system role
-- Only "Administrador" should have locked (all) permissions
-- "Vendedor" keeps is_system_role=true so it can't be deleted, but permissions are editable

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
