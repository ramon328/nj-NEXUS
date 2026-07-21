-- =============================================
-- ENFORZAR APROBACION DE TAREAS EN LA BASE DE DATOS
-- =============================================
-- Hasta ahora la regla "si tasks_require_approval esta activo y el usuario
-- no es admin, completar pasa a pending_approval" vivia solo en el frontend
-- (useTasks.ts:149). Eso permitia que cualquier UPDATE directo a la API de
-- Supabase (PostgREST con JWT del vendedor) saltara la regla y marcara
-- completed sin aprobacion.
--
-- Esta migracion mueve la regla a la DB con un BEFORE INSERT/UPDATE trigger
-- que reescribe el status a pending_approval cuando corresponde, replicando
-- exactamente la logica de hasPermission(TASKS_MANAGE) del frontend.
-- =============================================

-- 1) Funcion helper: replica hasPermission('tasks.manage') del frontend.
--    SECURITY DEFINER porque necesita leer users/roles ignorando RLS.
CREATE OR REPLACE FUNCTION public.user_can_manage_tasks(p_auth_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id bigint;
  v_rol varchar;
  v_legacy_role_id integer;
  v_has_custom_role boolean;
BEGIN
  -- Sin auth.uid() asumimos service_role/sistema -> permitir.
  -- (cron jobs, edge functions con service key, scripts internos)
  IF p_auth_id IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT id, rol, role_id
    INTO v_user_id, v_rol, v_legacy_role_id
  FROM users
  WHERE auth_id = p_auth_id
  LIMIT 1;

  -- Usuario no encontrado en tabla public.users -> sin permiso.
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Superadmin bypass.
  IF v_rol = 'superadmin' THEN
    RETURN TRUE;
  END IF;

  -- Tiene custom roles? (multi-role via user_roles o single via users.role_id)
  v_has_custom_role :=
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = v_user_id)
    OR v_legacy_role_id IS NOT NULL;

  -- Legacy admin sin custom roles -> bypass (igual que isAdmin del frontend).
  IF v_rol = 'admin' AND NOT v_has_custom_role THEN
    RETURN TRUE;
  END IF;

  -- Con custom roles: chequear si alguno de sus roles tiene tasks.manage.
  IF v_has_custom_role THEN
    RETURN EXISTS(
      SELECT 1
      FROM (
        SELECT role_id FROM user_roles WHERE user_id = v_user_id
        UNION
        SELECT v_legacy_role_id WHERE v_legacy_role_id IS NOT NULL
      ) ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code = 'tasks.manage'
    );
  END IF;

  -- Roles legacy sin custom role (seller, vendedor, marketing, etc.) no tienen tasks.manage.
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.user_can_manage_tasks(uuid) IS
  'Replica hasPermission(TASKS_MANAGE) del frontend. Usado por enforce_task_approval trigger.';

-- 2) Funcion trigger que reescribe status -> pending_approval cuando corresponde.
CREATE OR REPLACE FUNCTION public.enforce_task_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_require_approval boolean;
BEGIN
  -- Solo nos interesa cuando el status TRANSICIONA a 'completed'.
  -- (status final 'pending_approval' o cualquier otro: dejar pasar)
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  -- Si ya estaba en completed, no es una transicion -> dejar pasar.
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Cliente tiene el toggle activo?
  SELECT tasks_require_approval
    INTO v_require_approval
  FROM clients
  WHERE id = NEW.client_id;

  IF NOT COALESCE(v_require_approval, FALSE) THEN
    RETURN NEW;
  END IF;

  -- Toggle activo. Si el usuario NO puede manage tasks, reescribimos a pending_approval.
  IF NOT public.user_can_manage_tasks(auth.uid()) THEN
    NEW.status := 'pending_approval';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_task_approval() IS
  'Trigger que enforza pending_approval en tasks cuando el cliente tiene tasks_require_approval=true y el usuario no tiene permiso tasks.manage.';

-- 3) Aplicar trigger en tabla tasks.
DROP TRIGGER IF EXISTS trg_enforce_task_approval ON tasks;
CREATE TRIGGER trg_enforce_task_approval
  BEFORE INSERT OR UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_task_approval();
