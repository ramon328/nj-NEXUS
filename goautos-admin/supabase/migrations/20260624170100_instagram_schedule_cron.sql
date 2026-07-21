-- Cron que dispara el procesador de publicaciones de Instagram programadas.
-- Cada 5 min llama a la edge function process-scheduled-instagram vía pg_net.
--
-- Mismo patrón que el trigger de chileautos-sync: URL desde el GUC
-- app.settings.supabase_url (con fallback hardcodeado) y service_role_key desde
-- el GUC app.settings.service_role_key. Como la function tiene verify_jwt=false,
-- funciona aunque el GUC del key esté vacío (el Bearer queda vacío pero igual entra).
--
-- Guardado por existencia de pg_cron + pg_net para no romper entornos sin esas
-- extensiones (igual que las otras migraciones del repo).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    -- Reprogramación idempotente.
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-instagram') THEN
      PERFORM cron.unschedule('process-scheduled-instagram');
    END IF;

    PERFORM cron.schedule(
      'process-scheduled-instagram',
      '*/5 * * * *',
      $cron$
      SELECT net.http_post(
        url := COALESCE(NULLIF(current_setting('app.settings.supabase_url', true), ''),
                        'https://miuiujntdjrjhhcysiba.supabase.co')
               || '/functions/v1/process-scheduled-instagram',
        body := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(NULLIF(current_setting('app.settings.service_role_key', true), ''), '')
        )
      );
      $cron$
    );
  END IF;
END $$;
