-- =============================================
-- Fix: Validate permission codes in RPC before destructive DELETE
-- + Ensure all dashboard permissions exist in DB
-- + Ensure Administrador system roles have ALL permissions
-- =============================================

-- 1. Ensure ALL permission codes from the TypeScript enum exist in the DB
--    (covers cases where granular dashboard migration was not applied)
INSERT INTO permissions (code, name, description, category) VALUES
  -- Dashboard base
  ('dashboard.view', 'Ver Dashboard (Básico)', 'Acceso al panel principal con vista limitada', 'general'),
  ('dashboard.view_full', 'Ver Dashboard Completo', 'Acceso al panel principal con todas las métricas', 'general'),
  -- Dashboard tabs
  ('dashboard.tab.comercial', 'Pestaña Comercial', 'Acceso a la pestaña Comercial del dashboard', 'dashboard'),
  ('dashboard.tab.inventario', 'Pestaña Inventario', 'Acceso a la pestaña Inventario del dashboard', 'dashboard'),
  ('dashboard.tab.web', 'Pestaña Web', 'Acceso a la pestaña Web del dashboard', 'dashboard'),
  ('dashboard.tab.vendedores', 'Pestaña Vendedores', 'Acceso a la pestaña Vendedores del dashboard', 'dashboard'),
  -- Dashboard widgets
  ('dashboard.comercial.ventas_totales', 'Ventas Totales', 'Ver KPI de ventas totales', 'dashboard'),
  ('dashboard.comercial.gastos_totales', 'Gastos Totales', 'Ver KPI de gastos totales', 'dashboard'),
  ('dashboard.comercial.margen_bruto', 'Margen Bruto', 'Ver KPI de margen bruto', 'dashboard'),
  ('dashboard.comercial.valor_inventario', 'Valor Inventario', 'Ver KPI de valor del inventario', 'dashboard'),
  ('dashboard.comercial.rendimiento', 'Rendimiento del Negocio', 'Ver gráfico de rendimiento', 'dashboard'),
  ('dashboard.comercial.alertas', 'Alertas Inteligentes', 'Ver alertas inteligentes', 'dashboard'),
  ('dashboard.comercial.resumen_ventas', 'Resumen de Ventas', 'Ver tabla resumen de ventas', 'dashboard'),
  ('dashboard.comercial.resumen_costos', 'Resumen de Costos', 'Ver tabla resumen de costos', 'dashboard'),
  -- Other potentially missing
  ('chileautos.view', 'Ver ChileAutos', 'Acceso a integración de ChileAutos', 'marketing'),
  ('notifications.view', 'Ver Notificaciones', 'Acceso a notificaciones', 'notifications'),
  ('notifications.create', 'Crear Notificaciones', 'Crear notificaciones', 'notifications'),
  ('vehicle_requests.view', 'Ver Solicitudes', 'Acceso a solicitudes de vehículos', 'notifications'),
  ('vehicle_requests.create', 'Crear Solicitudes', 'Crear solicitudes de vehículos', 'notifications'),
  ('vehicle_requests.manage', 'Gestionar Solicitudes', 'Gestionar solicitudes de vehículos', 'notifications'),
  ('ai_assistant.view', 'Ver Asistente IA', 'Acceso al asistente de IA', 'general')
ON CONFLICT (code) DO NOTHING;

-- 2. Ensure Administrador system roles have ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.is_system_role = true
  AND r.name = 'Administrador'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 3. Replace update_role_permissions with validation
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
  v_invalid_codes TEXT[];
  v_expected INTEGER;
  v_inserted INTEGER;
BEGIN
  -- Verify caller has permission
  IF NOT user_has_permission('roles.manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar roles';
  END IF;

  -- Get the role's client_id and check system role
  SELECT client_id, is_system_role INTO v_client_id, v_is_system
  FROM roles WHERE id = p_role_id;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Rol no encontrado';
  END IF;
  IF NOT user_belongs_to_client(v_client_id) THEN
    RAISE EXCEPTION 'No tienes acceso a este rol';
  END IF;

  -- System roles (Administrador) always get ALL permissions
  IF v_is_system THEN
    -- Update metadata only (name stays the same for system roles)
    UPDATE roles SET
      description = p_description,
      updated_at = NOW()
    WHERE id = p_role_id;

    -- Ensure all permissions are assigned
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT p_role_id, p.id
    FROM permissions p
    WHERE NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = p_role_id AND rp.permission_id = p.id
    );

    RETURN true;
  END IF;

  -- For non-system roles: validate ALL codes exist BEFORE deleting
  SELECT ARRAY_AGG(code) INTO v_invalid_codes
  FROM UNNEST(p_permission_codes) AS code
  WHERE code NOT IN (SELECT p.code FROM permissions p);

  IF v_invalid_codes IS NOT NULL AND array_length(v_invalid_codes, 1) > 0 THEN
    RAISE EXCEPTION 'Códigos de permiso no reconocidos: %. Ejecuta la migración de permisos.', array_to_string(v_invalid_codes, ', ');
  END IF;

  -- Update role metadata
  UPDATE roles SET
    name = p_name,
    description = p_description,
    updated_at = NOW()
  WHERE id = p_role_id;

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

  -- Verify all permissions were inserted
  IF v_inserted <> v_expected THEN
    RAISE EXCEPTION 'Se esperaban % permisos pero se insertaron %. Posible inconsistencia en la tabla permissions.', v_expected, v_inserted;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Also fix create_role_with_permissions with same validation
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

  -- Verify caller belongs to client
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
