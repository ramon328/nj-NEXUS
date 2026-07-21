-- Reconciliación diaria de suscripciones con MercadoPago (edge function
-- reconcile-subscriptions). Crea la tabla de log y el cron.
--
-- El cron parte en MODO REPORTE ({"mode":"report"}): la función calcula el
-- diff contra MP y lo deja en reconciliation_runs SIN escribir cambios.
-- Para activar enforcement NO hay que deployar: se actualiza el body del
-- job a {"mode":"enforce"} (cron.alter_job / re-schedule).
--
-- Auth del cron: secreto ALEATORIO generado dentro de la base (Vault, secret
-- 'reconcile_subscriptions_secret'). El cron lo manda en x-reconcile-secret y
-- la edge function lo valida consultando el RPC restringido de abajo. El
-- secreto jamás sale de la base ni queda en el repo. Si no existe, la función
-- responde 401 y no pasa nada.

-- 0) Secreto en Vault (idempotente, generado con gen_random_bytes).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_vault') THEN
    IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'reconcile_subscriptions_secret') THEN
      PERFORM vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'reconcile_subscriptions_secret');
    END IF;
  END IF;
END $$;

-- RPC para que la edge function (service_role) lea el secreto esperado.
-- SECURITY DEFINER (owner postgres puede leer vault); nadie más puede ejecutarlo.
CREATE OR REPLACE FUNCTION public.get_reconcile_secret()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT decrypted_secret FROM vault.decrypted_secrets
  WHERE name = 'reconcile_subscriptions_secret'
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_reconcile_secret() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_reconcile_secret() FROM anon;
REVOKE ALL ON FUNCTION public.get_reconcile_secret() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_reconcile_secret() TO service_role;

-- 1) Log de corridas (auditoría del diff y de lo aplicado).
CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  details jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Solo service_role (la edge function) escribe/lee; sin policies para el resto.
ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;

-- 2) Cron diario 11:00 UTC (~07:00-08:00 Chile). Guardado por extensiones,
-- mismo patrón que process-scheduled-instagram.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reconcile-subscriptions-daily') THEN
      PERFORM cron.unschedule('reconcile-subscriptions-daily');
    END IF;

    PERFORM cron.schedule(
      'reconcile-subscriptions-daily',
      '0 11 * * *',
      $cron$
      SELECT net.http_post(
        url := 'https://miuiujntdjrjhhcysiba.supabase.co/functions/v1/reconcile-subscriptions',
        body := '{"mode":"report"}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-reconcile-secret', COALESCE(
            (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'reconcile_subscriptions_secret' LIMIT 1),
            ''
          )
        ),
        timeout_milliseconds := 30000
      );
      $cron$
    );
  END IF;
END $$;
