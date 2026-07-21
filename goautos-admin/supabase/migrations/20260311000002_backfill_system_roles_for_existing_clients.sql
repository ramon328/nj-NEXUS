-- Backfill system roles for existing clients so tenant admins can see/edit them in Roles management.
-- Some older tenants were created before the create_default_roles_for_client trigger existed,
-- so they never got the "Administrador" and "Vendedor" system roles.

DO $$
DECLARE
  v_admin_role_id INTEGER;
  v_seller_role_id INTEGER;
BEGIN
  -- Ensure every client has an Administrador system role with ALL permissions
  INSERT INTO roles (client_id, name, description, is_system_role)
  SELECT c.id, 'Administrador', 'Acceso completo a todas las funcionalidades', true
  FROM clients c
  WHERE NOT EXISTS (
    SELECT 1 FROM roles r
    WHERE r.client_id = c.id AND r.name = 'Administrador'
  );

  -- Ensure every client has a Vendedor system role with seller permissions
  INSERT INTO roles (client_id, name, description, is_system_role)
  SELECT c.id, 'Vendedor', 'Acceso para vendedores con inventario completo', true
  FROM clients c
  WHERE NOT EXISTS (
    SELECT 1 FROM roles r
    WHERE r.client_id = c.id AND r.name = 'Vendedor'
  );

  -- Grant ALL permissions to each Administrador system role that doesn't have them yet
  FOR v_admin_role_id IN
    SELECT r.id
    FROM roles r
    WHERE r.name = 'Administrador'
      AND r.is_system_role = true
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, p.id
    FROM permissions p
    WHERE NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = v_admin_role_id AND rp.permission_id = p.id
    );
  END LOOP;

  -- Grant seller permissions to each Vendedor system role that doesn't have them yet
  FOR v_seller_role_id IN
    SELECT r.id
    FROM roles r
    WHERE r.name = 'Vendedor'
      AND r.is_system_role = true
  LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_seller_role_id, p.id
    FROM permissions p
    WHERE p.code IN (
      'dashboard.view',
      'documents.view',
      -- Inventario completo
      'vehicles.view',
      'vehicles.create',
      'vehicles.edit',
      'vehicles.delete',
      'appraiser.view',
      -- Otros permisos del vendedor
      'marketing.view',
      'leads.view',
      'clients.view',
      'ai_assistant.view',
      -- Tareas y Calendario básicos
      'tasks.view',
      'calendar.view'
    )
    AND NOT EXISTS (
      SELECT 1 FROM role_permissions rp
      WHERE rp.role_id = v_seller_role_id AND rp.permission_id = p.id
    );
  END LOOP;

  -- Ensure legacy users with rol='admin' / 'seller' / 'vendedor' have role_id set
  UPDATE users u
  SET role_id = r.id
  FROM roles r
  WHERE u.client_id = r.client_id
    AND r.name = 'Administrador'
    AND r.is_system_role = true
    AND u.rol = 'admin'
    AND (u.role_id IS NULL OR u.role_id <> r.id);

  UPDATE users u
  SET role_id = r.id
  FROM roles r
  WHERE u.client_id = r.client_id
    AND r.name = 'Vendedor'
    AND r.is_system_role = true
    AND u.rol IN ('seller', 'vendedor')
    AND (u.role_id IS NULL OR u.role_id <> r.id);
END $$;

