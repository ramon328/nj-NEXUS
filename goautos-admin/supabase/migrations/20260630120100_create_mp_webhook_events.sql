-- Tabla mp_webhook_events: bitácora y deduplicación de webhooks de MercadoPago.
--
-- OBJETIVO: registrar TODA notificación entrante ANTES de procesarla, para:
--   1) Auditoría: ver qué manda MP realmente (headers/body crudos).
--   2) Validación de firma en modo LOG-ONLY: guardar si la firma x-signature calculó
--      válida (signature_valid) sin rechazar todavía, hasta confirmar el formato real.
--   3) Idempotencia/dedup a nivel de notificación por (topic, resource_id).
--
-- Additiva y no-rompedora: tabla nueva vacía; no toca datos ni accesos.

CREATE TABLE IF NOT EXISTS public.mp_webhook_events (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at        timestamptz NOT NULL DEFAULT now(),
  topic             text,          -- body.type o body.action (ej subscription_preapproval, payment.created)
  resource_id       text,          -- body.data.id (id del recurso en MP)
  signature_checked boolean NOT NULL DEFAULT false,  -- ¿se intentó validar la firma?
  signature_valid   boolean,       -- resultado del HMAC (null = no chequeado)
  request_id        text,          -- header x-request-id (parte del manifest de firma)
  raw_headers       jsonb,         -- headers crudos de la request
  raw_body          jsonb,         -- body crudo de la notificación
  processed         boolean NOT NULL DEFAULT false,   -- ¿se procesó el evento?
  processed_at      timestamptz,
  error             text           -- mensaje de error si el procesamiento falló
);

COMMENT ON TABLE public.mp_webhook_events IS
  'Bitácora de webhooks de MercadoPago (auditoría + firma log-only + dedup). Escrita por mp-webhook-subscription con service_role.';

CREATE INDEX IF NOT EXISTS idx_mp_webhook_events_resource
  ON public.mp_webhook_events (topic, resource_id);
CREATE INDEX IF NOT EXISTS idx_mp_webhook_events_created
  ON public.mp_webhook_events (created_at DESC);

-- RLS: la edge function escribe con service_role (bypass). Solo superadmin lee.
ALTER TABLE public.mp_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mp_webhook_events_select_superadmin ON public.mp_webhook_events;
CREATE POLICY mp_webhook_events_select_superadmin ON public.mp_webhook_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = auth.uid() AND u.rol = 'superadmin')
  );
