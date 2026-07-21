-- Seed missing task permission codes into the permissions table
-- These exist in the TypeScript PermissionCode enum but were never inserted into the DB.
-- Without these rows, assigning task permissions to any role (e.g. Vendedor) via
-- update_role_permissions() will fail with "Códigos de permiso no reconocidos".

INSERT INTO permissions (code, name, description, category)
VALUES
  ('tasks.view',   'Ver Tareas',       'Permite ver la lista de tareas asignadas',       'Tareas'),
  ('tasks.create', 'Crear Tareas',     'Permite crear nuevas tareas y asignarlas',        'Tareas'),
  ('tasks.manage', 'Gestionar Tareas', 'Permite editar, eliminar y gestionar todas las tareas', 'Tareas')
ON CONFLICT (code) DO NOTHING;

-- Also grant tasks.view and calendar.view to every existing "Vendedor" system role
-- so sellers can see tasks and calendar out of the box (matches SELLER_DEFAULT_PERMISSIONS).
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.is_system_role = true
  AND r.name = 'Vendedor'
  AND p.code IN ('tasks.view', 'calendar.view')
ON CONFLICT DO NOTHING;
