-- =============================================
-- APROBACION DE TAREAS CONFIGURABLE POR AUTOMOTORA
-- Solicitado por Mallorca Autos.
-- Cuando tasks_require_approval esta activado, los usuarios
-- no-admin que marquen una tarea como completada caen en
-- pending_approval y un admin tiene que aprobar/rechazar.
-- =============================================

-- 1) Toggle por cliente
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tasks_require_approval BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN clients.tasks_require_approval IS
  'Cuando es true, las tareas completadas por usuarios no-admin pasan a pending_approval y requieren aprobacion explicita de un admin/superadmin.';

-- 2) Trazabilidad de aprobacion en tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN tasks.approved_by IS
  'ID del usuario admin que aprobo la transicion de pending_approval a completed.';
COMMENT ON COLUMN tasks.approved_at IS
  'Timestamp en que la tarea fue aprobada por un admin.';

CREATE INDEX IF NOT EXISTS idx_tasks_status_approval
  ON tasks(client_id, status)
  WHERE status = 'pending_approval';
