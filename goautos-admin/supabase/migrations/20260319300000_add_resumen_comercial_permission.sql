-- =============================================
-- Add permission for Resumen Comercial widget
-- Admin roles get it automatically (they get ALL permissions on creation).
-- Vendedor does NOT get it (not in their explicit list).
-- For existing clients: grant to roles that already have dashboard.comercial.ventas_totales
-- (i.e. roles that already have access to commercial dashboard widgets = admins).
-- =============================================

-- Insert the permission
INSERT INTO permissions (code, name, description, category)
VALUES ('dashboard.comercial.resumen_comercial', 'Resumen Comercial', 'Ver Resumen Comercial en dashboard', 'dashboard')
ON CONFLICT (code) DO NOTHING;

-- Grant to existing roles that already have dashboard commercial permissions
-- (this effectively targets admin roles without hardcoding role names)
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p_new.id
FROM role_permissions rp
JOIN permissions p_existing ON p_existing.id = rp.permission_id
CROSS JOIN permissions p_new
WHERE p_existing.code = 'dashboard.comercial.ventas_totales'
  AND p_new.code = 'dashboard.comercial.resumen_comercial'
ON CONFLICT DO NOTHING;
