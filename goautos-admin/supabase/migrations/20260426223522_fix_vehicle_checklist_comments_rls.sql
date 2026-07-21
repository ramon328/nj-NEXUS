-- Correccion de las policies RLS de vehicle_checklist_comments.
--
-- La migracion anterior (20260426222902_add_vehicle_checklist_comments.sql)
-- copio el patron del checklist original, que referenciaba columnas que
-- en realidad no existen / no son comparables:
--   - u.role NO existe; la columna es u.rol
--   - u.id::text = auth.uid()::text NO matchea: users.id es bigint y
--     auth.uid() es uuid; el join correcto es u.auth_id = auth.uid()
--
-- El bloque EXCEPTION WHEN OTHERS de esa migracion silencio los errores
-- al crear las policies, con lo cual la tabla quedo con RLS habilitada
-- pero sin policies (= ningun usuario podia leer ni escribir).
--
-- Esta migracion borra las policies fantasma (por si existen) y crea las
-- correctas con las columnas reales.

DROP POLICY IF EXISTS "vehicle_checklist_comments_select_policy" ON vehicle_checklist_comments;
DROP POLICY IF EXISTS "vehicle_checklist_comments_insert_policy" ON vehicle_checklist_comments;
DROP POLICY IF EXISTS "vehicle_checklist_comments_delete_policy" ON vehicle_checklist_comments;

CREATE POLICY "vehicle_checklist_comments_select_policy"
  ON vehicle_checklist_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM vehicle_checklist vc
      JOIN vehicles v ON v.id = vc.vehicle_id
      JOIN users u ON (u.client_id = v.client_id OR u.rol = 'superadmin')
      WHERE vc.id = vehicle_checklist_comments.vehicle_checklist_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_checklist_comments_insert_policy"
  ON vehicle_checklist_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM vehicle_checklist vc
      JOIN vehicles v ON v.id = vc.vehicle_id
      JOIN users u ON (u.client_id = v.client_id OR u.rol = 'superadmin')
      WHERE vc.id = vehicle_checklist_comments.vehicle_checklist_id
        AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "vehicle_checklist_comments_delete_policy"
  ON vehicle_checklist_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM vehicle_checklist vc
      JOIN vehicles v ON v.id = vc.vehicle_id
      JOIN users u ON u.auth_id = auth.uid()
      WHERE vc.id = vehicle_checklist_comments.vehicle_checklist_id
        AND (
          u.id = vehicle_checklist_comments.user_id
          OR (u.rol IN ('admin', 'superadmin') AND (u.client_id = v.client_id OR u.rol = 'superadmin'))
        )
    )
  );
