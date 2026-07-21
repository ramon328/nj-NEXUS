-- =============================================
-- Permisos granulares del Dashboard
-- 4 permisos de pestaña + 8 permisos de widgets comerciales
-- =============================================

INSERT INTO permissions (code, name, description, category) VALUES
  -- Pestañas del dashboard
  ('dashboard.tab.comercial', 'Pestaña Comercial', 'Acceso a la pestaña Comercial del dashboard', 'dashboard'),
  ('dashboard.tab.inventario', 'Pestaña Inventario', 'Acceso a la pestaña Inventario del dashboard', 'dashboard'),
  ('dashboard.tab.web', 'Pestaña Web', 'Acceso a la pestaña Web del dashboard', 'dashboard'),
  ('dashboard.tab.vendedores', 'Pestaña Vendedores', 'Acceso a la pestaña Vendedores del dashboard', 'dashboard'),

  -- Widgets de la pestaña Comercial
  ('dashboard.comercial.ventas_totales', 'Ventas Totales', 'Ver KPI de ventas totales en el dashboard', 'dashboard'),
  ('dashboard.comercial.gastos_totales', 'Gastos Totales', 'Ver KPI de gastos totales en el dashboard', 'dashboard'),
  ('dashboard.comercial.margen_bruto', 'Margen Bruto', 'Ver KPI de margen bruto en el dashboard', 'dashboard'),
  ('dashboard.comercial.valor_inventario', 'Valor Inventario', 'Ver KPI de valor del inventario en el dashboard', 'dashboard'),
  ('dashboard.comercial.rendimiento', 'Rendimiento del Negocio', 'Ver gráfico de rendimiento del negocio', 'dashboard'),
  ('dashboard.comercial.alertas', 'Alertas Inteligentes', 'Ver alertas inteligentes del dashboard', 'dashboard'),
  ('dashboard.comercial.resumen_ventas', 'Resumen de Ventas', 'Ver tabla resumen de ventas', 'dashboard'),
  ('dashboard.comercial.resumen_costos', 'Resumen de Costos', 'Ver tabla resumen de costos', 'dashboard')
ON CONFLICT (code) DO NOTHING;

-- Asignar los nuevos permisos al rol "Administrador" de cada cliente
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrador'
  AND p.code LIKE 'dashboard.%'
  AND p.code NOT IN ('dashboard.view', 'dashboard.view_full')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );
