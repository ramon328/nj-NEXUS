-- T2: modo "pool" de leads + claim/release seguro (RPC SECURITY DEFINER)
--
-- Semántica resultante (3 modos, sin romper los 2 existentes):
--   sellers_see_all_leads=true                      -> el vendedor ve TODO (= hoy)
--   sellers_see_all_leads=false + can_claim=false   -> solo los suyos (= Miami 283 hoy)
--   sellers_see_all_leads=false + can_claim=true    -> POOL: ve sin-asignar + los suyos y puede "agarrar"
--
-- SEGURIDAD: leads NO tiene RLS; un UPDATE crudo desde el cliente permitiría robar
-- leads ajenos o de otro tenant. Por eso claim/release van SOLO por estas RPC
-- SECURITY DEFINER, que validan actor/tenant y usan WHERE assigned_to IS NULL
-- (claim) / assigned_to = actor (release) para evitar carreras y robos.

-- 1. Toggle por marca (aditivo, default false = sin cambio para clientes existentes)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS sellers_can_claim_leads boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clients.sellers_can_claim_leads IS
  'Solo aplica cuando sellers_see_all_leads=false. Si true, los vendedores ven además los leads sin asignar (pool) y pueden tomarlos vía claim_lead(). Default false.';

-- 2. claim_lead: el vendedor toma un lead del pool. status pending->assigned.
CREATE OR REPLACE FUNCTION public.claim_lead(p_lead_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
         status = CASE WHEN status = 'pending' THEN 'assigned' ELSE status END
   WHERE id = p_lead_id
     AND client_id = v_actor_client
     AND assigned_to IS NULL
  RETURNING status INTO v_new_status;

  IF NOT FOUND THEN RETURN false; END IF;

  -- Sync solicitud vinculada (evita desincronización leads<->vehicle_requests).
  IF v_new_status = 'assigned' THEN
    UPDATE public.vehicle_requests
       SET status = 'in_progress', updated_at = now()
     WHERE lead_id = p_lead_id AND status IS DISTINCT FROM 'in_progress';
  END IF;

  RETURN true;
END;
$$;

-- 3. release_lead: el vendedor suelta un lead SUYO (vuelve al pool). assigned->pending.
CREATE OR REPLACE FUNCTION public.release_lead(p_lead_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
     SET assigned_to = NULL,
         status = CASE WHEN status = 'assigned' THEN 'pending' ELSE status END
   WHERE id = p_lead_id
     AND client_id = v_actor_client
     AND assigned_to = v_actor_id
  RETURNING status INTO v_new_status;

  IF NOT FOUND THEN RETURN false; END IF;

  IF v_new_status = 'pending' THEN
    UPDATE public.vehicle_requests
       SET status = 'open', updated_at = now()
     WHERE lead_id = p_lead_id AND status IS DISTINCT FROM 'open';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_lead(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_lead(bigint) TO authenticated;
