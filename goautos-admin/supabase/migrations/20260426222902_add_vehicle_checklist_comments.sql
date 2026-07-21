-- =============================================
-- COMENTARIOS POR ITEM DEL CHECKLIST DE VEHÍCULOS
-- Solicitado por Mallorca Autos: dejar notas
-- libres en cada item del checklist con autor y fecha
-- =============================================

-- =============================================
-- PASO 1: Tabla
-- =============================================

CREATE TABLE IF NOT EXISTS vehicle_checklist_comments (
  id SERIAL PRIMARY KEY,
  vehicle_checklist_id INTEGER NOT NULL REFERENCES vehicle_checklist(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  comment TEXT NOT NULL CHECK (length(trim(comment)) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vchk_comments_checklist_id
  ON vehicle_checklist_comments(vehicle_checklist_id);
CREATE INDEX IF NOT EXISTS idx_vchk_comments_created_at
  ON vehicle_checklist_comments(vehicle_checklist_id, created_at DESC);

COMMENT ON TABLE vehicle_checklist_comments IS 'Comentarios libres por item del checklist de un vehículo';
COMMENT ON COLUMN vehicle_checklist_comments.vehicle_checklist_id IS 'Item del checklist al que pertenece el comentario';
COMMENT ON COLUMN vehicle_checklist_comments.user_id IS 'Usuario que escribió el comentario (nullable si el usuario fue eliminado)';
COMMENT ON COLUMN vehicle_checklist_comments.comment IS 'Texto del comentario';

-- =============================================
-- PASO 2: Row Level Security
-- =============================================

ALTER TABLE vehicle_checklist_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_checklist_comments FORCE ROW LEVEL SECURITY;

-- SELECT: usuarios pueden ver comentarios de items de checklist de vehículos de su cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "vehicle_checklist_comments_select_policy" ON vehicle_checklist_comments;

  CREATE POLICY "vehicle_checklist_comments_select_policy"
    ON vehicle_checklist_comments FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM vehicle_checklist vc
        JOIN vehicles v ON v.id = vc.vehicle_id
        JOIN users u ON (u.client_id = v.client_id OR u.role = 'superadmin')
        WHERE vc.id = vehicle_checklist_comments.vehicle_checklist_id
          AND u.id::text = auth.uid()::text
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating vehicle_checklist_comments_select_policy: %', SQLERRM;
END;
$$;

-- INSERT: usuarios autenticados pueden crear comentarios en items de su cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "vehicle_checklist_comments_insert_policy" ON vehicle_checklist_comments;

  CREATE POLICY "vehicle_checklist_comments_insert_policy"
    ON vehicle_checklist_comments FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM vehicle_checklist vc
        JOIN vehicles v ON v.id = vc.vehicle_id
        JOIN users u ON (u.client_id = v.client_id OR u.role = 'superadmin')
        WHERE vc.id = vehicle_checklist_comments.vehicle_checklist_id
          AND u.id::text = auth.uid()::text
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating vehicle_checklist_comments_insert_policy: %', SQLERRM;
END;
$$;

-- DELETE: el autor del comentario, o un admin/superadmin del mismo cliente
DO $$
BEGIN
  DROP POLICY IF EXISTS "vehicle_checklist_comments_delete_policy" ON vehicle_checklist_comments;

  CREATE POLICY "vehicle_checklist_comments_delete_policy"
    ON vehicle_checklist_comments FOR DELETE
    USING (
      EXISTS (
        SELECT 1
        FROM vehicle_checklist vc
        JOIN vehicles v ON v.id = vc.vehicle_id
        JOIN users u ON u.id::text = auth.uid()::text
        WHERE vc.id = vehicle_checklist_comments.vehicle_checklist_id
          AND (
            u.id = vehicle_checklist_comments.user_id
            OR (u.role IN ('admin', 'superadmin') AND (u.client_id = v.client_id OR u.role = 'superadmin'))
          )
      )
    );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating vehicle_checklist_comments_delete_policy: %', SQLERRM;
END;
$$;

-- Nota: deliberadamente NO se crea política UPDATE.
-- Los comentarios son inmutables (auditabilidad). Para corregir, se borra y se vuelve a escribir.

GRANT ALL ON vehicle_checklist_comments TO service_role;
GRANT USAGE, SELECT ON SEQUENCE vehicle_checklist_comments_id_seq TO service_role;
