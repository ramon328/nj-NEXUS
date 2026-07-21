-- Idempotencia del aprovisionamiento pago→cuenta.
--
-- Problema que ataca (hallazgo crítico de la revisión): el webhook llama a
-- onboard-client de forma síncrona; si tarda >15s el webhook desiste pero la
-- función igual crea el tenant, y admin_client_id nunca se enlaza. Todo reintento
-- futuro muere en el 409 del chequeo de nombre → tenant PAGADO sin cuenta enlazada,
-- irrecuperable sin intervención manual. Además dos webhooks concurrentes podían
-- crear dos tenants (TOCTOU sin constraint real).
--
-- Solución: anclar la idempotencia en el preapproval_id de MercadoPago (no en el
-- nombre). onboard-client, al recibir un preapproval_id ya visto, devuelve el
-- clientId existente en vez de 409 → los reintentos se AUTO-SANAN (enlazan
-- admin_client_id) en vez de quedar atascados.
--
-- Additiva y no-rompedora: columna nueva + índices únicos parciales. subscriptions
-- está vacía en prod, así que el UNIQUE sobre preapproval_id no colisiona.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS crm_preapproval_id text;

COMMENT ON COLUMN public.clients.crm_preapproval_id IS
  'preapproval_id de MercadoPago que originó el alta automática. Clave de idempotencia: un mismo preapproval nunca crea dos tenants.';

-- Un preapproval solo puede haber creado UN tenant.
CREATE UNIQUE INDEX IF NOT EXISTS clients_crm_preapproval_id_key
  ON public.clients (crm_preapproval_id) WHERE crm_preapproval_id IS NOT NULL;

-- Una preapproval solo puede tener UNA fila de suscripción (soporta el upsert
-- idempotente del Step 8.5 y evita duplicados por reintentos).
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_preapproval_id_key
  ON public.subscriptions (preapproval_id) WHERE preapproval_id IS NOT NULL;
