-- Publicaciones de Instagram PROGRAMADAS.
--
-- El usuario arma la publicación (fotos ya procesadas a 4:5 y subidas al bucket,
-- + descripción) y elige una fecha/hora futura. La fila queda 'pending'. Un cron
-- (cada 5 min) invoca la edge function `process-scheduled-instagram`, que toma
-- las vencidas y publica reusando el mismo flujo que la publicación on-demand.
--
-- Multi-tenant: client_id scopea por automotora (mismo patrón de RLS que el
-- resto de tablas: client_id IN (SELECT u.client_id FROM users WHERE auth_id=auth.uid())).
-- El procesador corre con service_role (saltea RLS).

CREATE TABLE IF NOT EXISTS public.instagram_scheduled_posts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  vehicle_id        integer NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  image_urls        jsonb   NOT NULL DEFAULT '[]'::jsonb, -- URLs ya procesadas (4:5) en el bucket
  description       text    NOT NULL DEFAULT '',
  scheduled_at      timestamptz NOT NULL,
  status            text    NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','processing','published','failed','cancelled')),
  attempts          integer NOT NULL DEFAULT 0,
  error_message     text,
  instagram_post_id text,
  created_by        uuid DEFAULT auth.uid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz
);

COMMENT ON TABLE public.instagram_scheduled_posts IS
  'Cola de publicaciones de Instagram programadas. La escribe el panel (usuario autenticado) y la procesa la edge function process-scheduled-instagram vía cron.';

-- Índice clave del procesador: las pendientes vencidas, por fecha.
CREATE INDEX IF NOT EXISTS idx_ig_sched_due
  ON public.instagram_scheduled_posts (scheduled_at)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ig_sched_client
  ON public.instagram_scheduled_posts (client_id);
CREATE INDEX IF NOT EXISTS idx_ig_sched_vehicle
  ON public.instagram_scheduled_posts (vehicle_id);

-- RLS: cada usuario ve/crea/cancela las programadas de SU automotora.
ALTER TABLE public.instagram_scheduled_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ig_sched_select_own ON public.instagram_scheduled_posts;
CREATE POLICY ig_sched_select_own ON public.instagram_scheduled_posts
  FOR SELECT USING (
    client_id IN (SELECT u.client_id FROM public.users u WHERE u.auth_id = auth.uid())
  );

DROP POLICY IF EXISTS ig_sched_insert_own ON public.instagram_scheduled_posts;
CREATE POLICY ig_sched_insert_own ON public.instagram_scheduled_posts
  FOR INSERT WITH CHECK (
    client_id IN (SELECT u.client_id FROM public.users u WHERE u.auth_id = auth.uid())
  );

DROP POLICY IF EXISTS ig_sched_delete_own ON public.instagram_scheduled_posts;
CREATE POLICY ig_sched_delete_own ON public.instagram_scheduled_posts
  FOR DELETE USING (
    client_id IN (SELECT u.client_id FROM public.users u WHERE u.auth_id = auth.uid())
  );
