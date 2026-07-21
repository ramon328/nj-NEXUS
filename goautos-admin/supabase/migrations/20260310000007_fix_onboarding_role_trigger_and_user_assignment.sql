-- =============================================
-- Fix: Update the auto-create-roles trigger to include task/calendar permissions
-- and auto-assign the Administrador role_id to the onboarding admin user.
-- =============================================

-- 1. Update the trigger function to include tasks.view and calendar.view for Vendedor
CREATE OR REPLACE FUNCTION public.create_default_roles_for_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role_id INTEGER;
  v_seller_role_id INTEGER;
BEGIN
  -- Crear rol Administrador (sistema) con TODOS los permisos
  INSERT INTO roles (client_id, name, description, is_system_role)
  VALUES (NEW.id, 'Administrador', 'Acceso completo a todas las funcionalidades', true)
  ON CONFLICT (client_id, name) DO NOTHING
  RETURNING id INTO v_admin_role_id;

  IF v_admin_role_id IS NOT NULL THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, p.id
    FROM permissions p;
  END IF;

  -- Crear rol Vendedor (sistema) con permisos completos de vendedor
  INSERT INTO roles (client_id, name, description, is_system_role)
  VALUES (NEW.id, 'Vendedor', 'Acceso para vendedores con inventario completo', true)
  ON CONFLICT (client_id, name) DO NOTHING
  RETURNING id INTO v_seller_role_id;

  IF v_seller_role_id IS NOT NULL THEN
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
      -- Tareas y Calendario
      'tasks.view',
      'calendar.view'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Auto-assign Administrador role_id to admin users who don't have one
--    This covers onboarding users who were created with rol='admin' but no role_id
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.client_id = r.client_id
  AND r.name = 'Administrador'
  AND r.is_system_role = true
  AND u.rol = 'admin'
  AND u.role_id IS NULL;

-- 3. Auto-assign Vendedor role_id to seller users who don't have one
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.client_id = r.client_id
  AND r.name = 'Vendedor'
  AND r.is_system_role = true
  AND u.rol IN ('seller', 'vendedor')
  AND u.role_id IS NULL;
