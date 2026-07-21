-- =============================================
-- Permisos granulares del DETALLE del vehículo:
--   - vehicles.view_purchase_price    → ver "Precio de compra" / "Precio acordado"
--   - vehicles.view_financial_summary → ver el bloque "Resumen financiero"
--
-- Antes ambas secciones se mostraban según 'sales.view'. Ahora cada una tiene su
-- propio permiso, para que un rol pueda entrar al vehículo sin ver esos datos
-- si no los tiene marcados.
--
-- Backfill: para no cambiar lo que hoy ven los roles existentes, se otorgan ambos
-- permisos a todo rol que actualmente tenga 'sales.view' (que era el gate previo).
-- El rol "Administrador" los recibe igual porque siempre se le asignan TODOS los
-- permisos. El "Vendedor" no tenía 'sales.view', así que sigue sin verlos.
-- =============================================

-- 1. Insertar los nuevos permisos
INSERT INTO permissions (code, name, description, category)
VALUES
  ('vehicles.view_purchase_price', 'Ver precio de compra (detalle vehiculo)', 'Ver el precio de compra / acordado en el detalle del vehiculo', 'inventory'),
  ('vehicles.view_financial_summary', 'Ver resumen financiero (detalle vehiculo)', 'Ver el bloque de resumen financiero en el detalle del vehiculo', 'inventory')
ON CONFLICT (code) DO NOTHING;

-- 2. Backfill: otorgar ambos permisos a todo rol que ya tenga 'sales.view'
--    (preserva exactamente la visibilidad previa)
INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p_new.id
FROM role_permissions rp
JOIN permissions p_existing ON p_existing.id = rp.permission_id
JOIN permissions p_new ON p_new.code IN ('vehicles.view_purchase_price', 'vehicles.view_financial_summary')
WHERE p_existing.code = 'sales.view'
ON CONFLICT DO NOTHING;
