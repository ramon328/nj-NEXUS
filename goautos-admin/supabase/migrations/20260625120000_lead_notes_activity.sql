-- Registra los cambios de notas de un lead en lead_activity_log.
-- El trigger log_lead_activity() ya capturaba creación, (re)asignación y cambios
-- de estado, pero NO los cambios en `notes`. Agregamos el evento `notes_changed`
-- usando `IS DISTINCT FROM` (maneja NULL correctamente). Metadata vacía a
-- propósito: el historial solo muestra "Notas actualizadas" + quién y cuándo
-- (no guardamos el texto viejo/nuevo).
--
-- Recreamos la función completa (CREATE OR REPLACE) idéntica a la versión viva
-- en prod, agregando solo el bloque de notas en la rama UPDATE.

CREATE OR REPLACE FUNCTION public.log_lead_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor  bigint;
  v_source text;
  v_is_ca  boolean;
BEGIN
  SELECT u.id INTO v_actor FROM public.users u WHERE u.auth_id = auth.uid() LIMIT 1;

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

    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.lead_activity_log (lead_id, client_id, event_type, actor_user_id, source, metadata)
      VALUES (NEW.id, NEW.client_id, 'assigned', v_actor, v_source,
              jsonb_build_object('from', NULL, 'to', NEW.assigned_to));
    END IF;

    RETURN NEW;
  END IF;

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

  IF NEW.notes IS DISTINCT FROM OLD.notes THEN
    INSERT INTO public.lead_activity_log (lead_id, client_id, event_type, actor_user_id, source, metadata)
    VALUES (NEW.id, NEW.client_id, 'notes_changed', v_actor, v_source, '{}'::jsonb);
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$function$;
