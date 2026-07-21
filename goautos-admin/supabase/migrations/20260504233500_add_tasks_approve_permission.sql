-- =============================================
-- PERMISO tasks.approve (separado de tasks.manage)
-- =============================================
-- tasks.manage controla gestion general de tareas (crear, listar, editar,
-- asignar). Lo conservan los vendedores para poder trabajar.
--
-- tasks.approve es nuevo y controla SOLO la capacidad de:
--   - Aprobar tareas en pending_approval (mover a completed)
--   - Mover tareas directamente a completed o cancelled cuando el toggle
--     tasks_require_approval del cliente esta activo.
--
-- Sin tasks.approve, un usuario solo puede mover tareas entre los estados
-- pending / in_progress / pending_approval.
-- =============================================

INSERT INTO permissions (code, name, category, description) VALUES
  ('tasks.approve', 'Aprobar Tareas', 'Tareas',
   'Permite aprobar tareas en pending_approval y cerrar/cancelar tareas cuando el toggle de aprobacion esta activo. Sin este permiso, el usuario solo puede mover tareas entre pending, in_progress y pending_approval.')
ON CONFLICT (code) DO NOTHING;

-- Asignar tasks.approve al rol Administrador (150) de Mallorca Autos (client 32),
-- que es quien activo el toggle. Otros clientes que activen el toggle deberan
-- asignar este permiso a sus roles administrativos manualmente.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 150, p.id
FROM permissions p
WHERE p.code = 'tasks.approve'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = 150 AND rp.permission_id = p.id
  );
