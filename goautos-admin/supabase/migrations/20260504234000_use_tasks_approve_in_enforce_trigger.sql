-- =============================================
-- USAR tasks.approve EN EL TRIGGER (en vez de tasks.manage)
-- Y BLOQUEAR transiciones a 'cancelled' para usuarios sin permiso.
-- =============================================
-- Cambios:
--  1) Nueva funcion user_can_approve_tasks (basada en tasks.approve).
--  2) enforce_task_approval ahora protege completed Y cancelled:
--     - completed: reescribe a pending_approval (silencioso, UX fluida).
--     - cancelled: RAISE EXCEPTION (bloquea con error explicito).
--  3) Drop user_can_manage_tasks (ya no se usa para enforcement).
-- =============================================

CREATE OR REPLACE FUNCTION public.user_can_approve_tasks(p_auth_id uuid)
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
  -- Service role / sistema (sin JWT) -> permitir.
  IF p_auth_id IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT id, rol, role_id
    INTO v_user_id, v_rol, v_legacy_role_id
  FROM users
  WHERE auth_id = p_auth_id
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Superadmin bypass total.
  IF v_rol = 'superadmin' THEN
    RETURN TRUE;
  END IF;

  v_has_custom_role :=
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = v_user_id)
    OR v_legacy_role_id IS NOT NULL;

  -- Legacy admin sin custom roles: bypass.
  IF v_rol = 'admin' AND NOT v_has_custom_role THEN
    RETURN TRUE;
  END IF;

  -- Con custom roles: chequear si alguno tiene tasks.approve.
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
      WHERE p.code = 'tasks.approve'
    );
  END IF;

  -- Roles legacy sin custom (seller, vendedor, etc.) no pueden aprobar.
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.user_can_approve_tasks(uuid) IS
  'Replica hasPermission(TASKS_APPROVE) del frontend. Usado por enforce_task_approval trigger.';

CREATE OR REPLACE FUNCTION public.enforce_task_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_require_approval boolean;
BEGIN
  -- Solo nos interesa cuando el status NUEVO es 'completed' o 'cancelled'.
  IF NEW.status NOT IN ('completed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- Si ya estaba en ese mismo status, no es transicion -> dejar pasar.
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
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

  -- Toggle activo. Si el user puede aprobar, dejar pasar.
  IF public.user_can_approve_tasks(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- User sin permiso, toggle activo:
  --   completed -> reescribir a pending_approval (silencioso).
  --   cancelled -> bloquear con error.
  IF NEW.status = 'completed' THEN
    NEW.status := 'pending_approval';
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
    RETURN NEW;
  ELSIF NEW.status = 'cancelled' THEN
    RAISE EXCEPTION 'Solo los administradores pueden cancelar tareas cuando la aprobacion esta activa.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_task_approval() IS
  'Trigger que enforza pending_approval (para completed) y bloquea cancelled cuando el cliente tiene tasks_require_approval=true y el usuario no tiene permiso tasks.approve.';

-- La funcion vieja user_can_manage_tasks ya no se usa por nadie en DB.
-- La dropeamos para no dejar codigo muerto.
DROP FUNCTION IF EXISTS public.user_can_manage_tasks(uuid);
