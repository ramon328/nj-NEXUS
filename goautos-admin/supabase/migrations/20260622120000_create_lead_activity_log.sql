-- T4: Historial de actividad de leads (lead_activity_log)
--
-- Captura eventos del lead desde un ÚNICO punto (trigger de DB) cubriendo TODAS
-- las rutas de entrada/mutación: forms web (anon), webhook ChileAutos
-- (service_role) y panel admin. v1 registra: created, assigned/reassigned/
-- unassigned, status_changed.
--
-- SEGURIDAD (no negociable):
-- - La función del trigger lleva EXCEPTION WHEN OTHERS THEN RETURN COALESCE(NEW,OLD):
--   si el logging falla, NUNCA aborta el INSERT/UPDATE del lead. Así no rompe la
--   creación de leads en ninguna ruta ni provoca 500/retry-loop en el webhook de
--   ChileAutos. (El trigger existente notify_new_lead NO tiene este handler.)
-- - Tabla nueva con RLS: SELECT scopeado por client_id (denormalizado, sin join a
--   leads que no tiene RLS). Sin policy de INSERT: solo escribe el trigger
--   (SECURITY DEFINER), nunca el cliente directamente.
-- - Sin backfill: el log arranca desde el deploy (cero operación masiva).

-- 1. Tabla
CREATE TABLE IF NOT EXISTS public.lead_activity_log (
  id            bigserial PRIMARY KEY,
  lead_id       bigint NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  client_id     bigint NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type    text   NOT NULL, -- 'created' | 'assigned' | 'reassigned' | 'unassigned' | 'status_changed'
  actor_user_id bigint REFERENCES public.users(id) ON DELETE SET NULL,
  source        text,            -- 'admin' | 'web' | 'chileautos' | 'system'
  metadata      jsonb  NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.lead_activity_log IS
  'Historial de actividad de cada lead (creado, asignado/reasignado, cambio de estado). Lo escribe SOLO el trigger trg_log_lead_activity. created_at = momento del evento.';

CREATE INDEX IF NOT EXISTS idx_lead_activity_log_lead ON public.lead_activity_log(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activity_log_client ON public.lead_activity_log(client_id);

-- 2. RLS: cada usuario ve el log de los leads de SU cliente. La visibilidad por
--    vendedor se hereda en la capa app (el historial solo se consulta al abrir el
--    detalle de un lead que el usuario ya puede ver).
ALTER TABLE public.lead_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lead_activity_log_select_own ON public.lead_activity_log;
CREATE POLICY lead_activity_log_select_own ON public.lead_activity_log
  FOR SELECT USING (
    client_id IN (SELECT u.client_id FROM public.users u WHERE u.auth_id = auth.uid())
  );

-- 3. Función del trigger
CREATE OR REPLACE FUNCTION public.log_lead_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor  bigint;
  v_source text;
  v_is_ca  boolean;
BEGIN
  -- Actor: usuario logueado (panel). En web (anon) y webhook (service_role) es NULL.
  SELECT u.id INTO v_actor FROM public.users u WHERE u.auth_id = auth.uid() LIMIT 1;

  -- Origen del lead: los de ChileAutos dejan marcas en search_params.
  v_is_ca := COALESCE(
    (COALESCE(NEW.search_params, OLD.search_params) ? 'chileautos_lead_id')
    OR (COALESCE(NEW.search_params, OLD.search_params) ? 'chileautos_source'),
    false
  );

  IF TG_OP = 'INSERT' THEN
    IF v_is_ca THEN v_source := 'chileautos';
    ELSIF v_actor IS NOT NULL THEN v_source := 'admin';
    ELSE v_source := 'web';
    END IF;

    INSERT INTO public.lead_activity_log (lead_id, client_id, event_type, actor_user_id, source, metadata)
    VALUES (NEW.id, NEW.client_id, 'created', v_actor, v_source,
            jsonb_build_object('status', NEW.status, 'assigned_to', NEW.assigned_to, 'type', NEW.type));

    -- Si nace ya asignado (createLead asigna al creador), dejar también el evento.
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.lead_activity_log (lead_id, client_id, event_type, actor_user_id, source, metadata)
      VALUES (NEW.id, NEW.client_id, 'assigned', v_actor, v_source,
              jsonb_build_object('from', NULL, 'to', NEW.assigned_to));
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE: solo loguear cambios relevantes.
  v_source := COALESCE(
    CASE WHEN v_actor IS NOT NULL THEN 'admin' END,
    CASE WHEN v_is_ca THEN 'chileautos' END,
    'system'
  );

  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
    INSERT INTO public.lead_activity_log (lead_id, client_id, event_type, actor_user_id, source, metadata)
    VALUES (NEW.id, NEW.client_id,
            CASE WHEN NEW.assigned_to IS NULL THEN 'unassigned'
                 WHEN OLD.assigned_to IS NULL THEN 'assigned'
                 ELSE 'reassigned' END,
            v_actor, v_source,
            jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to));
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.lead_activity_log (lead_id, client_id, event_type, actor_user_id, source, metadata)
    VALUES (NEW.id, NEW.client_id, 'status_changed', v_actor, v_source,
            jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- El logging NUNCA puede romper la operación sobre el lead.
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. Trigger (DROP IF EXISTS para idempotencia / re-deploy)
DROP TRIGGER IF EXISTS trg_log_lead_activity ON public.leads;
CREATE TRIGGER trg_log_lead_activity
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.log_lead_activity();
