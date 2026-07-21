-- API keys por tenant para la API pública de inventario (tab Desarrolladores).
--
-- Seguridad: NUNCA se guarda la key en claro. Se guarda solo su SHA-256 (`key_hash`)
-- y un prefijo visible (`key_prefix`) para identificarla en la UI. El plaintext se
-- muestra UNA sola vez al generarla (el front la arma con crypto y guarda el hash).
-- La edge function `inventory-api` valida hasheando la key entrante y comparando.
--
-- Multi-tenant: scopeada por client_id con el patrón RLS estándar del repo.

CREATE TABLE IF NOT EXISTS public.tenant_api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    integer NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  label        text    NOT NULL DEFAULT 'API key',
  key_prefix   text    NOT NULL,            -- primeros chars visibles (ej 'gak_live_ab12cd')
  key_hash     text    NOT NULL,            -- SHA-256 hex de la key completa
  last_used_at timestamptz,
  created_by   uuid    DEFAULT auth.uid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz
);

COMMENT ON TABLE public.tenant_api_keys IS
  'API keys por automotora para la API pública de inventario. Solo se guarda el hash (SHA-256) de la key, nunca el plaintext.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_api_keys_hash ON public.tenant_api_keys (key_hash);
CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_client ON public.tenant_api_keys (client_id);

ALTER TABLE public.tenant_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_api_keys_select_own ON public.tenant_api_keys;
CREATE POLICY tenant_api_keys_select_own ON public.tenant_api_keys
  FOR SELECT USING (
    client_id IN (SELECT u.client_id FROM public.users u WHERE u.auth_id = auth.uid())
  );

DROP POLICY IF EXISTS tenant_api_keys_insert_own ON public.tenant_api_keys;
CREATE POLICY tenant_api_keys_insert_own ON public.tenant_api_keys
  FOR INSERT WITH CHECK (
    client_id IN (SELECT u.client_id FROM public.users u WHERE u.auth_id = auth.uid())
  );

DROP POLICY IF EXISTS tenant_api_keys_update_own ON public.tenant_api_keys;
CREATE POLICY tenant_api_keys_update_own ON public.tenant_api_keys
  FOR UPDATE USING (
    client_id IN (SELECT u.client_id FROM public.users u WHERE u.auth_id = auth.uid())
  );

DROP POLICY IF EXISTS tenant_api_keys_delete_own ON public.tenant_api_keys;
CREATE POLICY tenant_api_keys_delete_own ON public.tenant_api_keys
  FOR DELETE USING (
    client_id IN (SELECT u.client_id FROM public.users u WHERE u.auth_id = auth.uid())
  );
