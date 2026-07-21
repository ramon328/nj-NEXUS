-- Catálogo de planes de suscripción (Opción A: checkout hospedado de MercadoPago).
--
-- Son 4 planes × 3 opciones de PRUEBA GRATIS (directo 0d / 30 días / 60 días) = 12 links.
-- Cobro MENSUAL en los 3 casos; la variante solo cambia los días gratis antes del 1er cobro.
-- Cada fila apunta a un preapproval_plan YA creado en la cuenta MercadoPago del negocio; su
-- checkout_url es el link hospedado estático (el cliente paga en MP, nosotros NO tocamos la tarjeta).
--
-- amount_clp = monto CON IVA (referencia para mostrar; el cobro real lo define el plan en MP y se
-- concilia por webhook). El enlace pago↔cliente se resuelve por email (link estático no lleva
-- external_reference); el tablero de conciliación es la red de seguridad.
--
-- Additiva y no-rompedora: tabla nueva + datos de catálogo (idempotente por ON CONFLICT).

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id                      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plan_key                text NOT NULL UNIQUE,          -- ej. 'alien_30d'
  plan_name               text NOT NULL,                 -- ALIEN / ALIEN DCTO / MIGRA / BROKIE
  trial_days              integer NOT NULL DEFAULT 0,    -- 0 / 30 / 60
  amount_clp              integer NOT NULL,              -- monto con IVA (display/referencia)
  mp_preapproval_plan_id  text NOT NULL,                 -- id del plan en MP (cuenta del negocio)
  checkout_url            text NOT NULL,                 -- link hospedado estático de MP
  active                  boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscription_plans IS
  'Catálogo de los 12 planes de suscripción (4 planes × 3 opciones de prueba gratis). checkout_url es el link hospedado de MercadoPago; el cobro real lo define el preapproval_plan en MP.';

CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans (active);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- El catálogo no es sensible (precios públicos). Lo puede leer cualquier usuario autenticado del admin.
DROP POLICY IF EXISTS subscription_plans_select_auth ON public.subscription_plans;
CREATE POLICY subscription_plans_select_auth ON public.subscription_plans
  FOR SELECT TO authenticated USING (true);

-- Semilla de los 12 planes reales. Idempotente: si cambia el monto/link, actualiza.
INSERT INTO public.subscription_plans (plan_key, plan_name, trial_days, amount_clp, mp_preapproval_plan_id, checkout_url) VALUES
  ('alien_0d',       'ALIEN',      0,  297500, 'bf6311b74e774e6ea9c7e11219df999e', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=bf6311b74e774e6ea9c7e11219df999e'),
  ('alien_30d',      'ALIEN',      30, 297500, '84c0f5167ff140e6b420d95b632cd7c5', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=84c0f5167ff140e6b420d95b632cd7c5'),
  ('alien_60d',      'ALIEN',      60, 297500, '977c3c21326e42428cc3383a2aa4b170', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=977c3c21326e42428cc3383a2aa4b170'),
  ('alien_dcto_0d',  'ALIEN DCTO', 0,  249900, 'ab720286a4e24714a5a19eaa872adabe', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=ab720286a4e24714a5a19eaa872adabe'),
  ('alien_dcto_30d', 'ALIEN DCTO', 30, 249900, '7fe262aeb9d14c9fb857ccf18d0445c4', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=7fe262aeb9d14c9fb857ccf18d0445c4'),
  ('alien_dcto_60d', 'ALIEN DCTO', 60, 249900, '606038e038fc4968832b11b8b5f6cb68', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=606038e038fc4968832b11b8b5f6cb68'),
  ('migra_0d',       'MIGRA',      0,  178500, 'ed009b945b9a4ab08d7e32de26a801b2', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=ed009b945b9a4ab08d7e32de26a801b2'),
  ('migra_30d',      'MIGRA',      30, 178500, 'c77b3a569cba48e18e6ba9fec0f42928', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=c77b3a569cba48e18e6ba9fec0f42928'),
  ('migra_60d',      'MIGRA',      60, 178500, '2419788b4aee4509970395fc72bcb3a6', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=2419788b4aee4509970395fc72bcb3a6'),
  ('brokie_0d',      'BROKIE',     0,  95200,  'df6542d56fc642f6b85ced777f71c30f', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=df6542d56fc642f6b85ced777f71c30f'),
  ('brokie_30d',     'BROKIE',     30, 95200,  '019a30967f5d4096bc6a20e39ce8ed26', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=019a30967f5d4096bc6a20e39ce8ed26'),
  ('brokie_60d',     'BROKIE',     60, 95200,  'ce3ebad2fc7f4e7c838b15ed80717c5b', 'https://www.mercadopago.cl/subscriptions/checkout?preapproval_plan_id=ce3ebad2fc7f4e7c838b15ed80717c5b')
ON CONFLICT (plan_key) DO UPDATE
  SET amount_clp = EXCLUDED.amount_clp,
      mp_preapproval_plan_id = EXCLUDED.mp_preapproval_plan_id,
      checkout_url = EXCLUDED.checkout_url,
      plan_name = EXCLUDED.plan_name,
      trial_days = EXCLUDED.trial_days;
