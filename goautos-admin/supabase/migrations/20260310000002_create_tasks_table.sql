-- ============================================================================
-- SISTEMA DE TAREAS
-- Tareas manuales y de checklist, asignables a usuarios o roles
-- ============================================================================

-- Tabla principal de tareas
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('checklist', 'manual')),
  vehicle_checklist_id INTEGER REFERENCES vehicle_checklist(id) ON DELETE SET NULL,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'general',
  assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_to_role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_role ON tasks(assigned_to_role_id);
CREATE INDEX IF NOT EXISTS idx_tasks_vehicle ON tasks(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_tasks_source ON tasks(source_type, vehicle_checklist_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Comentarios
COMMENT ON TABLE tasks IS 'Sistema de tareas: manuales y derivadas del checklist de vehículos';
COMMENT ON COLUMN tasks.source_type IS 'checklist = generada desde checklist de vehículo, manual = creada manualmente';
COMMENT ON COLUMN tasks.vehicle_checklist_id IS 'Referencia al item del checklist si source_type = checklist';
COMMENT ON COLUMN tasks.assigned_to_user_id IS 'Usuario específico asignado (opcional)';
COMMENT ON COLUMN tasks.assigned_to_role_id IS 'Rol asignado (opcional, todos los usuarios con ese rol ven la tarea)';

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- SELECT: usuarios pueden ver tareas de su cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
  CREATE POLICY "tasks_select_policy"
    ON tasks FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = auth.uid()
        AND (u.client_id = tasks.client_id OR u.rol = 'superadmin')
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating tasks_select_policy: %', SQLERRM;
END;
$$;

-- INSERT: usuarios pueden crear tareas para su cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
  CREATE POLICY "tasks_insert_policy"
    ON tasks FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = auth.uid()
        AND (u.client_id = tasks.client_id OR u.rol = 'superadmin')
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating tasks_insert_policy: %', SQLERRM;
END;
$$;

-- UPDATE: usuarios pueden actualizar tareas de su cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
  CREATE POLICY "tasks_update_policy"
    ON tasks FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = auth.uid()
        AND (u.client_id = tasks.client_id OR u.rol = 'superadmin')
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating tasks_update_policy: %', SQLERRM;
END;
$$;

-- DELETE: solo admin/superadmin
DO $$
BEGIN
  DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;
  CREATE POLICY "tasks_delete_policy"
    ON tasks FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM users u
        WHERE u.auth_id = auth.uid()
        AND u.rol IN ('admin', 'superadmin')
        AND (u.client_id = tasks.client_id OR u.rol = 'superadmin')
      )
    );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating tasks_delete_policy: %', SQLERRM;
END;
$$;

-- Grants
GRANT ALL ON tasks TO service_role;
