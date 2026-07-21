-- =============================================
-- Fix: Agregar permisos de inventario completos a TODOS los roles
-- Problema: Usuarios con roles (especialmente Vendedor) no pueden
-- crear/editar vehiculos porque solo tienen vehicles.view
-- =============================================

-- 1. Agregar permisos de inventario a TODOS los roles existentes
--    (vehicles.view, vehicles.create, vehicles.edit, vehicles.delete, appraiser.view)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.code IN (
  'vehicles.view',
  'vehicles.create',
  'vehicles.edit',
  'vehicles.delete',
  'appraiser.view'
)
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 2. Trigger: auto-crear roles por defecto al crear un nuevo cliente
--    (Administrador con todos los permisos, Vendedor con inventario completo)
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

  -- Crear rol Vendedor (sistema) con permisos de inventario completos
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
      'ai_assistant.view'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Eliminar trigger anterior si existe
DROP TRIGGER IF EXISTS trg_create_default_roles ON clients;

-- Crear trigger AFTER INSERT en la tabla clients
CREATE TRIGGER trg_create_default_roles
  AFTER INSERT ON clients
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_roles_for_client();
