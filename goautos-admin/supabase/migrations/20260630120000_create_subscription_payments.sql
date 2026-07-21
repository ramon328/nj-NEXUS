-- Tabla subscription_payments: registro de cobros de MercadoPago por suscripción.
--
-- CONTEXTO: la edge function `mp-webhook-subscription` YA inserta/consulta en esta
-- tabla (handlePaymentEvent), pero la tabla nunca existió en prod → cada registro de
-- pago fallaba en silencio (el webhook devuelve 200 igual). Esta migración la crea con
-- los nombres de columna EXACTOS que el webhook usa hoy, para que empiece a registrar.
--
-- Columnas que el webhook escribe (mp-webhook-subscription/index.ts:200-210):
--   subscription_id, payment_id (unique, dedup), amount, status, paid_at, failure_reason.
--
-- Esquema real de referencia de `subscriptions` (prod, ref miuiujntdjrjhhcysiba):
--   id bigint PK, created_at timestamptz, status text, client_id bigint, payer_email text,
--   amount double precision, next_payment_date date, reason text, preapproval_id text,
--   card_last_four text, currency text, plan_type text, trial_ends_at date, cancelled_at date.
--
-- Additiva y no-rompedora: crea una tabla nueva vacía; no toca datos ni accesos.

CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subscription_id bigint REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  payment_id      text NOT NULL,            -- id del pago en MercadoPago (dedup)
  amount          numeric,                  -- transaction_amount del pago
  status          text,                     -- approved / rejected / cancelled / ...
  paid_at         timestamptz,              -- date_approved cuando status=approved
  failure_reason  text,                     -- status_detail de MP
  mp_data         jsonb,                    -- payload crudo del pago (auditoría)
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscription_payments IS
  'Cobros de MercadoPago por suscripción. Escrita por la edge function mp-webhook-subscription. payment_id es el id del pago en MP y es único (idempotencia).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_payments_payment_id
  ON public.subscription_payments (payment_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription
  ON public.subscription_payments (subscription_id);

-- RLS: las escrituras las hace la edge function con service_role (bypass RLS).
-- Los usuarios normales NO leen billing; solo superadmin puede consultarla directo.
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_payments_select_superadmin ON public.subscription_payments;
CREATE POLICY subscription_payments_select_superadmin ON public.subscription_payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = auth.uid() AND u.rol = 'superadmin')
  );
