-- T3 + T5: seguimiento de leads — aviso de "sin seguimiento" (nag) y liberación
-- automática por inactividad. Reglas configurables por marca (clients.lead_rules).
--
-- SEGURIDAD / "no romper nada":
-- - Todo DEFAULT OFF por marca: el job corre 1x/día pero es NO-OP hasta que una
--   marca lo active (cero flood, cero liberación masiva).
-- - Cutoff: cada marca guarda active_since al activar; el sweep solo procesa leads
--   creados desde entonces (decisión: cutoff desde el deploy/activación).
-- - "Sin seguimiento" se mide con last_seen_at (lo setea el DUEÑO al abrir el
--   detalle, vía touch_lead_seen) con fallback a created_at. leads no tiene updated_at.
-- - El sweep tiene EXCEPTION por-lead (un lead malo no aborta la corrida) y la
--   liberación usa guard (assigned_to = dueño esperado).

-- 1. Tracking en leads (aditivo, nullable)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_seen_at      timestamptz,
  ADD COLUMN IF NOT EXISTS notified_stale_at timestamptz;

COMMENT ON COLUMN public.leads.last_seen_at IS 'Última vez que el vendedor DUEÑO abrió/trabajó el lead (touch_lead_seen). Fallback created_at para "sin seguimiento".';
COMMENT ON COLUMN public.leads.notified_stale_at IS 'Última vez que se avisó por inactividad (dedup del nag y prerequisito para liberar).';

-- 2. Reglas por marca (todo OFF por defecto = sin cambio de comportamiento)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS lead_rules jsonb NOT NULL DEFAULT
    '{"nag_enabled": false, "nag_hours": 48, "release_enabled": false, "release_hours": 72, "active_since": null}'::jsonb;

COMMENT ON COLUMN public.clients.lead_rules IS
  'Reglas de seguimiento de leads. nag_enabled: avisar por leads sin seguimiento. release_enabled: soltar (assigned_to=null, status=pending) tras release_hours. active_since: cutoff (solo leads creados desde aquí). Default todo OFF.';

-- 3. touch_lead_seen: el dueño marca el lead como "visto/trabajado".
CREATE OR REPLACE FUNCTION public.touch_lead_seen(p_lead_id bigint)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_actor bigint;
BEGIN
  SELECT id INTO v_actor FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
  IF v_actor IS NULL THEN RETURN; END IF;
  -- Solo el dueño "ve" el lead; resetea el flag de nag (engagement fresco).
  UPDATE public.leads
     SET last_seen_at = now(), notified_stale_at = NULL
   WHERE id = p_lead_id AND assigned_to = v_actor;
END;
$$;
GRANT EXECUTE ON FUNCTION public.touch_lead_seen(bigint) TO authenticated;

-- 3b. Al tomar un lead del pool, contarlo como visto y limpiar el flag de nag.
--     (Re-CREATE de claim_lead de T2 agregando last_seen_at/notified_stale_at.)
CREATE OR REPLACE FUNCTION public.claim_lead(p_lead_id bigint)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_actor_id     bigint;
  v_actor_client bigint;
  v_can_claim    boolean;
  v_new_status   text;
BEGIN
  SELECT u.id, u.client_id INTO v_actor_id, v_actor_client
  FROM public.users u WHERE u.auth_id = auth.uid() LIMIT 1;
  IF v_actor_id IS NULL THEN RETURN false; END IF;

  SELECT c.sellers_can_claim_leads INTO v_can_claim
  FROM public.clients c WHERE c.id = v_actor_client;
  IF v_can_claim IS NOT TRUE THEN RETURN false; END IF;

  UPDATE public.leads
     SET assigned_to = v_actor_id,
         status = CASE WHEN status = 'pending' THEN 'assigned' ELSE status END,
         last_seen_at = now(),
         notified_stale_at = NULL
   WHERE id = p_lead_id
     AND client_id = v_actor_client
     AND assigned_to IS NULL
  RETURNING status INTO v_new_status;

  IF NOT FOUND THEN RETURN false; END IF;

  IF v_new_status = 'assigned' THEN
    UPDATE public.vehicle_requests
       SET status = 'in_progress', updated_at = now()
     WHERE lead_id = p_lead_id AND status IS DISTINCT FROM 'in_progress';
  END IF;

  RETURN true;
END;
$$;

