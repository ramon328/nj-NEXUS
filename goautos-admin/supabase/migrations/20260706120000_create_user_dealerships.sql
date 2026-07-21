-- =============================================
-- División de Sedes (Sucursales) por usuario — Slice 1 (base)
--
-- Asignación M2M usuario→sede, espejo 1:1 de user_roles (20260403200000):
-- misma forma de tabla, mismas policies RLS y misma RPC "set_*" que reemplaza
-- todas las asignaciones de un usuario.
--
-- SEMÁNTICA (clave):
--   - SIN filas en user_dealerships para un usuario  = SIN restricción de sede
--     (ve todos los datos del cliente, comportamiento idéntico al actual).
--   - Un usuario está RESTRINGIDO a sus sedes si, y solo si:
--       (tiene >=1 fila en user_dealerships)  Y  (su rol NO tiene 'dealerships.view_all').
--     En ese caso solo ve los datos de sus sedes asignadas.
--   - Un usuario con sedes asignadas PERO cuyo rol tiene 'dealerships.view_all'
--     (Administrador, Gerente, etc.) NO queda restringido: la asignación es solo
--     su "sede base" (filtro preseleccionado en el selector), no un límite.
--   - Superadmin siempre ve todo (bypass en user_has_permission).
--
-- Esta migración es aditiva y retrocompatible: ningún usuario existente cambia de
-- comportamiento al aplicarla (todos empiezan sin filas => sin restricción).
--
-- Tipos verificados contra el schema real:
--   users.id       = INTEGER  (ver 20260403200000_add_multi_roles.sql)
--   dealerships.id = BIGINT   (ver 20250111000000_add_dealership_to_legal_info.sql)
-- =============================================

-- 1. Tabla de asignación usuario→sede (M2M, espejo de user_roles)
CREATE TABLE IF NOT EXISTS user_dealerships (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dealership_id BIGINT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dealership_id)
);

CREATE INDEX IF NOT EXISTS idx_user_dealerships_user_id ON user_dealerships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dealerships_dealership_id ON user_dealerships(dealership_id);

COMMENT ON TABLE user_dealerships IS
  'Asignación de usuarios a sedes (sucursales). Sin filas para un usuario = sin restricción de sede. Un usuario queda restringido a sus sedes solo si tiene filas aquí Y su rol NO tiene el permiso dealerships.view_all.';

-- Enable RLS
ALTER TABLE user_dealerships ENABLE ROW LEVEL SECURITY;

-- RLS espejo de user_roles (20260403200000):
-- RLS: cada usuario puede ver sus propias sedes
CREATE POLICY "Users can view own dealerships"
ON user_dealerships FOR SELECT
USING (
  EXISTS (SELECT 1 FROM users u WHERE u.id = user_dealerships.user_id AND u.auth_id = auth.uid())
);

-- RLS: los usuarios pueden ver las sedes de usuarios de su mismo client
CREATE POLICY "Users can view client user_dealerships"
ON user_dealerships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN users me ON me.auth_id = auth.uid()
    WHERE u.id = user_dealerships.user_id AND u.client_id = me.client_id
  )
);

-- RLS: quien puede gestionar el equipo puede asignar sedes (insert/update/delete).
-- NOTA: a diferencia de user_roles (que usa 'roles.manage'), la asignación de sedes
-- se gestiona desde la ficha de usuario (Equipo), por eso se gatea con 'team.manage'
-- ('Gestionar Equipo' — permiso existente, seed 20260117000000).
CREATE POLICY "Managers can manage user_dealerships"
ON user_dealerships FOR ALL
USING (user_has_permission('team.manage'))
WITH CHECK (user_has_permission('team.manage'));

-- 2. Nuevo permiso: "Ver todas las sedes"
--    Un usuario con este permiso ve datos de todas las sedes aunque tenga sedes
--    asignadas. Sin él, un usuario con sedes asignadas solo ve su(s) sede(s).
INSERT INTO permissions (code, name, description, category)
VALUES
  ('dealerships.view_all', 'Ver todas las sedes',
   'Ver datos de todas las sedes aunque el usuario tenga sedes asignadas. Sin este permiso, un usuario con sedes asignadas solo ve su(s) sede(s).',
   'administration')
ON CONFLICT (code) DO NOTHING;

-- 3. Backfill: otorgar 'dealerships.view_all' al rol de sistema que hoy ve todo
--    (Administrador). Superadmin NO necesita backfill: tiene bypass en
--    user_has_permission (users.rol = 'superadmin'), no es una fila en roles.
--    El resto de roles (Vendedor, roles custom tipo "Jefe de sede") NO lo recibe:
--    quedarán restringidos SOLO si además se les asignan sedes.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.is_system_role = true
  AND r.name = 'Administrador'
  AND p.code = 'dealerships.view_all'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- 4. RPC espejo de set_user_roles: reemplaza TODAS las sedes de un usuario.
--    Valida permiso de gestión de equipo, borra las actuales, inserta las nuevas.
CREATE OR REPLACE FUNCTION set_user_dealerships(p_user_id INTEGER, p_dealership_ids BIGINT[])
RETURNS VOID AS $$
BEGIN
  -- Verificar que el llamante puede gestionar el equipo
  IF NOT user_has_permission('team.manage') THEN
    RAISE EXCEPTION 'No tienes permiso para gestionar el equipo';
  END IF;

  -- Borrar las sedes actuales del usuario
  DELETE FROM user_dealerships WHERE user_id = p_user_id;

  -- Insertar las nuevas sedes
  INSERT INTO user_dealerships (user_id, dealership_id)
  SELECT p_user_id, unnest(p_dealership_ids)
  ON CONFLICT (user_id, dealership_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
