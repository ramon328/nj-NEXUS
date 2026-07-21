-- Add seller dashboard permission
INSERT INTO permissions (code, name, description, category)
VALUES
  ('dashboard.view_seller', 'Dashboard de Vendedor', 'Ver dashboard de rendimiento y comisiones del vendedor', 'dashboard')
ON CONFLICT (code) DO NOTHING;

-- Auto-assign this permission to all existing "Vendedor" system roles
-- so existing sellers don't lose their dashboard
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.is_system_role = true
  AND r.name = 'Vendedor'
  AND p.code = 'dashboard.view_seller'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