-- 4. Sweep diario: avisa por leads sin seguimiento y libera los que siguen botados.
CREATE OR REPLACE FUNCTION public.run_lead_followup_sweep()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r           record;
  v_ref       timestamptz;
  v_age_h     numeric;
  v_do_nag    boolean;
  v_nagged    int := 0;
  v_released  int := 0;
  v_admin     int := 0;
BEGIN
  FOR r IN
    SELECT l.id, l.client_id, l.assigned_to, l.status, l.created_at,
           l.last_seen_at, l.notified_stale_at,
           COALESCE((c.lead_rules->>'nag_enabled')::boolean, false)     AS nag_enabled,
           COALESCE((c.lead_rules->>'release_enabled')::boolean, false) AS release_enabled,
           COALESCE((c.lead_rules->>'nag_hours')::int, 48)              AS nag_hours,
           COALESCE((c.lead_rules->>'release_hours')::int, 72)          AS release_hours,
           (c.lead_rules->>'active_since')                              AS active_since,
           u.auth_id                                                    AS owner_auth
    FROM public.leads l
    JOIN public.clients c ON c.id = l.client_id
    LEFT JOIN public.users u ON u.id = l.assigned_to
    WHERE l.customer_id IS NOT NULL
      AND l.status NOT IN ('completed', 'cancelled')
      AND (COALESCE((c.lead_rules->>'nag_enabled')::boolean, false)
           OR COALESCE((c.lead_rules->>'release_enabled')::boolean, false))
      AND (c.lead_rules->>'active_since' IS NULL
           OR l.created_at >= (c.lead_rules->>'active_since')::timestamptz)
  LOOP
    BEGIN
      -- release implica nag (hay que avisar antes de soltar)
      v_do_nag := r.nag_enabled OR r.release_enabled;
      v_ref    := COALESCE(r.last_seen_at, r.created_at);
      v_age_h  := EXTRACT(EPOCH FROM (now() - v_ref)) / 3600.0;

      IF r.assigned_to IS NOT NULL THEN
        -- LIBERAR si pasó release_hours y ya se avisó
        IF r.release_enabled AND v_age_h >= r.release_hours AND r.notified_stale_at IS NOT NULL THEN
          UPDATE public.leads
             SET assigned_to = NULL,
                 status = CASE WHEN status = 'assigned' THEN 'pending' ELSE status END,
                 notified_stale_at = NULL
           WHERE id = r.id AND assigned_to = r.assigned_to;
          UPDATE public.vehicle_requests
             SET status = 'open', updated_at = now()
           WHERE lead_id = r.id AND status IS DISTINCT FROM 'open';
          v_released := v_released + 1;

        -- NAG al dueño (una vez por episodio: solo si no se avisó desde la última actividad)
        ELSIF v_do_nag AND v_age_h >= r.nag_hours
              AND (r.notified_stale_at IS NULL OR r.notified_stale_at < v_ref) THEN
          PERFORM create_notification(
            r.client_id::int, 'stale_lead', 'Lead sin seguimiento',
            'Tienes un lead asignado sin actividad hace más de ' || r.nag_hours || ' horas.',
            'alert-triangle', '/leads',
            jsonb_build_object('lead_id', r.id::text),
            r.owner_auth, NULL, NULL);
          UPDATE public.leads SET notified_stale_at = now() WHERE id = r.id;
          v_nagged := v_nagged + 1;
        END IF;

      ELSE
        -- Sin asignar hace mucho → avisar a admin para que lo asigne
        IF v_do_nag AND v_age_h >= r.nag_hours
           AND (r.notified_stale_at IS NULL OR r.notified_stale_at < v_ref) THEN
          PERFORM create_notification(
            r.client_id::int, 'stale_lead', 'Lead sin asignar',
            'Hay un lead sin asignar hace más de ' || r.nag_hours || ' horas.',
            'alert-triangle', '/leads',
            jsonb_build_object('lead_id', r.id::text),
            NULL, 'admin', NULL);
          UPDATE public.leads SET notified_stale_at = now() WHERE id = r.id;
          v_admin := v_admin + 1;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Un lead problemático no debe abortar el barrido completo.
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object('nagged', v_nagged, 'released', v_released, 'admin_nagged', v_admin);
END;
$$;

-- 5. Cron diario (13:00 UTC ≈ 09:00 Chile). No-op mientras todas las marcas estén OFF.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'leads-followup-sweep-daily') THEN
    PERFORM cron.unschedule('leads-followup-sweep-daily');
  END IF;
END $$;

SELECT cron.schedule('leads-followup-sweep-daily', '0 13 * * *', $$SELECT public.run_lead_followup_sweep();$$);
